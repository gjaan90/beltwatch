#!/usr/bin/env python3
"""
Kickstart dataset from Demo1 along-belt video + edge track.

Creates YOLO detect labels:
  0 = belt   (box spanning detected left/right edges in mid band)
  1 = centre_ref (thin box on structure centreline — optional cue)

Not production labels — enough to prove local train pipeline on this machine.
"""

from __future__ import annotations

import json
import random
import shutil
from pathlib import Path

import cv2


ROOT = Path(__file__).resolve().parents[2]
VIDEO = ROOT / "public" / "samples" / "demo1-misalignment.mp4"
EDGES = ROOT / "public" / "samples" / "demo1-edges.json"
OUT = ROOT / "ml" / "datasets" / "misalignment"


def main() -> None:
    track = json.loads(EDGES.read_text(encoding="utf-8"))
    frames = track["frames"]
    by_idx = {int(f["frame"]): f for f in frames}

    for split in ("train", "val"):
        (OUT / "images" / split).mkdir(parents=True, exist_ok=True)
        (OUT / "labels" / split).mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(str(VIDEO))
    if not cap.isOpened():
        raise SystemExit(f"Cannot open {VIDEO}")

    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    # Sample ~1 fps equivalent from 30fps → every 30th, keep ~45 images
    step = 6
    saved = []
    idx = 0
    while True:
        ok, img = cap.read()
        if not ok:
            break
        if idx % step != 0:
            idx += 1
            continue
        meta = by_idx.get(idx)
        if not meta:
            idx += 1
            continue

        h, w = img.shape[:2]
        # Resize for light training
        target_w = 640
        scale = target_w / w
        small = cv2.resize(img, (target_w, int(h * scale)))
        sh, sw = small.shape[:2]

        el = meta["edgeL"] / 100.0
        er = meta["edgeR"] / 100.0
        # Belt box: mid vertical band between edges
        x1, x2 = min(el, er), max(el, er)
        y1, y2 = 0.25, 0.85
        cx = (x1 + x2) / 2
        cy = (y1 + y2) / 2
        bw = max(0.05, x2 - x1)
        bh = y2 - y1

        # Centreline cue box (narrow)
        cc = (meta.get("centre") or 50) / 100.0
        lines = [
            f"0 {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}",
            f"1 {cc:.6f} {cy:.6f} {0.01:.6f} {bh:.6f}",
        ]

        name = f"demo1_{idx:05d}"
        saved.append((name, small, "\n".join(lines) + "\n"))
        idx += 1

    cap.release()
    random.seed(7)
    random.shuffle(saved)
    n_val = max(4, len(saved) // 5)
    val_set = set(range(n_val))

    for i, (name, img, label) in enumerate(saved):
        split = "val" if i in val_set else "train"
        cv2.imwrite(str(OUT / "images" / split / f"{name}.jpg"), img)
        (OUT / "labels" / split / f"{name}.txt").write_text(label, encoding="utf-8")

    yaml = f"""# Demo1 kickstart — local along-belt frames
path: {OUT.as_posix()}
train: images/train
val: images/val

names:
  0: belt
  1: centre_ref
"""
    (OUT / "data.yaml").write_text(yaml, encoding="utf-8")
    print(
        json.dumps(
            {
                "images": len(saved),
                "train": len(saved) - n_val,
                "val": n_val,
                "out": str(OUT),
                "data_yaml": str(OUT / "data.yaml"),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
