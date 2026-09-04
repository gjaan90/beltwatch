#!/usr/bin/env python3
"""
Edge / sidecar inference stub.

Reads an image path, optionally loads YOLO weights, and prints JSON compatible
with BeltSight FrameInference (see src/lib/types.ts).

Without weights, emits a deterministic mock from belt geometry heuristics.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path


def mock_frame(conveyor_id: str, camera: str) -> dict:
    return {
        "conveyorId": conveyor_id,
        "camera": camera,
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "mode": "mock",
        "wanderMm": 11.0,
        "wanderStatus": "watch",
        "detectors": [
            {
                "kind": "misalignment",
                "label": "Misalignment",
                "status": "watch",
                "value": "+11 mm",
                "detail": "Belt outer edge vs idler centreline",
                "confidence": 0.9,
                "updatedAt": "live",
            },
            {
                "kind": "oversize",
                "label": "Oversized load",
                "status": "ok",
                "value": "Clear",
                "detail": "No lumps above threshold",
                "confidence": 0.85,
                "updatedAt": "live",
            },
            {
                "kind": "splice",
                "label": "Splice & clips",
                "status": "ok",
                "value": "Healthy",
                "detail": "No splice defects this frame",
                "confidence": 0.88,
                "updatedAt": "live",
            },
        ],
        "overlay": {
            "edgeL": 24.0,
            "edgeR": 78.0,
            "idlerL": 22.0,
            "idlerR": 78.0,
            "boxes": [],
        },
        "fps": 12,
        "latencyMs": 55,
    }


def try_yolo(image: Path, weights: Path) -> dict | None:
    if not weights.exists() or not image.exists():
        return None
    try:
        from ultralytics import YOLO
    except ImportError:
        return None

    model = YOLO(str(weights))
    t0 = time.time()
    results = model.predict(str(image), verbose=False)
    latency = int((time.time() - t0) * 1000)
    boxes = []
    for r in results:
        if r.boxes is None:
            continue
        names = r.names or {}
        for b in r.boxes:
            xyxy = b.xyxy[0].tolist()
            cls_id = int(b.cls[0])
            boxes.append(
                {
                    "x": xyxy[0],
                    "y": xyxy[1],
                    "w": xyxy[2] - xyxy[0],
                    "h": xyxy[3] - xyxy[1],
                    "label": names.get(cls_id, str(cls_id)),
                    "kind": "misalignment",
                }
            )
    frame = mock_frame("unknown", "CAM-1")
    frame["mode"] = "model"
    frame["latencyMs"] = latency
    frame["overlay"]["boxes"] = boxes[:12]
    return frame


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--image", default="")
    p.add_argument("--weights", default="ml/weights/misalignment/best.pt")
    p.add_argument("--conveyor", default="cv-07")
    p.add_argument("--camera", default="CAM-1")
    args = p.parse_args()

    frame = None
    if args.image:
        frame = try_yolo(Path(args.image), Path(args.weights))
    if frame is None:
        frame = mock_frame(args.conveyor, args.camera)

    print(json.dumps(frame, indent=2))


if __name__ == "__main__":
    main()
