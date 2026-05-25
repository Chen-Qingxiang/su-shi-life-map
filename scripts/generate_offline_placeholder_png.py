#!/usr/bin/env python3
"""Generate visible offline placeholder PNG files without external deps."""

from __future__ import annotations

from pathlib import Path
import struct
import zlib


def _chunk(tag: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(tag + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)


def _png_from_rgb(width: int, height: int, rgb_rows: list[bytes]) -> bytes:
    if len(rgb_rows) != height:
        raise ValueError("row count does not match height")

    raw = b"".join(b"\x00" + row for row in rgb_rows)  # filter type 0 per row
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)  # RGB8
    return (
        b"\x89PNG\r\n\x1a\n"
        + _chunk(b"IHDR", ihdr)
        + _chunk(b"IDAT", zlib.compress(raw, level=9))
        + _chunk(b"IEND", b"")
    )


def _make_placeholder(width: int, height: int, style: str) -> bytes:
    rows: list[bytes] = []
    for y in range(height):
        row = bytearray()
        for x in range(width):
            if style == "terrain":
                # warm terrain-like gradient
                r = 210 - (60 * y // max(1, height - 1))
                g = 220 - (40 * y // max(1, height - 1))
                b = 180 - (30 * y // max(1, height - 1))
            else:
                # cool map-paper gradient
                r = 215 - (35 * y // max(1, height - 1))
                g = 230 - (30 * y // max(1, height - 1))
                b = 245 - (20 * y // max(1, height - 1))

            # faint grid every 128 px
            if x % 128 == 0 or y % 128 == 0:
                r = max(0, r - 30)
                g = max(0, g - 30)
                b = max(0, b - 30)

            # border frame
            if x < 4 or y < 4 or x >= width - 4 or y >= height - 4:
                r, g, b = (70, 70, 70)

            row.extend((r, g, b))
        rows.append(bytes(row))
    return _png_from_rgb(width, height, rows)


def main() -> None:
    out = Path(__file__).resolve().parents[1] / "data"
    out.mkdir(parents=True, exist_ok=True)

    files = {
        "offline-map-1080.png": _make_placeholder(1920, 1280, style="default"),
        "offline-map-1080-terrain.png": _make_placeholder(1920, 1280, style="terrain"),
    }

    for name, payload in files.items():
        target = out / name
        target.write_bytes(payload)
        print(f"wrote {target} ({len(payload)} bytes)")


if __name__ == "__main__":
    main()
