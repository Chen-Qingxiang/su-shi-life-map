#!/usr/bin/env python3
"""Build a browser-loadable JS wrapper for Su Shi life-location GeoJSON."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"


def main() -> int:
    geojson_path = DATA / "su-shi-life-locations.geojson"
    js_path = DATA / "su-shi-life-locations.js"

    data = json.loads(geojson_path.read_text(encoding="utf-8"))
    geojson_text = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    js_path.write_text("window.suShiLifeLocations = " + geojson_text + ";\n", encoding="utf-8")

    print(f"wrote {js_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
