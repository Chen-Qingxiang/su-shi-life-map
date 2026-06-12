#!/usr/bin/env python3
"""Download and convert named waterways relevant to the Nanxing journey.

The resulting GeoJSON uses current OpenStreetMap river geometry as a physical
geography reference. It does not claim that every channel matches the Song-era
river course.
"""

from __future__ import annotations

import json
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
USER_AGENT = "SuShiReadingMap/0.1 (personal reading research)"

QUERY = """
[out:json][timeout:180];
(
  way["waterway"="river"]["name"~"^(岷江|长江|長江|嘉陵江|汉江|漢江|汉水|漢水|唐河)$"](27.5,102.5,35.5,115.5);
);
out geom;
""".strip()


def main() -> int:
    payload = urllib.parse.urlencode({"data": QUERY}).encode("utf-8")
    request = urllib.request.Request(
        OVERPASS_URL,
        data=payload,
        headers={"User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(request, timeout=300) as response:
        osm = json.loads(response.read().decode("utf-8"))

    features = []
    for element in osm.get("elements", []):
        geometry = element.get("geometry") or []
        if element.get("type") != "way" or len(geometry) < 2:
            continue
        tags = element.get("tags") or {}
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "kind": "physical_waterway",
                    "name": tags.get("name") or "未命名河段",
                    "name_en": tags.get("name:en"),
                    "waterway": tags.get("waterway"),
                    "osm_type": "way",
                    "osm_id": element.get("id"),
                    "source": "OpenStreetMap contributors",
                    "source_url": f"https://www.openstreetmap.org/way/{element.get('id')}",
                    "accuracy_note": "现代 OpenStreetMap 河道几何，用于自然地理参照；不等于北宋河道复原。",
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[point["lon"], point["lat"]] for point in geometry],
                },
            }
        )

    data = {
        "type": "FeatureCollection",
        "name": "nanxing-relevant-modern-waterways",
        "metadata": {
            "source": "OpenStreetMap contributors",
            "license": "ODbL 1.0",
            "query": QUERY,
            "accuracy_note": "现代河道参照，不等于北宋河道复原。",
        },
        "features": features,
    }
    geojson_path = DATA / "physical-waterways.geojson"
    js_path = DATA / "physical-waterways.js"
    geojson_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    js_path.write_text(f"window.suShiPhysicalWaterways = {json.dumps(data, ensure_ascii=False, separators=(',', ':'))};\n", encoding="utf-8")
    print(f"Wrote {len(features)} river segments to {geojson_path} and {js_path}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
