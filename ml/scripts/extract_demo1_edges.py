#!/usr/bin/env python3
"""
Extract real belt-edge tracks from Demo1 along-belt footage.

Finds left/right transitions between bright structure and dark belt body,
ignores neon marketing overlays, writes JSON timeline + QA frames.
"""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np


def suppress_neon(bgr: np.ndarray, gray: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    sat = hsv[:, :, 1]
    val = hsv[:, :, 2]
    neon = (sat > 100) & (val > 80)
    out = gray.copy()
    out[neon] = np.median(gray)
    return out


def find_belt_edges(bgr: np.ndarray) -> dict | None:
    h, w = bgr.shape[:2]
    y0, y1 = int(h * 0.32), int(h * 0.78)
    roi = bgr[y0:y1]
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    work = suppress_neon(roi, gray)
    blur = cv2.GaussianBlur(work, (9, 9), 0)

    # Column stats
    col_mean = blur.mean(axis=0).astype(np.float32)
    col_mean = np.convolve(col_mean, np.ones(31) / 31, mode="same")

    # Left belt edge: coming from left bright structure into darker belt
    # Search first 55% for strongest bright->dark step (negative gradient of mean)
    grad = np.gradient(col_mean)
    left_zone = np.zeros_like(grad)
    left_zone[int(w * 0.01) : int(w * 0.50)] = -grad[int(w * 0.01) : int(w * 0.50)]
    # Prefer steps into darkness (destination darker than ~90)
    for i in range(int(w * 0.01), int(w * 0.50)):
        if col_mean[min(i + 20, w - 1)] > 100:
            left_zone[i] *= 0.2

    right_zone = np.zeros_like(grad)
    right_zone[int(w * 0.50) : int(w * 0.99)] = grad[int(w * 0.50) : int(w * 0.99)]
    for i in range(int(w * 0.50), int(w * 0.99)):
        if col_mean[max(i - 20, 0)] > 100:
            right_zone[i] *= 0.2

    lx = int(np.argmax(left_zone))
    rx = int(np.argmax(right_zone))

    if rx < lx + int(w * 0.25):
        # Fallback: dark mask extents with border trim
        dark = (blur < 85).astype(np.uint8) * 255
        dark = cv2.morphologyEx(dark, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
        col = dark.mean(axis=0)
        active = np.where(col > 40)[0]
        if active.size < 20:
            return None
        lx, rx = int(active[0]), int(active[-1])

    # Structure centreline estimate: midpoint of aligned envelope is unstable;
    # use rolling median of belt centre as soft ref, UI also has fixed 50 for demo.
    belt_c = (lx + rx) / 2
    conf = float(
        min(
            1.0,
            (float(left_zone[lx]) + float(right_zone[rx])) / (2 * 8.0 + 1e-6),
        )
    )
    return {
        "edgeL": round(100.0 * lx / w, 2),
        "edgeR": round(100.0 * rx / w, 2),
        "beltC": round(100.0 * belt_c / w, 2),
        "conf": round(max(0.0, min(1.0, conf)), 3),
    }


def annotate(bgr: np.ndarray, e: dict, centre: float) -> np.ndarray:
    out = bgr.copy()
    h, w = out.shape[:2]
    for key, color in (("edgeL", (214, 230, 46)), ("edgeR", (214, 230, 46))):
        x = int(w * e[key] / 100)
        cv2.line(out, (x, int(h * 0.08)), (x, int(h * 0.92)), color, 3)
    cx = int(w * centre / 100)
    for y in range(int(h * 0.08), int(h * 0.92), 14):
        cv2.line(out, (cx, y), (cx, min(y + 7, h)), (217, 70, 239), 2)
    cv2.putText(
        out,
        f"L {e['edgeL']:.1f}%  R {e['edgeR']:.1f}%  C {centre:.1f}%",
        (24, 48),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.2,
        (240, 240, 240),
        2,
        cv2.LINE_AA,
    )
    return out


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    video = root / "public" / "samples" / "demo1-misalignment.mp4"
    out_json = root / "public" / "samples" / "demo1-edges.json"
    qa_dir = root / "ml" / "runs" / "demo1_edges" / "frames"
    qa_dir.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise SystemExit(f"Cannot open {video}")
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 30)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    rows: list[dict] = []
    idx = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        e = find_belt_edges(frame)
        if e:
            rows.append({"t": round(idx / fps, 3), "frame": idx, **e})
            if idx % 30 == 0:
                # Fixed structure centre from early median belt centre later
                cv2.imwrite(
                    str(qa_dir / f"qa_{idx:04d}.jpg"),
                    annotate(frame, e, 50.0),
                )
        idx += 1
    cap.release()

    if not rows:
        raise SystemExit("No detections")

    # This along-belt camera: structure centreline is at frame mid (~50%).
    centre = 50.0

    # Reject impossible edges (ore pile / overlay false peaks)
    for r in rows:
        r["edgeL"] = float(np.clip(r["edgeL"], 2.0, 40.0))
        r["edgeR"] = float(np.clip(r["edgeR"], 88.0, 99.5))

    # Temporal median then mean smooth
    def smooth(key: str, win: int = 7) -> None:
        vals = np.array([r[key] for r in rows], dtype=np.float32)
        half = win // 2
        out = vals.copy()
        for i in range(len(vals)):
            lo, hi = max(0, i - half), min(len(vals), i + half + 1)
            out[i] = float(np.median(vals[lo:hi]))
        k = np.ones(5) / 5
        out = np.convolve(out, k, mode="same")
        for i, r in enumerate(rows):
            r[key] = round(float(out[i]), 2)

    smooth("edgeL")
    smooth("edgeR")
    for r in rows:
        r["edgeL"] = float(np.clip(r["edgeL"], 2.0, 40.0))
        r["edgeR"] = float(np.clip(r["edgeR"], 88.0, 99.5))
        r["beltC"] = round((r["edgeL"] + r["edgeR"]) / 2, 2)
        r["centre"] = centre
        # ~1600 mm spans typical aligned width (~87% of frame)
        aligned_w = 87.0
        pct_to_mm = 1600.0 / aligned_w
        r["wanderMm"] = round((r["beltC"] - centre) * pct_to_mm, 1)

    payload = {
        "video": "demo1-misalignment.mp4",
        "fps": fps,
        "width": w,
        "height": h,
        "centre": round(centre, 2),
        "method": "structure-to-belt gradient (neon overlays suppressed)",
        "frames": rows,
    }
    out_json.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    els = [r["edgeL"] for r in rows]
    ers = [r["edgeR"] for r in rows]
    print(
        json.dumps(
            {
                "frames": len(rows),
                "edgeL": {
                    "mean": round(float(np.mean(els)), 1),
                    "std": round(float(np.std(els)), 1),
                    "min": round(float(np.min(els)), 1),
                    "max": round(float(np.max(els)), 1),
                },
                "edgeR": {
                    "mean": round(float(np.mean(ers)), 1),
                    "std": round(float(np.std(ers)), 1),
                    "min": round(float(np.min(ers)), 1),
                    "max": round(float(np.max(ers)), 1),
                },
                "centre": centre,
                "out": str(out_json),
                "qa": str(qa_dir),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
