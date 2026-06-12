#!/usr/bin/env python3
"""Build browser-loadable JS wrappers for knowledge-layer JSON files."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

WRAPPERS = [
    ("sushi-people.json", "sushi-people.js", "suShiPeople"),
    ("sushi-relations.json", "sushi-relations.js", "suShiRelations"),
    ("sushi-events.json", "sushi-events.js", "suShiEvents"),
    ("sushi-works.json", "sushi-works.js", "suShiWorks"),
    ("sushi-journeys.json", "sushi-journeys.js", "suShiJourneys"),
    ("sushi-journey-visits.geojson", "sushi-journey-visits.js", "suShiJourneyVisits"),
    ("sushi-journey-segments.geojson", "sushi-journey-segments.js", "suShiJourneySegments"),
    ("sushi-journey-works.json", "sushi-journey-works.js", "suShiJourneyWorks"),
]


def write_wrapper(source_name: str, target_name: str, global_name: str) -> None:
    data = json.loads((DATA / source_name).read_text(encoding="utf-8"))
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    (DATA / target_name).write_text(f"window.{global_name} = {payload};\n", encoding="utf-8")
    print(f"wrote {DATA / target_name}")


def main() -> int:
    for source_name, target_name, global_name in WRAPPERS:
        write_wrapper(source_name, target_name, global_name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
