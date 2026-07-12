#!/usr/bin/env python3
"""Validate chapter 4–14 compact journey data and editorial references."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = {
    "04": {"journey": "huanglou_1077_1079", "visits": 32, "works": 11},
    "05": {"journey": "wutai_1079", "visits": 18, "works": 9},
    "06": {"journey": "huangzhou_1080_1084", "visits": 29, "works": 12},
    "07": {"journey": "jianghuai_1084_1085", "visits": 29, "works": 12},
    "08": {"journey": "jinghua_1085_1089", "visits": 22, "works": 8},
    "09": {"journey": "study_circle_1086_1089", "visits": 24, "works": 8},
    "10": {"journey": "hangzhou_return_1089_1091", "visits": 30, "works": 10},
    "11": {"journey": "ying_yang_ding_1091_1094", "visits": 30, "works": 11},
    "12": {"journey": "huizhou_1094_1097", "visits": 36, "works": 12},
    "13": {"journey": "hainan_1097_1100", "visits": 35, "works": 14},
    "14": {"journey": "beigui_1100_1102", "visits": 43, "works": 14},
}


def main() -> int:
    metadata = json.loads(
        (ROOT / "data/sushi-journeys-chapters-04-14.json").read_text(encoding="utf-8")
    )
    metadata_ids = [item["journey_id"] for item in metadata]
    expected_ids = [item["journey"] for item in EXPECTED.values()]
    if metadata_ids != expected_ids:
        raise ValueError("chapter 4–14 metadata is missing, duplicated, or out of order")

    total_visits = 0
    total_works = 0
    for chapter, expected in EXPECTED.items():
        path = ROOT / f"data/sushi-journey-chapter-{chapter}.js"
        text = path.read_text(encoding="utf-8")

        visit_ids = set(re.findall(rf'"(ch{chapter}_\d{{2}})"', text))
        expected_visit_ids = {
            f"ch{chapter}_{index:02d}" for index in range(1, expected["visits"] + 1)
        }
        if visit_ids != expected_visit_ids:
            missing = sorted(expected_visit_ids - visit_ids)
            extra = sorted(visit_ids - expected_visit_ids)
            raise ValueError(f"{path}: visit id mismatch; missing={missing}, extra={extra}")

        work_ids = set(re.findall(rf'"(ch{chapter}_work_\d{{3}})"', text))
        expected_work_ids = {
            f"ch{chapter}_work_{index:03d}" for index in range(1, expected["works"] + 1)
        }
        if work_ids != expected_work_ids:
            missing = sorted(expected_work_ids - work_ids)
            extra = sorted(work_ids - expected_work_ids)
            raise ValueError(f"{path}: work id mismatch; missing={missing}, extra={extra}")

        work_visit_refs = re.findall(
            rf'"ch{chapter}_work_\d{{3}}","{re.escape(expected["journey"])}","(ch{chapter}_\d{{2}})"',
            text,
        )
        if len(work_visit_refs) != expected["works"]:
            raise ValueError(f"{path}: could not parse every work-to-visit reference")
        dangling = sorted(set(work_visit_refs) - visit_ids)
        if dangling:
            raise ValueError(f"{path}: works reference missing visits {dangling}")

        if "v.slice(1).map" not in text:
            raise ValueError(f"{path}: compact runtime segment generation is missing")

        total_visits += expected["visits"]
        total_works += expected["works"]

    expected_segments = total_visits - len(EXPECTED)
    print(
        f"validated {len(EXPECTED)} journeys, {total_visits} visits, "
        f"{expected_segments} segments, {total_works} works"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
