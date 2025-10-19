#!/usr/bin/env python3
"""Copy essential images from images/ to static/images/"""
import shutil
from pathlib import Path

# Source and destination
src_dir = Path("images")
dst_dir = Path("static/images")

# Ensure destination exists
dst_dir.mkdir(parents=True, exist_ok=True)

# Files to copy
patterns = [
    "boys_avatar*.jpg",
    "boys_avatar*.JPG",
    "girls_avatar*.jpg",
    "grade*_icon.jpg",
    "fluent*.png",
    "fluent*.jpg"
]

copied_count = 0
for pattern in patterns:
    for src_file in src_dir.glob(pattern):
        dst_file = dst_dir / src_file.name
        shutil.copy2(src_file, dst_file)
        print(f"✓ Copied: {src_file.name}")
        copied_count += 1

print(f"\n✅ Total images copied: {copied_count}")
print(f"✅ Destination: {dst_dir.absolute()}")
