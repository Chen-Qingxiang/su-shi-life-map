#!/usr/bin/env python3
"""Download named mountain ridge lines in China and surroundings from OSM."""

from __future__ import annotations

import json
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
USER_AGENT = "SuShiReadingMap/0.2 (personal reading research)"

QUERY = """
[out:json][timeout:300];
way["natural"="ridge"]["name"](17,72,55,136);
out geom;
""".strip()


def main() -> int:
    request = urllib.request.Request(
        OVERPASS_URL,
        data=urllib.parse.urlencode({"data": QUERY}).encode("utf-8"),
        headers={"User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(request, timeout=360) as response:
        osm = json.loads(response.read().decode("utf-8"))

    features = []
    for element in osm.get("elements", []):
        geometry = element.get("geometry") or []
        tags = element.get("tags") or {}
        if element.get("type") != "way" or len(geometry) < 2:
            continue
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "kind": "named_mountain_ridge",
                    "name": tags.get("name"),
                    "name_zh": tags.get("name:zh"),
                    "name_en": tags.get("name:en"),
                    "osm_id": element.get("id"),
                    "source": "OpenStreetMap contributors",
                    "source_url": f"https://www.openstreetmap.org/way/{element.get('id')}",
                    "accuracy_note": "OpenStreetMap 命名山脊线；覆盖完整度因地区而异，不等于完整山脉范围。",
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[round(point["lon"], 5), round(point["lat"], 5)] for point in geometry],
                },
            }
        )

    collection = {
        "type": "FeatureCollection",
        "name": "named-mountain-ridges",
        "metadata": {
            "source": "OpenStreetMap contributors",
            "license": "ODbL 1.0",
            "query": QUERY,
            "accuracy_note": "命名山脊线，覆盖完整度因地区而异。",
        },
        "features": features,
    }
    payload = json.dumps(collection, ensure_ascii=False, separators=(",", ":"))
    (DATA / "named-mountain-ridges.geojson").write_text(json.dumps(collection, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (DATA / "named-mountain-ridges.js").write_text(f"window.namedMountainRidges = {payload};\n", encoding="utf-8")
    print(f"Wrote {len(features)} named mountain ridge lines.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
