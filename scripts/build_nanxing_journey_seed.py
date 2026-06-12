#!/usr/bin/env python3
"""Build the first chapter-level journey dataset from the detailed chapter note.

The source note remains the editorial source for itinerary descriptions and the
76-work index. Coordinates are approximate modern reference points for reading.
"""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BOOK_ROOT = ROOT.parents[1]
DATA = ROOT / "data"
SOURCE_NOTE = BOOK_ROOT / "01 食蓼少年.md"


VISIT_SPECS = [
    ("nanxing_01_meishan_decision", [103.8485, 30.0754], "origin", "medium"),
    ("nanxing_02_minjiang_departure", [103.7900, 29.8500], "departure", "medium"),
    ("nanxing_03_lingyun_buddha", [103.7722, 29.5470], "landmark", "high"),
    ("nanxing_04_rongzhou_yibin", [104.6432, 28.7518], "stopover", "high"),
    ("nanxing_05_niukou", [105.0000, 28.8000], "observation", "low"),
    ("nanxing_06_luzhou_anleshan", [105.4427, 28.8718], "landmark", "medium"),
    ("nanxing_07_chuanjiang_mountains", [106.0000, 29.0500], "observation", "low"),
    ("nanxing_08_chuanjiang_snow", [106.3000, 29.3000], "observation", "low"),
    ("nanxing_09_zhongzhou_to_kuizhou", [108.0340, 30.2990], "historic_landscape", "medium"),
    ("nanxing_10_kuizhou_qutang", [109.4630, 31.0180], "danger", "high"),
    ("nanxing_11_yanyu", [109.5600, 31.0300], "danger", "medium"),
    ("nanxing_12_wushan_wuxia", [109.8790, 31.0740], "danger", "high"),
    ("nanxing_13_xintan", [110.9800, 30.8250], "forced_stop", "medium"),
    ("nanxing_14_exit_gorges", [111.1700, 30.7800], "transition", "medium"),
    ("nanxing_15_yiling", [111.2860, 30.6910], "stopover", "high"),
    ("nanxing_16_jiangling_arrival", [112.2397, 30.3352], "destination", "high"),
    ("nanxing_17_jingzhou_new_year", [112.2397, 30.3352], "residence", "high"),
    ("nanxing_18_jingzhou_departure", [112.2397, 30.3352], "departure", "high"),
    ("nanxing_19_xiangyang", [112.1440, 32.0420], "stopover", "high"),
    ("nanxing_20_tangzhou", [112.8380, 32.6870], "governance", "high"),
    ("nanxing_21_xuzhou", [113.8520, 34.0350], "observation", "high"),
    ("nanxing_22_ruzhou", [112.8440, 34.1670], "historic_landscape", "medium"),
    ("nanxing_23_weishi", [114.1930, 34.4120], "forced_stop", "high"),
    ("nanxing_24_bianjing", [114.3076, 34.7973], "destination", "high"),
]


VISIT_TYPE_LABELS = {
    "origin": "启程地",
    "departure": "启程",
    "landmark": "登临 / 地标",
    "stopover": "停靠",
    "observation": "途中观察",
    "historic_landscape": "历史景观",
    "danger": "险境",
    "forced_stop": "阻滞 / 停航",
    "transition": "地貌转折",
    "destination": "阶段终点",
    "residence": "停留",
    "governance": "地方治理观察",
}


def parse_markdown_table(lines: list[str], start_marker: str, end_marker: str) -> list[list[str]]:
    start = next(i for i, line in enumerate(lines) if start_marker in line)
    end = next(i for i, line in enumerate(lines[start + 1 :], start + 1) if end_marker in line)
    rows: list[list[str]] = []
    for line in lines[start:end]:
        if not line.startswith("|"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if not cells or cells[0] in {"阶段", "组"}:
            continue
        if all(not cell.replace("-", "").replace(":", "").strip() for cell in cells):
            continue
        rows.append(cells)
    return rows


def make_visit_features(route_rows: list[list[str]]) -> list[dict]:
    if len(route_rows) != len(VISIT_SPECS):
        raise ValueError(f"Expected {len(VISIT_SPECS)} route rows, found {len(route_rows)}")

    features = []
    for order, (row, spec) in enumerate(zip(route_rows, VISIT_SPECS), start=1):
        stage, time, mode, ancient_place, modern, event, reading = row
        visit_id, coordinates, visit_type, certainty = spec
        phase_id = "nanxing_water" if order <= 17 else "nanxing_land"
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "kind": "journey_visit",
                    "journey_id": "nanxing_1059_1060",
                    "phase_id": phase_id,
                    "visit_id": visit_id,
                    "order": order,
                    "stage": stage,
                    "time": time,
                    "travel_mode": mode,
                    "ancient_place": ancient_place,
                    "modern": modern,
                    "visit_type": visit_type,
                    "visit_type_label": VISIT_TYPE_LABELS[visit_type],
                    "event": event,
                    "reading": reading,
                    "certainty": certainty,
                    "source_note": "01 食蓼少年.md：九 南行 / 路线图",
                },
                "geometry": {"type": "Point", "coordinates": coordinates},
            }
        )
    return features


def make_segment_features(visits: list[dict]) -> list[dict]:
    features = []
    for index, (start, end) in enumerate(zip(visits, visits[1:]), start=1):
        start_props = start["properties"]
        end_props = end["properties"]
        phase_id = end_props["phase_id"]
        travel_mode = "水路" if phase_id == "nanxing_water" else "陆路"
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "kind": "journey_segment",
                    "journey_id": "nanxing_1059_1060",
                    "segment_id": f"nanxing_segment_{index:02d}",
                    "order": index,
                    "phase_id": phase_id,
                    "travel_mode": travel_mode,
                    "from_visit_id": start_props["visit_id"],
                    "to_visit_id": end_props["visit_id"],
                    "certainty": "low" if "low" in {start_props["certainty"], end_props["certainty"]} else "medium",
                    "note": "按章节行程节点顺序连线；用于阅读，不代表精确古代航道或驿路。",
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [start["geometry"]["coordinates"], end["geometry"]["coordinates"]],
                },
            }
        )
    return features


def normalize_title(value: str) -> str:
    return value.strip().removeprefix("《").removesuffix("》")


def choose_visit_id(location: str, title: str) -> str:
    text = f"{location} {title}"
    rules = [
        ("尉氏", "nanxing_23_weishi"),
        ("朱亥", "nanxing_24_bianjing"),
        ("汝州", "nanxing_22_ruzhou"),
        ("颍考叔", "nanxing_22_ruzhou"),
        ("许州", "nanxing_21_xuzhou"),
        ("唐州", "nanxing_20_tangzhou"),
        ("新渠诗", "nanxing_20_tangzhou"),
        ("襄阳", "nanxing_19_xiangyang"),
        ("隆中", "nanxing_19_xiangyang"),
        ("岘山", "nanxing_19_xiangyang"),
        ("万山", "nanxing_19_xiangyang"),
        ("汉水", "nanxing_19_xiangyang"),
        ("浰阳", "nanxing_19_xiangyang"),
        ("荆门", "nanxing_18_jingzhou_departure"),
        ("荆州", "nanxing_17_jingzhou_new_year"),
        ("息壤", "nanxing_17_jingzhou_new_year"),
        ("渚宫", "nanxing_17_jingzhou_new_year"),
        ("夷陵", "nanxing_15_yiling"),
        ("峡州", "nanxing_15_yiling"),
        ("三游洞", "nanxing_15_yiling"),
        ("出峡", "nanxing_14_exit_gorges"),
        ("黄牛", "nanxing_14_exit_gorges"),
        ("虾蟆", "nanxing_14_exit_gorges"),
        ("新滩", "nanxing_13_xintan"),
        ("归州", "nanxing_13_xintan"),
        ("昭君", "nanxing_13_xintan"),
        ("巫山", "nanxing_12_wushan_wuxia"),
        ("神女", "nanxing_12_wushan_wuxia"),
        ("巴东", "nanxing_12_wushan_wuxia"),
        ("入峡", "nanxing_10_kuizhou_qutang"),
        ("白帝", "nanxing_10_kuizhou_qutang"),
        ("八阵", "nanxing_09_zhongzhou_to_kuizhou"),
        ("诸葛盐井", "nanxing_09_zhongzhou_to_kuizhou"),
        ("屈原", "nanxing_09_zhongzhou_to_kuizhou"),
        ("望夫", "nanxing_09_zhongzhou_to_kuizhou"),
        ("竹枝", "nanxing_09_zhongzhou_to_kuizhou"),
        ("木枥", "nanxing_09_zhongzhou_to_kuizhou"),
        ("值雪", "nanxing_08_chuanjiang_snow"),
        ("江上看山", "nanxing_07_chuanjiang_mountains"),
        ("涪州", "nanxing_07_chuanjiang_mountains"),
        ("仙都观", "nanxing_07_chuanjiang_mountains"),
        ("安乐山", "nanxing_06_luzhou_anleshan"),
        ("渝州", "nanxing_06_luzhou_anleshan"),
        ("牛口", "nanxing_05_niukou"),
        ("戎州", "nanxing_04_rongzhou_yibin"),
        ("宜宾", "nanxing_04_rongzhou_yibin"),
        ("南井口", "nanxing_04_rongzhou_yibin"),
        ("犍为", "nanxing_03_lingyun_buddha"),
        ("嘉州", "nanxing_03_lingyun_buddha"),
        ("郭纶", "nanxing_03_lingyun_buddha"),
    ]
    for token, visit_id in rules:
        if token in text:
            return visit_id
    return "nanxing_18_jingzhou_departure" if "陆行" in text or "夜行" in text else "nanxing_07_chuanjiang_mountains"


def make_works(work_rows: list[list[str]]) -> list[dict]:
    works = []
    for row in work_rows:
        number, title, time, location, trigger = row
        title = normalize_title(title)
        order = int(re.sub(r"\D", "", number))
        visit_id = choose_visit_id(location, title)
        works.append(
            {
                "work_id": f"nanxing_work_{order:03d}",
                "title": title,
                "author_ids": ["su_shi"],
                "genre": "诗",
                "year": 1059 if "1059" in time else 1060,
                "time_text": time,
                "journey_id": "nanxing_1059_1060",
                "collection_id": "nanxing_ji",
                "visit_id": visit_id,
                "location_text": location,
                "summary": trigger,
                "source_note": "01 食蓼少年.md：苏轼南行诗作索引；地点与存佚仍需逐首核对。",
            }
        )
    return works


def write_json(name: str, data: object) -> None:
    (DATA / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {DATA / name}")


def main() -> int:
    lines = SOURCE_NOTE.read_text(encoding="utf-8").splitlines()
    route_rows = parse_markdown_table(lines, "| 阶段", "#### 苏轼南行诗作索引")
    work_rows = parse_markdown_table(lines, "|   组", "#### 补充理解")

    visits = make_visit_features(route_rows)
    segments = make_segment_features(visits)
    works = make_works(work_rows)
    journeys = [
        {
            "journey_id": "nanxing_1059_1060",
            "title": "嘉祐四年至五年南行",
            "short_title": "1059—1060 南行",
            "chapter": "01 食蓼少年",
            "year_start": 1059,
            "year_end": 1060,
            "summary": "三苏一家自眉州沿岷江、长江穿三峡至荆州，再由陆路经襄阳、唐州、许州、汝州、尉氏趋向汴京。",
            "phases": [
                {"phase_id": "nanxing_water", "title": "离蜀水路", "travel_mode": "水路", "color": "#2563eb"},
                {"phase_id": "nanxing_land", "title": "荆州北上", "travel_mode": "陆路", "color": "#9a5b32"},
            ],
            "source_note": "01 食蓼少年.md：九 南行",
        }
    ]

    write_json("sushi-journeys.json", journeys)
    write_json("sushi-journey-visits.geojson", {"type": "FeatureCollection", "features": visits})
    write_json("sushi-journey-segments.geojson", {"type": "FeatureCollection", "features": segments})
    write_json("sushi-journey-works.json", works)
    print(f"Built {len(visits)} itinerary stages, {len(segments)} segments, and {len(works)} works.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
