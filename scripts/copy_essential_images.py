"""Copy a small set of essential images from top-level images/ into static/images/ if missing.
Run this locally or on Render at startup to ensure templates can load avatars and the logo.
"""
import os
from pathlib import Path

repo = Path(__file__).resolve().parents[1]
src = repo / 'images'
dst = repo / 'static' / 'images'
files_to_copy = ['fluent-oman-logo.png', 'boys_avatar2.jpg', 'boys_avatar1.JPG', 'girls_avatar1.jpg']

os.makedirs(dst, exist_ok=True)

copied = []
for name in files_to_copy:
    s = src / name
    d = dst / name
    if s.exists() and not d.exists():
        try:
            d.write_bytes(s.read_bytes())
            copied.append(name)
        except Exception:
            pass

print('Copied:', copied)
