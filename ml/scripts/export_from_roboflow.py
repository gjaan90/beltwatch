#!/usr/bin/env python3
"""Download a Roboflow dataset version into ml/datasets/<task> as YOLO format."""

from __future__ import annotations

import argparse
import os
import shutil
from pathlib import Path


TASK_DEFAULTS = {
    "misalignment": {"project": "beltsight-misalignment", "out": "ml/datasets/misalignment"},
    "oversize": {"project": "beltsight-oversize", "out": "ml/datasets/oversize"},
    "splice": {"project": "beltsight-splice-clips", "out": "ml/datasets/splice"},
}


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--task", choices=TASK_DEFAULTS.keys(), help="Preset task shortcuts")
    p.add_argument("--workspace", default=os.environ.get("ROBOFLOW_WORKSPACE", ""))
    p.add_argument("--project", default="")
    p.add_argument("--version", type=int, default=1)
    p.add_argument("--out", default="")
    p.add_argument("--format", default="yolov8", help="Roboflow export format")
    args = p.parse_args()

    if args.task:
        args.project = args.project or TASK_DEFAULTS[args.task]["project"]
        args.out = args.out or TASK_DEFAULTS[args.task]["out"]

    if not args.project or not args.out:
        p.error("Provide --task or both --project and --out")

    api_key = os.environ.get("ROBOFLOW_API_KEY")
    if not api_key:
        raise SystemExit("Set ROBOFLOW_API_KEY")

    if not args.workspace:
        raise SystemExit("Pass --workspace or set ROBOFLOW_WORKSPACE")

    from roboflow import Roboflow

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    rf = Roboflow(api_key=api_key)
    project = rf.workspace(args.workspace).project(args.project)
    version = project.version(args.version)
    ds = version.download(args.format, location=str(out / "_rf_download"))

    # Flatten common Roboflow YOLO layout into out/
    download_root = Path(ds.location)
    for name in ("data.yaml", "train", "valid", "test", "val"):
        src = download_root / name
        if src.exists():
            dest = out / name
            if dest.exists():
                if dest.is_dir():
                    shutil.rmtree(dest)
                else:
                    dest.unlink()
            shutil.move(str(src), str(dest))

    print(f"Exported {args.project} v{args.version} → {out}")
    yaml_path = out / "data.yaml"
    if yaml_path.exists():
        print(f"Train with: python ml/scripts/train_yolo.py --data {yaml_path}")


if __name__ == "__main__":
    main()
