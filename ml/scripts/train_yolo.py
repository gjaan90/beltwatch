#!/usr/bin/env python3
"""Train YOLO detect/seg models for BeltSight detectors."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


TASK_CFG = {
    "misalignment": {
        "model": "yolov8s-seg.pt",
        "weights_dir": "ml/weights/misalignment",
    },
    "oversize": {
        "model": "yolov8s.pt",
        "weights_dir": "ml/weights/oversize",
    },
    "splice": {
        "model": "yolov8s.pt",
        "weights_dir": "ml/weights/splice",
    },
}


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--task", required=True, choices=TASK_CFG.keys())
    p.add_argument("--data", required=True, help="Path to data.yaml")
    p.add_argument("--model", default="", help="Base checkpoint override")
    p.add_argument("--epochs", type=int, default=100)
    p.add_argument("--imgsz", type=int, default=640)
    p.add_argument("--batch", type=int, default=8)
    p.add_argument("--device", default="")
    args = p.parse_args()

    cfg = TASK_CFG[args.task]
    model_name = args.model or cfg["model"]
    weights_dir = Path(cfg["weights_dir"])
    weights_dir.mkdir(parents=True, exist_ok=True)

    data = Path(args.data)
    if not data.exists():
        raise SystemExit(
            f"Missing {data}. Export from Roboflow first, or copy a starter data.yaml."
        )

    from ultralytics import YOLO

    model = YOLO(model_name)
    train_kwargs = dict(
        data=str(data),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        project=str(weights_dir.parent),
        name=weights_dir.name,
        exist_ok=True,
    )
    if args.device:
        train_kwargs["device"] = args.device

    results = model.train(**train_kwargs)
    best = Path(results.save_dir) / "weights" / "best.pt"
    dest = weights_dir / "best.pt"
    if best.exists():
        shutil.copy2(best, dest)
        print(f"Copied best weights → {dest}")
    else:
        print(f"Training finished; expected weights at {best}")


if __name__ == "__main__":
    main()
