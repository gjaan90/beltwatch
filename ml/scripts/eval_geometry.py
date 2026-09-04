#!/usr/bin/env python3
"""
Evaluate misalignment as millimetre wander, not only mask mAP.

Given predicted belt edge x-positions and idler references (pixels),
wander_mm = (belt_centre - idler_centre) / pixels_per_mm.

This script runs a lightweight stub when no labeled edge CSV is present,
and prints the geometry formula used by BeltSight Settings.
"""

from __future__ import annotations

import argparse
import csv
import math
from pathlib import Path


def wander_mm(
    edge_l: float,
    edge_r: float,
    idler_l: float,
    idler_r: float,
    pixels_per_mm: float,
) -> float:
    belt_c = (edge_l + edge_r) / 2.0
    idler_c = (idler_l + idler_r) / 2.0
    return round((belt_c - idler_c) / pixels_per_mm, 2)


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--weights", default="ml/weights/misalignment/best.pt")
    p.add_argument("--data", default="ml/datasets/misalignment/data.yaml")
    p.add_argument("--pixels-per-mm", type=float, default=0.42)
    p.add_argument(
        "--labels-csv",
        default="",
        help="CSV with columns: edge_l,edge_r,idler_l,idler_r,gt_wander_mm",
    )
    args = p.parse_args()

    print("BeltSight misalignment geometry")
    print(f"  weights: {args.weights} (exists={Path(args.weights).exists()})")
    print(f"  data:    {args.data} (exists={Path(args.data).exists()})")
    print(f"  scale:   {args.pixels_per_mm} px/mm")
    print()
    print("Formula: wander_mm = (beltCentre_px - idlerCentre_px) / pixels_per_mm")

    # Demo identity check
    demo = wander_mm(100, 500, 120, 520, args.pixels_per_mm)
    print(f"Demo (edges 100/500, idlers 120/520) → {demo} mm")

    labels = Path(args.labels_csv) if args.labels_csv else None
    if not labels or not labels.exists():
        print()
        print("No labels CSV — skipping MAE. Provide --labels-csv for plant eval.")
        print("When weights exist, run seg inference, extract mask edges, then this metric.")
        return

    errs: list[float] = []
    with labels.open(newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            pred = wander_mm(
                float(row["edge_l"]),
                float(row["edge_r"]),
                float(row["idler_l"]),
                float(row["idler_r"]),
                args.pixels_per_mm,
            )
            gt = float(row["gt_wander_mm"])
            errs.append(abs(pred - gt))

    mae = sum(errs) / len(errs)
    rmse = math.sqrt(sum(e * e for e in errs) / len(errs))
    print(f"n={len(errs)}  MAE={mae:.2f} mm  RMSE={rmse:.2f} mm")


if __name__ == "__main__":
    main()
