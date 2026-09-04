#!/usr/bin/env python3
"""
Classical CV misalignment probe (no trained YOLO weights required).

Principle (same as Visual AI demos / BeltWatch):
  1. Find left/right belt edge x-positions in each frame
  2. Compare belt centre to a fixed reference centre (frame mid or calibrated)
  3. Convert pixel offset -> wander mm via pixels_per_mm
  4. Emit trend + annotated sample frames

This answers: can we SEE misalignment signal in real conveyor video?
The Next.js mock API does not read pixels; this script does.
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

import cv2
import numpy as np


def find_edges(
    gray: np.ndarray,
    bgr: np.ndarray | None = None,
    y0: float = 0.30,
    y1: float = 0.78,
) -> tuple[float, float, float] | None:
    """
    Return (edge_l, edge_r, conf) in pixel x, or None if unreliable.

    Strategy: dark-belt mask in a mid band (ore/coal on black belt), then
    take left/right extents. Falls back to Sobel peaks if mask is weak.
    """
    h, w = gray.shape
    y_a, y_b = int(h * y0), int(h * y1)
    band = gray[y_a:y_b, :]
    if band.size == 0:
        return None

    # Dark material / belt body
    dark = (band < 70).astype(np.uint8) * 255
    dark = cv2.morphologyEx(dark, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    dark = cv2.morphologyEx(dark, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    col = np.mean(dark, axis=0)
    active = np.where(col > 25)[0]
    if active.size > w * 0.12:
        lx = float(active[0])
        rx = float(active[-1])
        # Trim extreme outliers from thin noise spikes
        width = rx - lx
        if width > w * 0.18:
            conf = float(min(1.0, active.size / (w * 0.5)))
            return lx, rx, conf

    # Fallback: Sobel energy peaks
    blur = cv2.GaussianBlur(band, (5, 5), 0)
    sobel = cv2.Sobel(blur, cv2.CV_32F, 1, 0, ksize=3)
    energy = np.mean(np.abs(sobel), axis=0)
    mid = w // 2
    left = energy[:mid].copy()
    right = energy[mid:].copy()
    margin = max(5, w // 40)
    left[:margin] = 0
    right[-margin:] = 0
    if left.max() < 2 or right.max() < 2:
        return None
    lx = float(np.argmax(left))
    rx = float(mid + np.argmax(right))
    conf = float(min(1.0, (left.max() + right.max()) / (2 * 40.0)))
    if rx - lx < w * 0.15:
        return None
    return lx, rx, conf


def annotate(
    frame: np.ndarray,
    edge_l: float,
    edge_r: float,
    ref_c: float,
    wander_mm: float,
    status: str,
) -> np.ndarray:
    out = frame.copy()
    h, w = out.shape[:2]
    belt_c = (edge_l + edge_r) / 2

    cv2.line(out, (int(edge_l), int(h * 0.1)), (int(edge_l), int(h * 0.9)), (46, 230, 214), 2)
    cv2.line(out, (int(edge_r), int(h * 0.1)), (int(edge_r), int(h * 0.9)), (46, 230, 214), 2)

    # Magenta dashed centreline ref
    for y in range(int(h * 0.08), int(h * 0.92), 12):
        cv2.line(out, (int(ref_c), y), (int(ref_c), min(y + 6, h)), (239, 70, 217), 2)

    if status in ("watch", "alarm"):
        side_edge = edge_r if belt_c >= ref_c else edge_l
        x0 = int(min(side_edge, ref_c) - 4)
        x1 = int(max(side_edge, ref_c) + 4)
        cv2.rectangle(out, (x0, int(h * 0.22)), (x1, int(h * 0.78)), (0, 215, 255), 2)
        cv2.putText(
            out,
            "Misalignment",
            (x0, int(h * 0.22) - 8),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 215, 255),
            2,
            cv2.LINE_AA,
        )
        cv2.putText(
            out,
            "Belt Misalignment Detected",
            (w - 420, 36),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 215, 255) if status == "watch" else (60, 60, 255),
            2,
            cv2.LINE_AA,
        )

    cv2.putText(
        out,
        f"Wander {wander_mm:+.1f} mm  [{status}]",
        (16, 36),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (230, 230, 230),
        2,
        cv2.LINE_AA,
    )
    return out


def status_for(mm: float, watch: float, alarm: float) -> str:
    a = abs(mm)
    if a >= alarm:
        return "alarm"
    if a >= watch:
        return "watch"
    return "ok"


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--video", required=True)
    p.add_argument("--out", default="ml/runs/misalignment_probe")
    p.add_argument("--pixels-per-mm", type=float, default=0.35)
    p.add_argument("--watch-mm", type=float, default=10.0)
    p.add_argument("--alarm-mm", type=float, default=15.0)
    p.add_argument("--every", type=int, default=5, help="Sample every Nth frame")
    p.add_argument("--max-frames", type=int, default=120)
    p.add_argument("--ref", choices=["median", "frame"], default="median")
    args = p.parse_args()

    video = Path(args.video)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    frames_dir = out_dir / "frames"
    frames_dir.mkdir(exist_ok=True)

    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise SystemExit(f"Cannot open {video}")

    rows: list[dict] = []
    centres: list[float] = []
    idx = 0
    sampled = 0

    # First pass collect centres for median reference if requested
    preview_centres: list[float] = []
    while sampled < min(40, args.max_frames):
        ok, frame = cap.read()
        if not ok:
            break
        if idx % args.every != 0:
            idx += 1
            continue
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        edges = find_edges(gray, frame)
        if edges:
            preview_centres.append((edges[0] + edges[1]) / 2)
        sampled += 1
        idx += 1

    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
    idx = 0
    sampled = 0
    # Baseline = early-frame median (aligned-ish), not full-clip median (which hides drift)
    early = preview_centres[: max(5, len(preview_centres) // 4)] or preview_centres
    median_ref = float(np.median(early)) if early else None

    while sampled < args.max_frames:
        ok, frame = cap.read()
        if not ok:
            break
        if idx % args.every != 0:
            idx += 1
            continue

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        edges = find_edges(gray, frame)
        h, w = gray.shape
        frame_ref = w / 2.0
        ref = median_ref if (args.ref == "median" and median_ref is not None) else frame_ref

        if edges is None:
            rows.append(
                {
                    "frame": idx,
                    "ok": False,
                    "wander_mm": None,
                    "status": "offline",
                    "conf": 0.0,
                }
            )
        else:
            el, er, conf = edges
            belt_c = (el + er) / 2
            centres.append(belt_c)
            wander_px = belt_c - ref
            wander_mm = round(wander_px / args.pixels_per_mm, 2)
            st = status_for(wander_mm, args.watch_mm, args.alarm_mm)
            rows.append(
                {
                    "frame": idx,
                    "ok": True,
                    "edge_l": round(el, 1),
                    "edge_r": round(er, 1),
                    "belt_c": round(belt_c, 1),
                    "ref_c": round(ref, 1),
                    "wander_px": round(wander_px, 2),
                    "wander_mm": wander_mm,
                    "status": st,
                    "conf": round(conf, 3),
                }
            )
            if sampled % 8 == 0:
                ann = annotate(frame, el, er, ref, wander_mm, st)
                cv2.imwrite(str(frames_dir / f"frame_{idx:05d}.jpg"), ann)

        sampled += 1
        idx += 1

    cap.release()

    valid = [r for r in rows if r.get("ok")]
    wander_series = [r["wander_mm"] for r in valid]
    summary = {
        "video": str(video),
        "sampled_frames": sampled,
        "valid_edge_frames": len(valid),
        "pixels_per_mm": args.pixels_per_mm,
        "ref_mode": args.ref,
        "watch_mm": args.watch_mm,
        "alarm_mm": args.alarm_mm,
        "wander_mm_mean": round(float(np.mean(wander_series)), 2) if wander_series else None,
        "wander_mm_std": round(float(np.std(wander_series)), 2) if wander_series else None,
        "wander_mm_min": round(float(np.min(wander_series)), 2) if wander_series else None,
        "wander_mm_max": round(float(np.max(wander_series)), 2) if wander_series else None,
        "watch_or_alarm_frames": sum(1 for r in valid if r["status"] in ("watch", "alarm")),
        "alarm_frames": sum(1 for r in valid if r["status"] == "alarm"),
        "note": (
            "Median-ref measures drift relative to the belt's own typical centre "
            "(good for gradual wander). Frame-ref measures offset from image centre "
            "(needs camera aimed at true structure centreline)."
        ),
    }

    with (out_dir / "summary.json").open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    with (out_dir / "series.csv").open("w", newline="", encoding="utf-8") as f:
        if rows:
            writer = csv.DictWriter(f, fieldnames=sorted({k for r in rows for k in r}))
            writer.writeheader()
            writer.writerows(rows)

    print(json.dumps(summary, indent=2))
    print(f"Wrote {out_dir / 'summary.json'} and annotated frames in {frames_dir}")


if __name__ == "__main__":
    main()
