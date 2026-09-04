#!/usr/bin/env python3
"""
Run kickstart YOLO weights on Demo1 video; write timeline JSON for the UI.

Output: public/samples/demo1-yolo.json
  frames[].boxes = [{x,y,w,h,label,conf,kind}] in % of frame
"""

from __future__ import annotations

import json
from pathlib import Path

import cv2
from ultralytics import YOLO

ROOT = Path(__file__).resolve().parents[2]
VIDEO = ROOT / "public" / "samples" / "demo1-misalignment.mp4"
WEIGHTS = ROOT / "ml" / "weights" / "misalignment" / "best.pt"
EDGES = ROOT / "public" / "samples" / "demo1-edges.json"
OUT = ROOT / "public" / "samples" / "demo1-yolo.json"


def main() -> None:
    if not WEIGHTS.exists():
        raise SystemExit(f"Missing weights: {WEIGHTS}")
    if not VIDEO.exists():
        raise SystemExit(f"Missing video: {VIDEO}")

    edges = json.loads(EDGES.read_text(encoding="utf-8")) if EDGES.exists() else {"frames": []}
    edge_by_t = {round(float(f["t"]), 3): f for f in edges.get("frames", [])}

    model = YOLO(str(WEIGHTS))
    cap = cv2.VideoCapture(str(VIDEO))
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 30)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    rows = []
    idx = 0
    # every 2nd frame keeps file small and UI smooth enough
    step = 2
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if idx % step != 0:
            idx += 1
            continue
        t = round(idx / fps, 3)
        pred = model.predict(frame, imgsz=320, device="cpu", verbose=False)[0]
        boxes = []
        if pred.boxes is not None:
            for b in pred.boxes:
                cls_id = int(b.cls[0])
                conf = float(b.conf[0])
                if conf < 0.25:
                    continue
                x1, y1, x2, y2 = b.xyxy[0].tolist()
                boxes.append(
                    {
                        "x": round(100.0 * x1 / w, 2),
                        "y": round(100.0 * y1 / h, 2),
                        "w": round(100.0 * (x2 - x1) / w, 2),
                        "h": round(100.0 * (y2 - y1) / h, 2),
                        "label": f"{pred.names[cls_id]} {conf:.2f}",
                        "kind": "misalignment",
                        "conf": round(conf, 3),
                        "cls": pred.names[cls_id],
                    }
                )

        edge = edge_by_t.get(t)
        # nearest edge sample if exact miss
        if edge is None and edges.get("frames"):
            edge = min(edges["frames"], key=lambda f: abs(float(f["t"]) - t))

        rows.append(
            {
                "t": t,
                "frame": idx,
                "boxes": boxes,
                "edgeL": edge.get("edgeL") if edge else None,
                "edgeR": edge.get("edgeR") if edge else None,
                "centre": edge.get("centre", 50) if edge else 50,
                "wanderMm": edge.get("wanderMm", 0) if edge else 0,
            }
        )
        idx += 1

    cap.release()
    payload = {
        "video": "demo1-misalignment.mp4",
        "weights": "ml/weights/misalignment/best.pt",
        "fps": fps,
        "width": w,
        "height": h,
        "step": step,
        "mode": "model",
        "frames": rows,
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    with_boxes = sum(1 for r in rows if r["boxes"])
    print(
        json.dumps(
            {
                "frames": len(rows),
                "with_boxes": with_boxes,
                "out": str(OUT),
                "weights": str(WEIGHTS),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
