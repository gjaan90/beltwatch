#!/usr/bin/env python3
"""Fine-tune misalignment YOLO on local Demo1 frames (CPU-friendly)."""

from __future__ import annotations

import shutil
from pathlib import Path

from ultralytics import YOLO

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "ml" / "datasets" / "misalignment" / "data.yaml"
BASE = ROOT / "ml" / "weights" / "misalignment" / "best.pt"
OUT_DIR = ROOT / "ml" / "weights" / "misalignment"


def main() -> None:
    if not DATA.exists():
        raise SystemExit("Run build_demo1_yolo_dataset.py first")
    weights = str(BASE) if BASE.exists() else "yolov8n.pt"
    model = YOLO(weights)
    results = model.train(
        data=str(DATA),
        epochs=40,
        imgsz=320,
        batch=2,
        device="cpu",
        workers=0,
        project=str(ROOT / "ml" / "runs"),
        name="misalignment_ft",
        exist_ok=True,
        patience=15,
        verbose=True,
    )
    best = Path(results.save_dir) / "weights" / "best.pt"
    dest = OUT_DIR / "best.pt"
    if best.exists():
        shutil.copy2(best, dest)
        print("COPIED", dest)
    print("DONE", results.save_dir)


if __name__ == "__main__":
    main()
