#!/usr/bin/env python3
import os, shutil
from pathlib import Path
from roboflow import Roboflow

ROOT = Path(__file__).resolve().parents[2]
jobs = [
    ("splice", "fyp-lnegm", "conveyor-belt-x0o7y", 1),
    ("oversize", "object-detection-7whki", "conveyor-belt-2oejd", 2),
]

# get key from env or .env.txt
key = os.environ.get("ROBOFLOW_API_KEY", "").strip()
if not key:
    for line in (ROOT / ".env.txt").read_text(encoding="utf-8").splitlines():
        if line.startswith("ROBOFLOW_API_KEY="):
            key = line.split("=", 1)[1].strip().strip('"').strip("'")

rf = Roboflow(api_key=key)
for task, ws, proj, ver in jobs:
    out = ROOT / "ml" / "datasets" / task / f"rf_{proj.replace('-', '_')}_v{ver}"
    if out.exists():
        shutil.rmtree(out, ignore_errors=True)
    out.mkdir(parents=True, exist_ok=True)
    print("DL", task, flush=True)
    ds = rf.workspace(ws).project(proj).version(ver).download("yolov8", location=str(out))
    loc = Path(ds.location)
    yamls = list(loc.rglob("data.yaml")) + list(out.rglob("data.yaml"))
    print("loc", loc, "yamls", yamls, "nfiles", len(list(out.rglob("*"))), flush=True)
    if not yamls:
        raise SystemExit(f"no yaml for {task}")
