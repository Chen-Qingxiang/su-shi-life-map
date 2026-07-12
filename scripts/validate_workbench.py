#!/usr/bin/env python3
"""Validate the chapter-aware digital humanities workbench wiring and seed schema."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def fail(message: str) -> None:
    raise AssertionError(message)


def read(path: str) -> str:
    target = ROOT / path
    if not target.exists():
        fail(f"missing required file: {path}")
    return target.read_text(encoding="utf-8")


def assert_order(text: str, names: list[str]) -> None:
    positions = []
    for name in names:
        position = text.find(name)
        if position < 0:
            fail(f"index.html does not load {name}")
        positions.append(position)
    if positions != sorted(positions):
        fail(f"incorrect module order: {' -> '.join(names)}")


def extract_journey_ids() -> set[str]:
    paths = [
        "data/sushi-journeys.js",
        "data/sushi-journeys-chapters-02-03.js",
        "data/sushi-journeys-chapters-04-14.js",
    ]
    ids: set[str] = set()
    pattern = re.compile(r'["\']journey_id["\']\s*:\s*["\']([^"\']+)["\']')
    for path in paths:
        ids.update(pattern.findall(read(path)))
    return ids


def validate_index() -> None:
    index = read("index.html")
    required_ids = [
        "chapterProgress", "historicalContextNote", "timelineShell", "timelineList",
        "detailBack", "detailCopy", "scopeSearch", "scopeFilter", "qualityFilter",
        "searchResults", "sidebarToggle",
    ]
    for element_id in required_ids:
        if f'id="{element_id}"' not in index:
            fail(f"index.html missing #{element_id}")

    assert_order(index, [
        "data/sushi-people.js",
        "data/sushi-knowledge.js",
        "data/sushi-local-work-texts.js",
        "src/knowledge.js",
        "src/map.js",
        "src/journey-context.js",
        "src/knowledge-model.js",
        "src/workbench-hooks.js",
        "src/wikisource-reader.js",
        "src/main.js",
        "src/workbench.js",
    ])

    for stylesheet in ["src/styles.css", "src/wikisource-reader.css", "src/workbench.css"]:
        if stylesheet not in index:
            fail(f"index.html missing stylesheet {stylesheet}")


def validate_knowledge_schema() -> None:
    knowledge = read("data/sushi-knowledge.js")
    journey_ids = extract_journey_ids()
    if len(journey_ids) != 14:
        fail(f"expected 14 journeys, found {len(journey_ids)}: {sorted(journey_ids)}")

    curated_block_match = re.search(
        r"curated_chapter_people\s*:\s*\{(?P<body>.*)\}\s*\n\s*\}\s*;",
        knowledge,
        re.DOTALL,
    )
    if not curated_block_match:
        fail("could not find curated_chapter_people block")

    curated_body = curated_block_match.group("body")
    curated_ids = set(re.findall(r"^\s{6}([a-zA-Z0-9_]+)\s*:\s*\[", curated_body, re.MULTILINE))
    missing = journey_ids - curated_ids
    extra = curated_ids - journey_ids
    if missing:
        fail(f"journeys missing curated people seed: {sorted(missing)}")
    if extra:
        fail(f"curated people contains unknown journeys: {sorted(extra)}")

    supplemental_block = knowledge.split("const people =", 1)[0]
    supplemental_ids = re.findall(r'person_id:\s*"([^"]+)"', supplemental_block)
    if len(supplemental_ids) != len(set(supplemental_ids)):
        fail("duplicate supplemental person_id in data/sushi-knowledge.js")

    for status in ["curated", "event_seed", "text_match", "derived", "local", "external", "search", "missing"]:
        if status not in knowledge:
            fail(f"knowledge schema missing status {status}")


def validate_local_texts() -> None:
    local_texts = read("data/sushi-local-work-texts.js")
    for title in ["前赤壁赋", "后赤壁赋", "定风波", "记承天寺夜游", "寒食雨二首"]:
        if title not in local_texts:
            fail(f"local text seed missing {title}")
    if 'text_verification = "local_verified"' not in local_texts:
        fail("local text module does not mark verified texts")
    if "window.suShiLocalWorkTextCount" not in local_texts:
        fail("local text module does not expose its text count")


def validate_workbench_modules() -> None:
    model = read("src/knowledge-model.js")
    workbench = read("src/workbench.js")
    hooks = read("src/workbench-hooks.js")
    for symbol in [
        "app.getJourneyContext", "app.renderJourneyPeopleBrowser", "app.renderJourneyPersonCard",
        "app.renderJourneyEventBrowser", "app.renderJourneyEventCard", "app.findJourneyEntity",
        "visitLinks", "personLinks", "eventGroups", "sourceRefs",
    ]:
        if symbol not in model:
            fail(f"knowledge model missing {symbol}")
    for symbol in [
        "renderTimeline", "updateHistoricalContext", "renderSearchResults", "applyDeepLink",
        "copyCurrentReference", "setupMobileDrawer", "setActiveTimelineVisit",
    ]:
        if symbol not in workbench:
            fail(f"workbench module missing {symbol}")
    if "app.mapContext = result" not in hooks:
        fail("workbench hooks do not expose map context")


def validate_workflow() -> None:
    workflow = read(".github/workflows/validate.yml")
    for command in ["python scripts/validate_workbench.py", "node --check"]:
        if command not in workflow:
            fail(f"workflow missing command: {command}")


def main() -> int:
    validate_index()
    validate_knowledge_schema()
    validate_local_texts()
    validate_workbench_modules()
    validate_workflow()
    print("validated digital humanities workbench: 14 chapters, explicit knowledge schema, timeline, search, provenance, deep links and CI wiring")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as error:
        print(f"validation failed: {error}", file=sys.stderr)
        raise SystemExit(1)
