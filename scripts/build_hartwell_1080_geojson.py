#!/usr/bin/env python3
"""Build lightweight 1080 historical regime overlays from Hartwell CHGIS data.

Input: v5_Hartwell_2010.zip from Harvard Dataverse dataset
       "Hartwell China Historical GIS" doi:10.7910/DVN/29302.

The Hartwell V5 files are projected in Xian 1980 Gauss-Kruger Zone 19.
This script reads the needed shapefiles directly from the zip, converts
coordinates approximately to WGS84 lon/lat, simplifies rings, and writes
GeoJSON plus a browser-loadable JS wrapper.
"""

from __future__ import annotations

import json
import math
import struct
import sys
from dataclasses import dataclass
from pathlib import Path
from zipfile import ZipFile


ZIP_INNER = "v5_Hartwell"
SOURCE_DATASET = "Hartwell, Robert, 2015, Hartwell China Historical GIS, Harvard Dataverse, doi:10.7910/DVN/29302"
SOURCE_FILE = "v5_Hartwell_2010.zip / datafile 2542563"
ACCURACY_NOTE = (
    "Hartwell/CHGIS V5 co-location polygons approximate historical territories "
    "using modern county-level units and hand-adjusted boundaries. Xian 1980 was "
    "converted approximately to WGS84 for web mapping."
)


@dataclass(frozen=True)
class Regime:
    key: str
    label_en: str
    label_zh: str
    source_base: str
    color: str
    filter_sup_prov: tuple[str, ...] = ()
    tolerance_m: float = 18000.0
    note: str = ""


REGIMES = [
    Regime(
        key="northern_song",
        label_en="Northern Song",
        label_zh="北宋",
        source_base="v5_1080_chin_chn_1080_c",
        color="#2e7d32",
        filter_sup_prov=("Song Dynasty", "Song dynasty"),
        tolerance_m=16000.0,
        note="从 1080 年 county polygons 中筛选 H_SUP_PROV=Song Dynasty。",
    ),
    Regime(
        key="liao",
        label_en="Liao",
        label_zh="辽",
        source_base="v5_1080_indp_liao_1080",
        color="#6a5acd",
        tolerance_m=24000.0,
        note="Hartwell 独立政权层。",
    ),
    Regime(
        key="western_xia",
        label_en="Western Xia",
        label_zh="西夏",
        source_base="v5_1080_indp_xxia_1080",
        color="#c77d24",
        tolerance_m=22000.0,
        note="Hartwell 独立政权层。",
    ),
    Regime(
        key="dali",
        label_en="Dali",
        label_zh="大理",
        source_base="v5_1080_indp_dali_1080",
        color="#00897b",
        tolerance_m=22000.0,
        note="Hartwell 独立政权层。",
    ),
    Regime(
        key="tufan_tribes",
        label_en="Tufan Tribes",
        label_zh="吐蕃诸部",
        source_base="v5_1080_indp_tufn_1080",
        color="#8d6e63",
        tolerance_m=35000.0,
        note="Hartwell 独立政权层；边界尤其应视为示意。",
    ),
    Regime(
        key="heihan",
        label_en="Heihan",
        label_zh="黑汗 / 喀喇汗相关区域",
        source_base="v5_1080_indp_hei_1080",
        color="#607d8b",
        tolerance_m=30000.0,
        note="Hartwell 独立政权层；用于西北背景。",
    ),
    Regime(
        key="yutian",
        label_en="Yutian",
        label_zh="于阗相关区域",
        source_base="v5_1080_indp_hotn_1080",
        color="#795548",
        tolerance_m=30000.0,
        note="Hartwell 独立政权层；用于西域背景。",
    ),
    Regime(
        key="liuqiu",
        label_en="Liuqiu",
        label_zh="流求",
        source_base="v5_1080_indp_liuq_1080",
        color="#0097a7",
        tolerance_m=12000.0,
        note="Hartwell 独立政权层；岛屿边界近似。",
    ),
    Regime(
        key="abor",
        label_en="Abor",
        label_zh="西南边地部族区域",
        source_base="v5_1080_indp_abor_1080",
        color="#7b1fa2",
        tolerance_m=12000.0,
        note="Hartwell 独立政权层；用于南方边地背景。",
    ),
]


def read_dbf_records(data: bytes) -> list[dict[str, str]]:
    record_count = struct.unpack("<I", data[4:8])[0]
    header_len = struct.unpack("<H", data[8:10])[0]
    record_len = struct.unpack("<H", data[10:12])[0]
    fields: list[tuple[str, int]] = []
    pos = 32
    while pos < header_len and data[pos] != 0x0D:
        raw = data[pos : pos + 32]
        name = raw[:11].split(b"\x00", 1)[0].decode("ascii", "ignore")
        length = raw[16]
        fields.append((name, length))
        pos += 32

    records: list[dict[str, str]] = []
    for idx in range(record_count):
        rec = data[header_len + idx * record_len : header_len + (idx + 1) * record_len]
        if not rec or rec[0:1] == b"*":
            records.append({})
            continue
        offset = 1
        item: dict[str, str] = {}
        for name, length in fields:
            raw = rec[offset : offset + length]
            offset += length
            item[name] = decode_dbf_text(raw)
        records.append(item)
    return records


def decode_dbf_text(raw: bytes) -> str:
    raw = raw.rstrip(b"\x00 ").lstrip()
    if not raw:
        return ""
    # Hartwell V5 stores Chinese text in Big5; ASCII-only fields decode the same.
    return raw.decode("big5", "ignore").strip()


def iter_polygon_records(data: bytes):
    offset = 100
    while offset + 8 <= len(data):
        _record_number, content_words = struct.unpack(">2i", data[offset : offset + 8])
        offset += 8
        content_len = content_words * 2
        content = data[offset : offset + content_len]
        offset += content_len
        if len(content) < 44:
            continue
        shape_type = struct.unpack("<i", content[:4])[0]
        if shape_type == 0:
            yield []
            continue
        if shape_type != 5:
            raise ValueError(f"Expected polygon shape type 5, got {shape_type}")
        num_parts, num_points = struct.unpack("<2i", content[36:44])
        parts_offset = 44
        points_offset = parts_offset + num_parts * 4
        parts = list(struct.unpack(f"<{num_parts}i", content[parts_offset:points_offset]))
        points = [
            struct.unpack("<2d", content[points_offset + i * 16 : points_offset + (i + 1) * 16])
            for i in range(num_points)
        ]
        rings = []
        for part_index, start in enumerate(parts):
            end = parts[part_index + 1] if part_index + 1 < len(parts) else num_points
            rings.append(points[start:end])
        yield rings


def xian1980_gk19_to_lonlat(x: float, y: float) -> tuple[float, float]:
    # Xian 1980 ellipsoid, inverse Gauss-Kruger / Transverse Mercator.
    a = 6378140.0
    inv_f = 298.257
    f = 1.0 / inv_f
    e2 = f * (2.0 - f)
    ep2 = e2 / (1.0 - e2)
    k0 = 1.0
    lon0 = math.radians(111.0)
    false_easting = 19500000.0

    east = x - false_easting
    north = y
    m = north / k0
    mu = m / (a * (1.0 - e2 / 4.0 - 3.0 * e2**2 / 64.0 - 5.0 * e2**3 / 256.0))
    e1 = (1.0 - math.sqrt(1.0 - e2)) / (1.0 + math.sqrt(1.0 - e2))
    phi1 = (
        mu
        + (3.0 * e1 / 2.0 - 27.0 * e1**3 / 32.0) * math.sin(2.0 * mu)
        + (21.0 * e1**2 / 16.0 - 55.0 * e1**4 / 32.0) * math.sin(4.0 * mu)
        + (151.0 * e1**3 / 96.0) * math.sin(6.0 * mu)
        + (1097.0 * e1**4 / 512.0) * math.sin(8.0 * mu)
    )

    sin1 = math.sin(phi1)
    cos1 = math.cos(phi1)
    tan1 = math.tan(phi1)
    n1 = a / math.sqrt(1.0 - e2 * sin1 * sin1)
    t1 = tan1 * tan1
    c1 = ep2 * cos1 * cos1
    r1 = a * (1.0 - e2) / ((1.0 - e2 * sin1 * sin1) ** 1.5)
    d = east / (n1 * k0)

    lat = phi1 - (n1 * tan1 / r1) * (
        d**2 / 2.0
        - (5.0 + 3.0 * t1 + 10.0 * c1 - 4.0 * c1**2 - 9.0 * ep2) * d**4 / 24.0
        + (61.0 + 90.0 * t1 + 298.0 * c1 + 45.0 * t1**2 - 252.0 * ep2 - 3.0 * c1**2)
        * d**6
        / 720.0
    )
    lon = lon0 + (
        d
        - (1.0 + 2.0 * t1 + c1) * d**3 / 6.0
        + (5.0 - 2.0 * c1 + 28.0 * t1 - 3.0 * c1**2 + 8.0 * ep2 + 24.0 * t1**2) * d**5 / 120.0
    ) / cos1

    # Treat Xian 1980 as close enough to WGS84 for this reading-map layer.
    return (round(math.degrees(lon), 5), round(math.degrees(lat), 5))


def perpendicular_distance(point, start, end) -> float:
    px, py = point
    sx, sy = start
    ex, ey = end
    dx = ex - sx
    dy = ey - sy
    if dx == 0 and dy == 0:
        return math.hypot(px - sx, py - sy)
    return abs(dy * px - dx * py + ex * sy - ey * sx) / math.hypot(dx, dy)


def douglas_peucker(points: list[tuple[float, float]], tolerance: float) -> list[tuple[float, float]]:
    if len(points) <= 3:
        return points
    max_dist = 0.0
    max_index = 0
    start = points[0]
    end = points[-1]
    for idx in range(1, len(points) - 1):
        dist = perpendicular_distance(points[idx], start, end)
        if dist > max_dist:
            max_dist = dist
            max_index = idx
    if max_dist > tolerance:
        left = douglas_peucker(points[: max_index + 1], tolerance)
        right = douglas_peucker(points[max_index:], tolerance)
        return left[:-1] + right
    return [start, end]


def ring_area_projected(ring: list[tuple[float, float]]) -> float:
    if len(ring) < 4:
        return 0.0
    area = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        area += x1 * y2 - x2 * y1
    return abs(area) / 2.0


def simplify_ring(ring: list[tuple[float, float]], tolerance: float) -> list[tuple[float, float]]:
    if len(ring) < 4:
        return []
    closed = ring[0] == ring[-1]
    work = ring if closed else ring + [ring[0]]
    simplified = douglas_peucker(work, tolerance)
    if simplified[0] != simplified[-1]:
        simplified.append(simplified[0])
    if len(simplified) < 4:
        return []
    return simplified


def admin_type_zh(admin_type: str) -> str:
    return {
        "Xian": "县",
        "Zhou": "州",
        "Jun": "军",
        "Jian": "监",
        "Lu": "路",
        "Dao": "道",
        "Zhai": "寨",
        "Zhen": "镇",
        "Cheng": "城",
        "Bu": "部",
        "Yuan": "院",
        "Tong": "峒",
        "Jimizhou": "羁縻州",
        "Tributary State": "朝贡 / 属国",
    }.get(admin_type, admin_type)


def unit_name(attrs: dict[str, str]) -> str:
    return attrs.get("CHARACTER_") or attrs.get("H_UNICODE_") or attrs.get("PINYIN_NAM") or attrs.get("H_PINYIN_N") or ""


def build_regime(zip_file: ZipFile, regime: Regime) -> tuple[list[dict], dict]:
    shp_name = f"{ZIP_INNER}/{regime.source_base}.shp"
    dbf_name = f"{ZIP_INNER}/{regime.source_base}.dbf"
    dbf_records = read_dbf_records(zip_file.read(dbf_name))
    rings_by_record = list(iter_polygon_records(zip_file.read(shp_name)))
    if len(dbf_records) != len(rings_by_record):
        raise ValueError(f"Record mismatch for {regime.source_base}: {len(dbf_records)} dbf vs {len(rings_by_record)} shp")

    features = []
    used_records = 0
    raw_rings = 0
    kept_rings = 0
    raw_points = 0
    kept_points = 0
    min_area = (regime.tolerance_m * regime.tolerance_m) / 3.0

    for attrs, record_rings in zip(dbf_records, rings_by_record):
        if regime.filter_sup_prov and attrs.get("H_SUP_PROV") not in regime.filter_sup_prov:
            continue
        if not record_rings:
            continue
        used_records += 1
        for ring in record_rings:
            raw_rings += 1
            raw_points += len(ring)
            if ring_area_projected(ring if ring[0] == ring[-1] else ring + [ring[0]]) < min_area:
                continue
            simplified = simplify_ring(ring, regime.tolerance_m)
            if not simplified:
                continue
            coords = [xian1980_gk19_to_lonlat(x, y) for x, y in simplified]
            feature = {
                "type": "Feature",
                "properties": {
                    "kind": "historical_unit",
                    "year": 1080,
                    "regime_key": regime.key,
                    "regime_name": regime.label_en,
                    "regime_name_zh": regime.label_zh,
                    "color": regime.color,
                    "unit_name": unit_name(attrs),
                    "unit_name_short": attrs.get("H_UNICODE_") or attrs.get("CHARACTER_") or "",
                    "unit_pinyin": attrs.get("PINYIN_NAM") or attrs.get("H_PINYIN_N") or "",
                    "admin_type": attrs.get("H_ADMIN_TY") or attrs.get("ADMINISTRA") or "",
                    "admin_type_zh": admin_type_zh(attrs.get("H_ADMIN_TY") or attrs.get("ADMINISTRA") or ""),
                    "province": attrs.get("H_PROVINCE") or "",
                    "province_zh": attrs.get("H_CHINPROV") or "",
                    "superior": attrs.get("H_SUP_PROV") or "",
                    "source_layer": regime.source_base,
                    "source_record_index": used_records,
                    "source": SOURCE_DATASET,
                    "source_file": SOURCE_FILE,
                    "accuracy_note": ACCURACY_NOTE,
                    "note": regime.note,
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [coords],
                },
            }
            features.append(feature)
            kept_rings += 1
            kept_points += len(coords)

    summary = {
        "key": regime.key,
        "name": regime.label_en,
        "name_zh": regime.label_zh,
        "color": regime.color,
        "source_layer": regime.source_base,
        "source_feature_count": used_records,
        "raw_ring_count": raw_rings,
        "kept_ring_count": kept_rings,
        "raw_point_count": raw_points,
        "kept_point_count": kept_points,
    }
    return features, summary


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: build_hartwell_1080_geojson.py /path/to/v5_Hartwell_2010.zip [out_dir]", file=sys.stderr)
        return 2
    zip_path = Path(sys.argv[1])
    out_dir = Path(sys.argv[2]) if len(sys.argv) >= 3 else Path(__file__).resolve().parent
    out_dir.mkdir(parents=True, exist_ok=True)

    with ZipFile(zip_path) as zip_file:
        features = []
        summaries = []
        for regime in REGIMES:
            regime_features, summary = build_regime(zip_file, regime)
            features.extend(regime_features)
            summaries.append(summary)

    data = {
        "type": "FeatureCollection",
        "name": "hartwell-1080-historical-units",
        "metadata": {
            "title": "1080 年前后北宋及周边政权区域",
            "source": SOURCE_DATASET,
            "source_url": "https://doi.org/10.7910/DVN/29302",
            "source_file": SOURCE_FILE,
            "generated_for": "苏东坡新传 reading map",
            "year": 1080,
            "accuracy_note": "用于读书会空间理解；较手绘准确，但不等于严格国界考证。",
            "unit_note": "多数北宋小多边形是县级记录；上层区划字段 H_PROVINCE 对应宋代的路。中文名称按源 DBF 的 Big5 字段保留，多为繁体。",
            "regimes": summaries,
        },
        "features": features,
    }

    geojson_path = out_dir / "historical-regimes-1080.geojson"
    js_path = out_dir / "historical-regimes-1080.js"
    geojson_text = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    geojson_path.write_text(geojson_text + "\n", encoding="utf-8")
    js_path.write_text("window.historicalRegimes1080 = " + geojson_text + ";\n", encoding="utf-8")

    print(f"wrote {geojson_path}")
    print(f"wrote {js_path}")
    for props in summaries:
        print(
            f"{props['name']}: records={props['source_feature_count']} "
            f"rings={props['kept_ring_count']}/{props['raw_ring_count']} "
            f"points={props['kept_point_count']}/{props['raw_point_count']}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
