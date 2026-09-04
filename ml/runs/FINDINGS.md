# Misalignment video probe — findings

Date: 2026-09-04

## Question

Can the current BeltWatch stack look at a real conveyor video and measure belt misalignment?

## What we tested

| Clip | Source | View |
|------|--------|------|
| `tmp-razor/ore_conveyor_clip.mp4` | YouTube ore conveyor (ATG) | Steep inclined / aerial-ish |
| `tmp-razor/mining_conveyor_clip.mp4` | Mae Moh mine Sempertrans | Wide site overview |
| `tmp-razor/misalignment.mp4` | Razor Labs marketing demo | Fixed along-belt camera + baked overlays |

Script: `ml/scripts/analyze_misalignment_video.py` (classical dark-belt mask + Sobel fallback → wander mm).

## Results

1. **BeltWatch web app (current code)**  
   Does **not** read video pixels. `/api/inference/[id]` returns a **mock** wander value. The viewport only **displays** overlays on top of a demo clip.

2. **Classical CV probe on stock/YouTube clips**  
   **Not reliable** for mm misalignment. Cameras pan / show whole sites / wrong angle. Edge finder often snaps to frame borders or structure, producing huge false wander (hundreds of mm).

3. **Razor marketing clip**  
   Looks like the product UX we want, but baked-in teal overlay lines confuse classical edge finding. Not a clean raw training/test stream.

## What works for real detection

Same principle as DataMind Visual AI, but with the right inputs:

1. **Fixed industrial camera** aimed along/over one belt (not a handheld tour video)
2. **Calibration** (pixels/mm, structure centreline)
3. **Segmentation model** (belt + idlers) trained on your site — Roboflow export + local YOLO — then geometry
4. Temporal smoothing / hysteresis for Watch vs Alarm

## Bottom line

- Principle: **yes** (edges vs centreline → mm).  
- Current UI mock: **shows** the principle, does not measure it.  
- Free YouTube “similar” footage: **not enough** to prove mm accuracy.  
- Next step for a true yes: one fixed plant camera stream (or labeled Roboflow set from that view) + replace mock inference with the trained/geometry pipeline.
