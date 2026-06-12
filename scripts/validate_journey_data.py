#!/usr/bin/env python3
"""Validate chapter-level journey, visit, segment, and work datasets."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"


def load(name: str):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def main() -> int:
    journeys = load("sushi-journeys.json")
    visits = load("sushi-journey-visits.geojson")["features"]
    segments = load("sushi-journey-segments.geojson")["features"]
    works = load("sushi-journey-works.json")
    errors: list[str] = []

    journey_ids = {item.get("journey_id") for item in journeys}
    visit_ids = {item["properties"].get("visit_id") for item in visits}
    segment_ids = {item["properties"].get("segment_id") for item in segments}
    work_ids = {item.get("work_id") for item in works}

    for label, values, expected in [
        ("journey", journey_ids, len(journeys)),
        ("visit", visit_ids, len(visits)),
        ("segment", segment_ids, len(segments)),
        ("work", work_ids, len(works)),
    ]:
        if None in values:
            errors.append(f"{label}: missing ID")
        if len(values) != expected:
            errors.append(f"{label}: duplicate IDs")

    for feature in visits:
        props = feature["properties"]
        if props.get("journey_id") not in journey_ids:
            errors.append(f"visit {props.get('visit_id')}: unknown journey")
        if feature.get("geometry", {}).get("type") != "Point":
            errors.append(f"visit {props.get('visit_id')}: geometry must be Point")

    for feature in segments:
        props = feature["properties"]
        if props.get("journey_id") not in journey_ids:
            errors.append(f"segment {props.get('segment_id')}: unknown journey")
        for field in ("from_visit_id", "to_visit_id"):
            if props.get(field) not in visit_ids:
                errors.append(f"segment {props.get('segment_id')}: unknown {field}")

    for work in works:
        if work.get("journey_id") not in journey_ids:
            errors.append(f"work {work.get('work_id')}: unknown journey")
        if work.get("visit_id") not in visit_ids:
            errors.append(f"work {work.get('work_id')}: unknown visit")
        if not work.get("text"):
            errors.append(f"work {work.get('work_id')}: missing public-domain text")
        if not work.get("text_source_url"):
            errors.append(f"work {work.get('work_id')}: missing text source URL")
        if "Special:" in work.get("text_source_url", "") or "可以指" in work.get("text", "") or "人民法院" in work.get("text", ""):
            errors.append(f"work {work.get('work_id')}: suspicious source or non-poem text")

    if errors:
        print("Journey data validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"Validated {len(journeys)} journey, {len(visits)} visits, {len(segments)} segments, and {len(works)} works.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
