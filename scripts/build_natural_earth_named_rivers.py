#!/usr/bin/env python3
"""Build a clickable named-river reference layer from Natural Earth.

Usage:
    python3 scripts/build_natural_earth_named_rivers.py /path/to/ne_10m_rivers_lake_centerlines.shp

Natural Earth supplies names and Wikidata identifiers that HydroRIVERS does
not contain. This layer is intentionally used for river identification and
reading, while HydroRIVERS remains the more complete structural river network.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    import shapefile
except ImportError as error:
    raise SystemExit("This script requires pyshp: python -m pip install pyshp") from error


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
BBOX = (72.0, 17.0, 136.0, 55.0)

# Short reading-oriented profiles for major Chinese river systems and important
# rivers encountered in the southward journey. Wikidata IDs avoid name clashes.
PROFILES = {
    "Q7355": "黄河发源于青藏高原，流经黄土高原与华北平原后入渤海；泥沙、河患与灌溉共同塑造了中国北方历史。",
    "Q5413": "长江发源于青藏高原，横贯中国中部后入东海，是中国长度最长、流域范围广阔的河流系统。",
    "Q216941": "西江是珠江水系的主干之一，自西向东贯穿广西、广东，并经珠江三角洲水网入海。",
    "Q213576": "淮河位于黄河与长江之间，其流域是中国南北地理与气候过渡的重要区域。",
    "Q501253": "海河水系汇集华北平原多条河流，经天津附近入渤海，与北方城市、漕运和水利史密切相关。",
    "Q559661": "辽河流经中国东北南部并入渤海，是辽河平原的重要水系。",
    "Q210326": "松花江是黑龙江水系的重要支流，流经东北平原，连接吉林、哈尔滨等区域。",
    "Q875573": "汉水发源于秦岭南麓，向东南汇入长江；它连接汉中盆地、襄阳与江汉平原。",
    "Q1045185": "嘉陵江发源于秦岭地区，南流穿过四川盆地东部，在重庆汇入长江。",
    "Q729269": "岷江发源于四川北部山地，经成都平原西缘南流，在宜宾汇入长江；都江堰水利系统亦与岷江密切相关。",
    "Q1075393": "大渡河发源于青藏高原东缘，穿行横断山区与四川盆地西缘，最终汇入岷江。",
    "Q876857": "雅砻江是长江上游金沙江的重要支流，纵贯川西高山峡谷地区。",
    "Q1515792": "乌江发源于云贵高原，穿行峡谷地区后在重庆涪陵汇入长江。",
    "Q831884": "湘江纵贯湖南东部，北流入洞庭湖，是长江中游的重要支流。",
    "Q1063190": "沅水发源于云贵高原东部，流经湖南西部并入洞庭湖。",
    "Q1046685": "赣江纵贯江西，北流入鄱阳湖，是长江中下游的重要支流。",
    "Q976458": "闽江是福建的重要河流，穿过山地与盆地后经福州附近入海。",
    "Q26422": "怒江发源于青藏高原，沿横断山区南流，进入东南亚后称萨尔温江。",
    "Q237901": "塔里木河位于塔里木盆地北缘，是中国重要的内流河，水量主要来自周围高山冰雪融水。",
    "Q847641": "渭河发源于甘肃，横贯关中平原，在潼关附近汇入黄河，是黄河的重要支流。",
    "Q773033": "泾河发源于黄土高原地区，南流汇入渭河，是关中与黄土高原水系的重要组成部分。",
}
PROFILES_BY_NAME = {
    "长江": PROFILES["Q5413"],
    "黄河": PROFILES["Q7355"],
    "西江": PROFILES["Q216941"],
    "淮河": PROFILES["Q213576"],
    "海河": PROFILES["Q501253"],
    "辽河": PROFILES["Q559661"],
    "松花江": PROFILES["Q210326"],
    "汉水": PROFILES["Q875573"],
    "嘉陵江": PROFILES["Q1045185"],
    "岷江": PROFILES["Q729269"],
    "大渡河": PROFILES["Q1075393"],
    "雅砻江": PROFILES["Q876857"],
    "乌江": PROFILES["Q1515792"],
    "湘江": PROFILES["Q831884"],
    "沅水": PROFILES["Q1063190"],
    "赣江": PROFILES["Q1046685"],
    "闽江": PROFILES["Q976458"],
    "怒江": PROFILES["Q26422"],
    "塔里木河": PROFILES["Q237901"],
    "渭河": PROFILES["Q847641"],
    "泾河": PROFILES["Q773033"],
}


def intersects(bbox: list[float], extent: tuple[float, float, float, float]) -> bool:
    west, south, east, north = extent
    return not (bbox[2] < west or bbox[0] > east or bbox[3] < south or bbox[1] > north)


def rounded_line(points: list[tuple[float, float]]) -> list[list[float]]:
    return [[round(lon, 5), round(lat, 5)] for lon, lat in points]


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python3 scripts/build_natural_earth_named_rivers.py /path/to/ne_10m_rivers_lake_centerlines.shp")

    reader = shapefile.Reader(sys.argv[1], encoding="utf-8")
    features = []
    for shape, record in zip(reader.iterShapes(), reader.iterRecords()):
        props = record.as_dict()
        name_zh = (props.get("name_zh") or props.get("name_zht") or props.get("name") or "").strip()
        if not name_zh or not intersects(shape.bbox, BBOX):
            continue

        starts = list(shape.parts) + [len(shape.points)]
        lines = [rounded_line(shape.points[start:end]) for start, end in zip(starts, starts[1:]) if end - start >= 2]
        if not lines:
            continue
        wikidata_id = (props.get("wikidataid") or "").strip()
        name_en = (props.get("name_en") or props.get("name") or "").strip()
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "kind": "named_river_reference",
                    "name_zh": name_zh,
                    "name_en": name_en,
                    "name_alt": (props.get("name_alt") or "").strip(),
                    "feature_class": props.get("featurecla"),
                    "scale_rank": props.get("scalerank"),
                    "min_zoom": props.get("min_zoom"),
                    "wikidata_id": wikidata_id,
                    "wikidata_url": f"https://www.wikidata.org/wiki/{wikidata_id}" if wikidata_id else "",
                    "wikipedia_url": f"https://zh.wikipedia.org/wiki/Special:Search?search={name_zh}",
                    "profile": PROFILES.get(
                        wikidata_id,
                        PROFILES_BY_NAME.get(
                            name_zh,
                            f"{name_zh}是 Natural Earth 收录的现代命名河流。可结合其所在流域、周边山地与城市继续阅读。",
                        ),
                    ),
                    "source": "Natural Earth 1:10m Rivers + lake centerlines",
                    "source_url": "https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/",
                    "accuracy_note": "名称与概括线形用于区域尺度识读；细部河道形态请结合 HydroRIVERS、OpenStreetMap 或更高精度资料。",
                },
                "geometry": {"type": "MultiLineString", "coordinates": lines},
            }
        )

    collection = {
        "type": "FeatureCollection",
        "name": "named-river-reference-east-asia",
        "metadata": {
            "source": "Natural Earth 1:10m Rivers + lake centerlines",
            "source_url": "https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/",
            "license": "Public domain",
            "bbox": BBOX,
            "accuracy_note": "用于河流名称识别与区域尺度阅读，不代替详细河道数据。",
        },
        "features": features,
    }
    payload = json.dumps(collection, ensure_ascii=False, separators=(",", ":"))
    (DATA / "named-rivers.geojson").write_text(json.dumps(collection, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (DATA / "named-rivers.js").write_text(f"window.namedRivers = {payload};\n", encoding="utf-8")
    print(f"Wrote {len(features)} named river features.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
