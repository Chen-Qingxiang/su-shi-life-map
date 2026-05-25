#!/usr/bin/env python3
"""Generate tiny placeholder offline PNG files without external deps.

This avoids committing binary files while still providing local offline assets.
"""
from pathlib import Path
import base64

PNG_1X1_WHITE = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z6YQAAAAASUVORK5CYII="
)

def main() -> None:
    out = Path(__file__).resolve().parents[1] / "data"
    out.mkdir(parents=True, exist_ok=True)
    for name in ("offline-map-1080.png", "offline-map-1080-terrain.png"):
        (out / name).write_bytes(PNG_1X1_WHITE)
        print(f"wrote {out / name}")

if __name__ == "__main__":
    main()
