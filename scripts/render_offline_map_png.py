#!/usr/bin/env python3
"""Render usable offline basemap PNGs from local historical/life data (no deps)."""
from __future__ import annotations

from pathlib import Path
import json
import math
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

W, H = 2048, 1400
LON_MIN, LON_MAX = 73.0, 136.0
LAT_MIN, LAT_MAX = 18.0, 54.0

REGIME_COLORS = {
    "northern_song": (192, 57, 43),
    "liao": (46, 134, 193),
    "western_xia": (243, 156, 18),
    "dali": (39, 174, 96),
    "tufan_tribes": (142, 68, 173),
    "heihan": (22, 160, 133),
    "yutian": (127, 140, 141),
    "liuqiu": (52, 73, 94),
    "abor": (160, 64, 0),
}


def _chunk(tag: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(tag + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)


def save_png(path: Path, img: list[list[tuple[int, int, int]]]) -> None:
    h = len(img)
    w = len(img[0])
    raw_rows = []
    for row in img:
        b = bytearray([0])
        for r, g, bch in row:
            b.extend((r, g, bch))
        raw_rows.append(bytes(b))
    raw = b"".join(raw_rows)
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    payload = b"\x89PNG\r\n\x1a\n" + _chunk(b"IHDR", ihdr) + _chunk(b"IDAT", zlib.compress(raw, 9)) + _chunk(b"IEND", b"")
    path.write_bytes(payload)


def project(lon: float, lat: float) -> tuple[int, int]:
    x = int((lon - LON_MIN) / (LON_MAX - LON_MIN) * (W - 1))
    y = int((LAT_MAX - lat) / (LAT_MAX - LAT_MIN) * (H - 1))
    return max(0, min(W - 1, x)), max(0, min(H - 1, y))


def blend(px, c, a=0.25):
    return tuple(int(px[i] * (1 - a) + c[i] * a) for i in range(3))


def draw_line(img, x0, y0, x1, y1, color, w=1):
    dx = abs(x1 - x0)
    dy = -abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx + dy
    while True:
        for ox in range(-w, w + 1):
            for oy in range(-w, w + 1):
                xx, yy = x0 + ox, y0 + oy
                if 0 <= xx < W and 0 <= yy < H:
                    img[yy][xx] = color
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy


def draw_circle(img, cx, cy, r, color):
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            if 0 <= x < W and 0 <= y < H and (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                img[y][x] = color


def main():
    regimes = json.loads((DATA / "historical-regimes-1080.geojson").read_text())
    stops = json.loads((DATA / "su-shi-life-locations.geojson").read_text())

    img = [[(244, 242, 235) for _ in range(W)] for _ in range(H)]
    # grid
    for lon in range(75, 136, 5):
        x, _ = project(float(lon), LAT_MIN)
        draw_line(img, x, 0, x, H - 1, (225, 223, 216), 0)
    for lat in range(20, 55, 5):
        _, y = project(LON_MIN, float(lat))
        draw_line(img, 0, y, W - 1, y, (225, 223, 216), 0)

    # draw regime polygon edges and faint fills by vertices (fast approximation)
    for f in regimes["features"]:
        key = f["properties"].get("regime_key")
        c = REGIME_COLORS.get(key, (120, 120, 120))
        geom = f["geometry"]
        polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom.get("coordinates", [])
        for poly in polys:
            ring = poly[0]
            pts = [project(lon, lat) for lon, lat in ring]
            for i in range(len(pts) - 1):
                draw_line(img, pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1], c, 1)
            for x,y in pts[::max(1,len(pts)//20)]:
                img[y][x] = blend(img[y][x], c, 0.35)

    # route + stops
    route_feature = next(f for f in stops["features"] if f["geometry"]["type"] == "LineString")
    route_coords = [project(lon, lat) for lon, lat in route_feature["geometry"]["coordinates"]]
    stop_points = [f for f in stops["features"] if f["geometry"]["type"] == "Point"]
    stop_points.sort(key=lambda f: f["properties"].get("order", 0))
    coords = [project(*f["geometry"]["coordinates"]) for f in stop_points]

    for i in range(len(route_coords)-1):
        draw_line(img, route_coords[i][0], route_coords[i][1], route_coords[i+1][0], route_coords[i+1][1], (71,84,103), 1)
    for i in range(len(coords)-1):
        draw_line(img, coords[i][0], coords[i][1], coords[i+1][0], coords[i+1][1], (71,84,103), 1)
    for x,y in coords:
        draw_circle(img,x,y,4,(33,33,33))
        draw_circle(img,x,y,2,(255,255,255))

    # border frame
    draw_line(img, 0, 0, W-1, 0, (80,80,80), 2)
    draw_line(img, 0, H-1, W-1, H-1, (80,80,80), 2)
    draw_line(img, 0, 0, 0, H-1, (80,80,80), 2)
    draw_line(img, W-1, 0, W-1, H-1, (80,80,80), 2)

    save_png(DATA / "offline-map-1080.png", img)

    # terrain style variant
    img2 = [[(230 - int(35 * y / H), 224 - int(30 * y / H), 200 - int(40 * y / H)) for _ in range(W)] for y in range(H)]
    for y in range(H):
        for x in range(W):
            if (x+y) % 97 == 0:
                img2[y][x] = (190,185,165)
    for i in range(len(route_coords)-1):
        draw_line(img2, route_coords[i][0], route_coords[i][1], route_coords[i+1][0], route_coords[i+1][1], (120,72,36), 1)
    for x,y in coords:
        draw_circle(img2,x,y,3,(50,50,50))
    save_png(DATA / "offline-map-1080-terrain.png", img2)
    print('Rendered offline PNGs to data/')


if __name__ == '__main__':
    main()
