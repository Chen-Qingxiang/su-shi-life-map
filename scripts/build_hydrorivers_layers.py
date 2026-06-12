#!/usr/bin/env python3
"""Build three switchable East Asia river-network layers from HydroRIVERS.

Usage:
    python3 scripts/build_hydrorivers_layers.py /path/to/HydroRIVERS_v10_as.shp

The source shapefile can be downloaded from:
https://data.hydrosheds.org/file/HydroRIVERS/HydroRIVERS_v10_as_shp.zip

Requires the pure-Python ``pyshp`` package (import name: ``shapefile``).
"""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

try:
    import shapefile
except ImportError as error:
    raise SystemExit("This script requires pyshp: python -m pip install pyshp") from error


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

# The reading map covers China and its surrounding geographic context.
BBOX = (72.0, 17.0, 136.0, 55.0)  # west, south, east, north

LEVELS = {
    "major": {
        "orders": {8, 9},
        "label": "一级干流",
        "description": "Strahler 8—9 级河流：全国尺度的大江干流骨架。",
    },
    "tributaries": {
        "orders": {7},
        "label": "主要支流",
        "description": "Strahler 7 级河流：主要支流与次一级干流。",
    },
    "regional": {
        "orders": {6},
        "label": "区域河网",
        "description": "Strahler 6 级河流：用于放大区域后的较详细河网。",
    },
}


def intersects(bbox: list[float], extent: tuple[float, float, float, float]) -> bool:
    west, south, east, north = extent
    return not (bbox[2] < west or bbox[0] > east or bbox[3] < south or bbox[1] > north)


def rounded_line(points: list[list[float] | tuple[float, float]]) -> list[list[float]]:
    return [[round(point[0], 4), round(point[1], 4)] for point in points]


def write_layer(level_key: str, lines_by_order: dict[int, list[list[list[float]]]]) -> None:
    config = LEVELS[level_key]
    features = []
    for order in sorted(lines_by_order):
        lines = lines_by_order[order]
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "kind": "hydrorivers_network",
                    "level": level_key,
                    "level_label": config["label"],
                    "strahler_order": order,
                    "reach_count": len(lines),
                    "source": "HydroRIVERS v1.0 / HydroSHEDS",
                    "source_url": "https://www.hydrosheds.org/products/hydrorivers",
                    "description": config["description"],
                    "accuracy_note": "由 HydroSHEDS 高程水文数据派生，适合水系结构阅读；不等于航道、行政水系名录或北宋河道复原。",
                },
                "geometry": {"type": "MultiLineString", "coordinates": lines},
            }
        )

    collection = {
        "type": "FeatureCollection",
        "name": f"hydrorivers-east-asia-{level_key}",
        "metadata": {
            "source": "HydroRIVERS v1.0 / HydroSHEDS",
            "source_url": "https://www.hydrosheds.org/products/hydrorivers",
            "bbox": BBOX,
            "orders": sorted(config["orders"]),
            "description": config["description"],
        },
        "features": features,
    }
    stem = f"hydrorivers-{level_key}"
    payload = json.dumps(collection, ensure_ascii=False, separators=(",", ":"))
    (DATA / f"{stem}.geojson").write_text(json.dumps(collection, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    global_name = "".join(part.title() for part in stem.split("-"))
    global_name = global_name[0].lower() + global_name[1:]
    (DATA / f"{stem}.js").write_text(f"window.{global_name} = {payload};\n", encoding="utf-8")
    print(f"Wrote {sum(len(lines) for lines in lines_by_order.values())} reaches to {stem}.geojson/.js")


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python3 scripts/build_hydrorivers_layers.py /path/to/HydroRIVERS_v10_as.shp")

    reader = shapefile.Reader(sys.argv[1])
    lines: dict[str, dict[int, list[list[list[float]]]]] = {
        key: defaultdict(list) for key in LEVELS
    }
    order_to_level = {
        order: level_key
        for level_key, config in LEVELS.items()
        for order in config["orders"]
    }

    for shape, record in zip(reader.iterShapes(), reader.iterRecords()):
        order = int(record.ORD_STRA)
        level_key = order_to_level.get(order)
        if not level_key or not intersects(shape.bbox, BBOX):
            continue
        starts = list(shape.parts) + [len(shape.points)]
        for start, end in zip(starts, starts[1:]):
            if end - start >= 2:
                lines[level_key][order].append(rounded_line(shape.points[start:end]))

    for level_key, lines_by_order in lines.items():
        write_layer(level_key, lines_by_order)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
