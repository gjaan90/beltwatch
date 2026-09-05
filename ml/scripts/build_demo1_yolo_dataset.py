#!/usr/bin/env python3
"""Build local Demo1 YOLO detect set from video + edge track (no Roboflow)."""

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
    by_idx = {int(f["frame"]): f for f in track["frames"]}

    for split in ("train", "val"):
        img_dir = OUT / "images" / split
        lbl_dir = OUT / "labels" / split
        if img_dir.exists():
            shutil.rmtree(img_dir)
        if lbl_dir.exists():
            shutil.rmtree(lbl_dir)
        img_dir.mkdir(parents=True, exist_ok=True)
        lbl_dir.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(str(VIDEO))
    if not cap.isOpened():
        raise SystemExit(f"Cannot open {VIDEO}")

    step = 3
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
        target_w = 640
        scale = target_w / w
        small = cv2.resize(img, (target_w, int(h * scale)))

        el, er = meta["edgeL"] / 100.0, meta["edgeR"] / 100.0
        x1, x2 = min(el, er), max(el, er)
        y1, y2 = 0.22, 0.88
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        bw, bh = max(0.05, x2 - x1), y2 - y1
        label = f"0 {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}\n"
        saved.append((f"demo1_{idx:05d}", small, label))
        idx += 1

    cap.release()
    random.seed(7)
    random.shuffle(saved)
    n_val = max(8, len(saved) // 5)
    for i, (name, img, label) in enumerate(saved):
        split = "val" if i < n_val else "train"
        cv2.imwrite(str(OUT / "images" / split / f"{name}.jpg"), img)
        (OUT / "labels" / split / f"{name}.txt").write_text(label, encoding="utf-8")

    (OUT / "data.yaml").write_text(
        f"""# Demo1 local fine-tune (no Roboflow)
path: {OUT.as_posix()}
train: images/train
val: images/val
names:
  0: belt
""",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "images": len(saved),
                "train": len(saved) - n_val,
                "val": n_val,
                "data_yaml": str(OUT / "data.yaml"),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
