#!/usr/bin/env python3
"""Build coarse outer-boundary overlays for 1080 historical regimes.

This intentionally avoids GIS dependencies. It rasterizes the existing
Hartwell-derived polygons to a lon/lat grid and emits cell-edge boundaries for
each regime's union mask. The output is an approximate visual guide, not a
replacement for the source polygon layer.
"""

from __future__ import annotations

import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

LON_MIN, LON_MAX = 73.0, 136.0
LAT_MIN, LAT_MAX = 18.0, 54.0
GRID_W, GRID_H = 520, 300


def point_in_ring(x: float, y: float, ring: list[list[float]]) -> bool:
    inside = False
    j = len(ring) - 1
    for i, point in enumerate(ring):
        xi, yi = point
        xj, yj = ring[j]
        if (yi > y) != (yj > y):
            x_at_y = (xj - xi) * (y - yi) / (yj - yi) + xi
            if x < x_at_y:
                inside = not inside
        j = i
    return inside


def point_in_polygon(x: float, y: float, polygon: list[list[list[float]]]) -> bool:
    if not polygon or not point_in_ring(x, y, polygon[0]):
        return False
    return not any(point_in_ring(x, y, hole) for hole in polygon[1:])


def clamp(value: int, low: int, high: int) -> int:
    return max(low, min(high, value))


def mark_polygon(mask: bytearray, polygon: list[list[list[float]]], dx: float, dy: float) -> None:
    exterior = polygon[0]
    lon_values = [point[0] for point in exterior]
    lat_values = [point[1] for point in exterior]
    ix0 = clamp(math.floor((min(lon_values) - LON_MIN) / dx) - 1, 0, GRID_W - 1)
    ix1 = clamp(math.ceil((max(lon_values) - LON_MIN) / dx) + 1, 0, GRID_W - 1)
    iy0 = clamp(math.floor((LAT_MAX - max(lat_values)) / dy) - 1, 0, GRID_H - 1)
    iy1 = clamp(math.ceil((LAT_MAX - min(lat_values)) / dy) + 1, 0, GRID_H - 1)

    for iy in range(iy0, iy1 + 1):
        lat = LAT_MAX - (iy + 0.5) * dy
        row_offset = iy * GRID_W
        for ix in range(ix0, ix1 + 1):
            lon = LON_MIN + (ix + 0.5) * dx
            if point_in_polygon(lon, lat, polygon):
                mask[row_offset + ix] = 1


def regime_masks(source: dict) -> tuple[dict[str, bytearray], dict[str, dict]]:
    masks: dict[str, bytearray] = {}
    props_by_key: dict[str, dict] = {}
    dx = (LON_MAX - LON_MIN) / GRID_W
    dy = (LAT_MAX - LAT_MIN) / GRID_H

    for feature in source["features"]:
        props = feature["properties"]
        key = props["regime_key"]
        masks.setdefault(key, bytearray(GRID_W * GRID_H))
        props_by_key.setdefault(
            key,
            {
                "regime_key": key,
                "regime_name": props["regime_name"],
                "regime_name_zh": props["regime_name_zh"],
                "color": props.get("color", ""),
            },
        )
        geom = feature["geometry"]
        polygons = [geom["coordinates"]] if geom["type"] == "Polygon" else geom.get("coordinates", [])
        for polygon in polygons:
            if polygon:
                mark_polygon(masks[key], polygon, dx, dy)

    return masks, props_by_key


def mask_boundaries(mask: bytearray) -> list[list[list[float]]]:
    dx = (LON_MAX - LON_MIN) / GRID_W
    dy = (LAT_MAX - LAT_MIN) / GRID_H
    lines: list[list[list[float]]] = []

    def filled(ix: int, iy: int) -> bool:
        return 0 <= ix < GRID_W and 0 <= iy < GRID_H and bool(mask[iy * GRID_W + ix])

    def point(ix: int, iy: int) -> list[float]:
        return [round(LON_MIN + ix * dx, 4), round(LAT_MAX - iy * dy, 4)]

    for iy in range(GRID_H):
        for ix in range(GRID_W):
            if not filled(ix, iy):
                continue
            top_left = point(ix, iy)
            top_right = point(ix + 1, iy)
            bottom_left = point(ix, iy + 1)
            bottom_right = point(ix + 1, iy + 1)
            if not filled(ix, iy - 1):
                lines.append([top_left, top_right])
            if not filled(ix + 1, iy):
                lines.append([top_right, bottom_right])
            if not filled(ix, iy + 1):
                lines.append([bottom_right, bottom_left])
            if not filled(ix - 1, iy):
                lines.append([bottom_left, top_left])

    return lines


def main() -> int:
    source_path = DATA / "historical-regimes-1080.geojson"
    source = json.loads(source_path.read_text(encoding="utf-8"))
    masks, props_by_key = regime_masks(source)

    features = []
    for key, mask in masks.items():
        lines = mask_boundaries(mask)
        if not lines:
            continue
        props = dict(props_by_key[key])
        props.update(
            {
                "kind": "regime_outer_boundary",
                "year": 1080,
                "method": "rasterized union mask from Hartwell-derived polygons",
                "grid_width": GRID_W,
                "grid_height": GRID_H,
                "accuracy_note": "Coarse visual outer boundary for map readability; not a strict historical boundary.",
            }
        )
        features.append(
            {
                "type": "Feature",
                "properties": props,
                "geometry": {"type": "MultiLineString", "coordinates": lines},
            }
        )

    data = {
        "type": "FeatureCollection",
        "name": "hartwell-1080-regime-outer-boundaries",
        "metadata": {
            "title": "1080 年政权外缘边界（栅格化近似）",
            "source": source["metadata"]["source"],
            "source_url": source["metadata"]["source_url"],
            "year": 1080,
            "method": "Rasterized union mask from existing historical-regimes-1080 polygons.",
            "grid_width": GRID_W,
            "grid_height": GRID_H,
            "accuracy_note": "读图辅助线；比凸包更接近外轮廓，但仍非严格边界考证。",
        },
        "features": features,
    }

    geojson_path = DATA / "historical-regime-boundaries-1080.geojson"
    js_path = DATA / "historical-regime-boundaries-1080.js"
    geojson_text = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    geojson_path.write_text(geojson_text + "\n", encoding="utf-8")
    js_path.write_text("window.historicalRegimeBoundaries1080 = " + geojson_text + ";\n", encoding="utf-8")
    print(f"wrote {geojson_path}")
    print(f"wrote {js_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
