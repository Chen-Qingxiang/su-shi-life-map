#!/usr/bin/env python3
"""Validate the Su Shi life-location GeoJSON used by the static map."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
GEOJSON_PATH = ROOT / "data" / "su-shi-life-locations.geojson"
PLACE_KEY_RE = re.compile(r"^[a-z][a-z0-9_]*$")


def is_number(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def validate_point_coordinates(coordinates: object) -> bool:
    if not isinstance(coordinates, list) or len(coordinates) != 2:
        return False
    lon, lat = coordinates
    return is_number(lon) and is_number(lat) and -180 <= lon <= 180 and -90 <= lat <= 90


def validate_route_coordinates(coordinates: object) -> bool:
    if not isinstance(coordinates, list) or not coordinates:
        return False
    return all(validate_point_coordinates(point) for point in coordinates)


def main() -> int:
    data = json.loads(GEOJSON_PATH.read_text(encoding="utf-8"))
    features = data.get("features", [])
    errors: list[str] = []
    place_keys: dict[str, int] = {}
    route_count = 0

    for index, feature in enumerate(features):
        properties = feature.get("properties") or {}
        geometry = feature.get("geometry") or {}
        kind = properties.get("kind")

        if kind == "stop":
            order = properties.get("order")
            name = properties.get("name")
            place_key = properties.get("place_key")

            label = f"feature #{index}"
            if order is not None:
                label = f"stop order {order}"

            if order is None:
                errors.append(f"{label}: missing order")
            if not name:
                errors.append(f"{label}: missing name")
            if not place_key:
                errors.append(f"{label}: missing place_key")
            elif not PLACE_KEY_RE.match(place_key):
                errors.append(f"{label}: invalid place_key {place_key!r}")
            else:
                if place_key in place_keys:
                    errors.append(f"{label}: duplicate place_key {place_key!r} also used by order {place_keys[place_key]}")
                place_keys[place_key] = order

            if geometry.get("type") != "Point":
                errors.append(f"{label}: stop geometry must be Point")
            elif not validate_point_coordinates(geometry.get("coordinates")):
                errors.append(f"{label}: invalid point coordinates")

        elif kind == "route":
            route_count += 1
            if geometry.get("type") != "LineString":
                errors.append(f"route feature #{index}: geometry must be LineString")
            elif not validate_route_coordinates(geometry.get("coordinates")):
                errors.append(f"route feature #{index}: missing or invalid route coordinates")

    if route_count == 0:
        errors.append("missing route feature")

    if errors:
        print("Life-location validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"Validated {len(place_keys)} stops and {route_count} route feature(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
