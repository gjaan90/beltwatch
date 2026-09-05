#!/usr/bin/env python3
"""
Overnight CPU training from Roboflow Universe exports.

Usage:
  set ROBOFLOW_API_KEY=...
  set ROBOFLOW_WORKSPACE=your-workspace   # optional for private; Universe uses project owner
  python ml/scripts/overnight_roboflow_train.py

Efficient defaults for this laptop (CPU, YOLOv8n, imgsz=320, batch=2).
"""

from __future__ import annotations

import json
import os
import shutil
import sys
import time
import traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LOG = ROOT / "ml" / "runs" / "overnight_train.log"
STATUS = ROOT / "ml" / "runs" / "overnight_status.json"

# Public Universe bootstrap sets (small enough for overnight CPU)
JOBS = [
    {
        "task": "misalignment",
        "workspace": "quality-control-defect-detection",
        "project": "misaligned-conveyor-belts",
        "version": 1,
        "epochs": 40,
        "model": "yolov8n.pt",
    },
    {
        "task": "splice",
        "workspace": "fyp-lnegm",
        "project": "conveyor-belt-x0o7y",
        "version": 1,
        "epochs": 40,
        "model": "yolov8n.pt",
    },
    {
        "task": "oversize",
        # generic conveyor objects — kickstart only
        "workspace": "object-detection-7whki",
        "project": "conveyor-belt-2oejd",
        "version": 2,
        "epochs": 30,
        "model": "yolov8n.pt",
    },
]


def log(msg: str) -> None:
    LOG.parent.mkdir(parents=True, exist_ok=True)
    line = f"{time.strftime('%Y-%m-%d %H:%M:%S')} {msg}"
    print(line, flush=True)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def write_status(payload: dict) -> None:
    STATUS.parent.mkdir(parents=True, exist_ok=True)
    STATUS.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def download(job: dict) -> Path:
    from roboflow import Roboflow

    key = os.environ.get("ROBOFLOW_API_KEY", "").strip()
    if not key:
        raise SystemExit("ROBOFLOW_API_KEY not set")

    task_root = ROOT / "ml" / "datasets" / job["task"]
    task_root.mkdir(parents=True, exist_ok=True)

    # Reuse Roboflow exports only (ignore local stub data.yaml)
    for p in task_root.rglob("data.yaml"):
        parent = p.parent
        if parent.name in {"images", "labels"}:
            continue
        if (parent / "train").exists() or (parent / "valid").exists():
            _fix_yaml_paths(p)
            return p

    # Roboflow fails if target leaf dir is pre-created empty — download into task_root
    rf = Roboflow(api_key=key)
    project = rf.workspace(job["workspace"]).project(job["project"])
    version = project.version(job["version"])
    log(f"downloading into {task_root}")
    cwd = Path.cwd()
    try:
        os.chdir(task_root)
        ds = version.download("yolov8")
    finally:
        os.chdir(cwd)
    loc = Path(getattr(ds, "location", task_root))
    if not loc.is_absolute():
        loc = (task_root / loc).resolve()
    time.sleep(0.5)
    candidates = list(loc.rglob("data.yaml")) + list(task_root.rglob("data.yaml"))
    data_yaml = next(
        (
            p
            for p in candidates
            if p.name == "data.yaml"
            and ((p.parent / "train").exists() or (p.parent / "valid").exists())
        ),
        None,
    )
    if data_yaml is None:
        raise FileNotFoundError(f"data.yaml missing after download (loc={loc})")
    _fix_yaml_paths(data_yaml)
    log(f"using dataset yaml {data_yaml}")
    return data_yaml


def _fix_yaml_paths(data_yaml: Path) -> None:
    """Point train/val at real folders next to the yaml."""
    import yaml

    raw = yaml.safe_load(data_yaml.read_text(encoding="utf-8")) or {}
    root = data_yaml.parent
    raw["path"] = root.as_posix()

    def resolve_split(name: str) -> str | None:
        for cand in (
            root / name / "images",
            root / name,
            root / "images" / name,
        ):
            if cand.exists():
                return cand.relative_to(root).as_posix()
        return None

    train = resolve_split("train")
    valid = resolve_split("valid") or resolve_split("val")
    test = resolve_split("test")
    if train:
        raw["train"] = train
    if valid:
        raw["val"] = valid
        raw["valid"] = valid
    if test:
        raw["test"] = test
    data_yaml.write_text(yaml.dump(raw, sort_keys=False), encoding="utf-8")


def train(job: dict, data_yaml: Path) -> Path:
    from ultralytics import YOLO

    weights_dir = ROOT / "ml" / "weights" / job["task"]
    weights_dir.mkdir(parents=True, exist_ok=True)
    model = YOLO(job["model"])
    results = model.train(
        data=str(data_yaml),
        epochs=int(job["epochs"]),
        imgsz=320,
        batch=2,
        device="cpu",
        workers=0,
        project=str(ROOT / "ml" / "weights"),
        name=job["task"],
        exist_ok=True,
        patience=12,
        verbose=True,
    )
    best = Path(results.save_dir) / "weights" / "best.pt"
    dest = weights_dir / "best.pt"
    if best.exists():
        shutil.copy2(best, dest)
    return dest


def main() -> int:
    log("OVERNIGHT START")
    write_status({"state": "running", "jobs": [], "started": time.time()})
    done = []
    try:
        for job in JOBS:
            log(f"JOB start {job['task']} {job['workspace']}/{job['project']}")
            write_status(
                {
                    "state": "running",
                    "current": job["task"],
                    "done": done,
                    "started": time.time(),
                }
            )
            try:
                data_yaml = download(job)
                log(f"JOB downloaded {job['task']} -> {data_yaml}")
                dest = train(job, data_yaml)
                log(f"JOB done {job['task']} weights={dest} exists={dest.exists()}")
                done.append({"task": job["task"], "ok": True, "weights": str(dest)})
            except Exception as e:
                log(f"JOB FAIL {job['task']}: {e}")
                log(traceback.format_exc())
                done.append({"task": job["task"], "ok": False, "error": str(e)})
                # continue remaining jobs
                continue

        write_status({"state": "done", "done": done, "finished": time.time()})
        failed = [d for d in done if not d.get("ok")]
        if failed:
            log(f"OVERNIGHT DONE WITH FAILURES {len(failed)}")
            print("FAILED: overnight finished with job failures", flush=True)
            return 1
        log("OVERNIGHT DONE OK")
        print("DONE: overnight Roboflow training complete", flush=True)
        return 0
    except Exception as e:
        log(f"OVERNIGHT CRASH {e}")
        log(traceback.format_exc())
        write_status({"state": "failed", "error": str(e), "done": done})
        print(f"FAILED: {e}", flush=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
