#!/usr/bin/env python3
"""Build major mountain-system outline lines from GMBA Inventory v2.

Usage:
    python3 scripts/build_gmba_mountain_systems.py /path/to/GMBA_Inventory_v2.0_standard_300.shp

Requires the pure-Python ``pyshp`` package (import name: ``shapefile``).
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

try:
    import shapefile
except ImportError as error:
    raise SystemExit("This script requires pyshp: python -m pip install pyshp") from error


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
BBOX = (72.0, 17.0, 136.0, 55.0)
EXCLUDED_TERMS = ("Basin", "Plateau", "Peninsula", "盆地", "高原", "半島")
NAME_ALIASES = {
    "天山山脈": "天山山脉",
    "长白山脈": "长白山脉",
    "Mongolian Altai": "蒙古阿尔泰山脉",
    "Gobi Altai": "戈壁阿尔泰山脉",
}


def intersects(bbox: list[float], extent: tuple[float, float, float, float]) -> bool:
    west, south, east, north = extent
    return not (bbox[2] < west or bbox[0] > east or bbox[3] < south or bbox[1] > north)


def perpendicular_distance(point: tuple[float, float], start: tuple[float, float], end: tuple[float, float]) -> float:
    if start == end:
        return math.dist(point, start)
    x, y = point
    x1, y1 = start
    x2, y2 = end
    return abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) / math.hypot(y2 - y1, x2 - x1)


def simplify(points: list[tuple[float, float]], tolerance: float = 0.025) -> list[list[float]]:
    if len(points) <= 2:
        return [[round(x, 4), round(y, 4)] for x, y in points]
    closed = points[0] == points[-1]
    work = points[:-1] if closed else points
    if len(work) <= 2:
        result = work
    else:
        max_distance = 0.0
        index = 0
        for cursor in range(1, len(work) - 1):
            distance = perpendicular_distance(work[cursor], work[0], work[-1])
            if distance > max_distance:
                index, max_distance = cursor, distance
        if max_distance > tolerance:
            left = simplify(work[: index + 1], tolerance)
            right = simplify(work[index:], tolerance)
            result = [tuple(point) for point in left[:-1] + right]
        else:
            result = [work[0], work[-1]]
    if closed and result[0] != result[-1]:
        result.append(result[0])
    return [[round(point[0], 4), round(point[1], 4)] for point in result]


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python3 scripts/build_gmba_mountain_systems.py /path/to/GMBA_Inventory_v2.0_standard_300.shp")

    reader = shapefile.Reader(sys.argv[1], encoding="utf-8")
    features = []
    labels = []

    for shape, record in zip(reader.iterShapes(), reader.iterRecords()):
        props = record.as_dict()
        name_zh = (props.get("Name_ZH") or "").strip()
        name_en = (props.get("Name_EN") or props.get("MapName") or "").strip()
        name_zh = NAME_ALIASES.get(name_zh or name_en, name_zh or name_en)
        if (
            not intersects(shape.bbox, BBOX)
            or "China" not in (props.get("Countries") or "")
            or props.get("Feature") != "Mountain range with well-recognized name"
            or any(term in f"{name_zh} {name_en}" for term in EXCLUDED_TERMS)
        ):
            continue

        starts = list(shape.parts) + [len(shape.points)]
        lines = []
        for start, end in zip(starts, starts[1:]):
            if end - start >= 3:
                line = simplify(shape.points[start:end])
                if len(line) >= 3:
                    lines.append(line)
        if not lines:
            continue

        label_lon = round((shape.bbox[0] + shape.bbox[2]) / 2, 4)
        label_lat = round((shape.bbox[1] + shape.bbox[3]) / 2, 4)
        shared = {
            "kind": "major_mountain_system",
            "mountain_id": props.get("GMBA_V2_ID"),
            "name_zh": name_zh or name_en,
            "name_en": name_en,
            "countries": props.get("Countries"),
            "area_sq_km": props.get("Area"),
            "elev_low_m": props.get("Elev_Low"),
            "elev_high_m": props.get("Elev_High"),
            "wikidata_url": props.get("WikiDataUR"),
            "source": "GMBA Mountain Inventory v2.0, 300 selection",
            "source_url": "https://www.earthenv.org/mountains",
            "accuracy_note": "此线表示 GMBA 山系范围的概括轮廓，不是唯一山脊轴线或精确地貌边界。",
        }
        features.append(
            {
                "type": "Feature",
                "properties": shared,
                "geometry": {"type": "MultiLineString", "coordinates": lines},
            }
        )
        labels.append(
            {
                "type": "Feature",
                "properties": shared,
                "geometry": {"type": "Point", "coordinates": [label_lon, label_lat]},
            }
        )

    collection = {
        "type": "FeatureCollection",
        "name": "major-mountain-system-outlines",
        "metadata": {
            "source": "GMBA Mountain Inventory v2.0, standard 300 selection",
            "source_url": "https://www.earthenv.org/mountains",
            "license": "CC BY 4.0",
            "accuracy_note": "山系范围概括轮廓，不是精确山脊轴线。",
        },
        "features": features,
    }
    label_collection = {
        "type": "FeatureCollection",
        "name": "major-mountain-system-labels",
        "metadata": collection["metadata"],
        "features": labels,
    }
    (DATA / "major-mountain-systems.geojson").write_text(json.dumps(collection, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    payload = json.dumps(collection, ensure_ascii=False, separators=(",", ":"))
    label_payload = json.dumps(label_collection, ensure_ascii=False, separators=(",", ":"))
    (DATA / "major-mountain-systems.js").write_text(
        f"window.majorMountainSystems = {payload};\nwindow.majorMountainSystemLabels = {label_payload};\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(features)} mountain-system outlines and labels.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
