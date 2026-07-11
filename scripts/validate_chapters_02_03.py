#!/usr/bin/env python3
"""Validate the compact chapter 2/3 journey datasets at the editorial level.

The browser files generate GeoJSON at runtime, so this validator records the
expected counts and the referential rules that must remain true when editing.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

EXPECTED = {
    "data/sushi-journey-chapter-02.js": {"visits": 28, "works": 11, "prefix": "bianfa_"},
    "data/sushi-journey-chapter-03.js": {"visits": 34, "works": 18, "prefix": "maru_"},
}


def main() -> int:
    total_visits = 0
    total_works = 0
    for relative, expected in EXPECTED.items():
        text = (ROOT / relative).read_text(encoding="utf-8")
        visit_ids = re.findall(rf'"({expected["prefix"]}\d{{2}})"', text)
        work_ids = re.findall(rf'"({expected["prefix"]}work_\d{{3}})"', text)
        unique_visits = set(visit_ids)
        unique_works = set(work_ids)
        if len(unique_visits) != expected["visits"]:
            raise ValueError(f"{relative}: expected {expected['visits']} visits, found {len(unique_visits)}")
        if len(unique_works) != expected["works"]:
            raise ValueError(f"{relative}: expected {expected['works']} works, found {len(unique_works)}")
        for work_visit in re.findall(rf'"({expected["prefix"]}\d{{2}})"', text):
            if work_visit not in unique_visits:
                raise ValueError(f"{relative}: work references missing visit {work_visit}")
        total_visits += len(unique_visits)
        total_works += len(unique_works)

    print(f"validated 2 journeys, {total_visits} visits, {total_visits - 2} segments, {total_works} works")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
