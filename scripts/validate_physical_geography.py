#!/usr/bin/env python3
"""Validate generated physical-geography GeoJSON layers."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

HYDRO_LAYERS = {
    "hydrorivers-major.geojson": {8, 9},
    "hydrorivers-tributaries.geojson": {7},
    "hydrorivers-regional.geojson": {6},
}


def read(name: str) -> dict:
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def main() -> int:
    errors: list[str] = []
    reach_total = 0

    for name, expected_orders in HYDRO_LAYERS.items():
        data = read(name)
        orders = {feature["properties"].get("strahler_order") for feature in data.get("features", [])}
        reach_total += sum(feature["properties"].get("reach_count", 0) for feature in data.get("features", []))
        if orders != expected_orders:
            errors.append(f"{name}: expected orders {sorted(expected_orders)}, got {sorted(orders)}")
        for feature in data.get("features", []):
            if feature.get("geometry", {}).get("type") != "MultiLineString":
                errors.append(f"{name}: expected MultiLineString")
            if not feature["properties"].get("source_url"):
                errors.append(f"{name}: missing source_url")

    mountain_systems = read("major-mountain-systems.geojson")
    for feature in mountain_systems.get("features", []):
        props = feature.get("properties", {})
        if not props.get("name_zh") or not props.get("source_url"):
            errors.append("major-mountain-systems.geojson: unnamed or unsourced feature")

    ridges = read("named-mountain-ridges.geojson")
    for feature in ridges.get("features", []):
        props = feature.get("properties", {})
        if not props.get("name") or not props.get("source_url"):
            errors.append("named-mountain-ridges.geojson: unnamed or unsourced feature")

    named_rivers = read("named-rivers.geojson")
    for feature in named_rivers.get("features", []):
        props = feature.get("properties", {})
        if not props.get("name_zh") or not props.get("profile") or not props.get("source_url"):
            errors.append("named-rivers.geojson: unnamed, undescribed, or unsourced feature")

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    print(
        f"Validated {reach_total} HydroRIVERS reaches, "
        f"{len(mountain_systems.get('features', []))} mountain systems, and "
        f"{len(ridges.get('features', []))} named ridges, and "
        f"{len(named_rivers.get('features', []))} named river references."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
