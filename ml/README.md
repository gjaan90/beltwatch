# BeltSight ML pipeline

Three detectors, three Roboflow projects, YOLO (seg/detect) training, then geometry for wander.

| Task | Roboflow project | YOLO task | Output |
|------|------------------|-----------|--------|
| Misalignment | `beltsight-misalignment` | segment | belt + idler masks → wander mm |
| Oversized load | `beltsight-oversize` | detect / segment | lump boxes + size estimate |
| Splice & clips | `beltsight-splice-clips` | detect | splice, clip, damage, wear, repair |

## Layout

```text
ml/
  datasets/
    misalignment/   # YOLO export from Roboflow
    oversize/
    splice/
  weights/
    misalignment/best.pt
    oversize/best.pt
    splice/best.pt
  scripts/
    export_from_roboflow.py
    train_yolo.py
    eval_geometry.py
    infer_stub.py
```

## Quick start

```bash
pip install -r ml/requirements.txt
export ROBOFLOW_API_KEY=...

# Export a versioned dataset (creates data.yaml + images/labels)
python ml/scripts/export_from_roboflow.py \
  --workspace YOUR_WORKSPACE \
  --project beltsight-misalignment \
  --version 1 \
  --out ml/datasets/misalignment

# Train
python ml/scripts/train_yolo.py \
  --task misalignment \
  --data ml/datasets/misalignment/data.yaml \
  --model yolov8s-seg.pt \
  --epochs 100

# Geometry eval (misalignment only) — mm error vs labeled edges
python ml/scripts/eval_geometry.py \
  --weights ml/weights/misalignment/best.pt \
  --data ml/datasets/misalignment/data.yaml \
  --pixels-per-mm 0.42
```

## Bootstrap from Universe (optional)

Public sets are for scaffolding only:

- Misaligned conveyor belts (detection) — useful hard negatives, not mm geometry
- Conveyor belt FYP set — splice / clips / damage / wear (~200 images)

Clone into your private projects, then replace with site video from Iron Ridge / Hunter Valley style lines.

## Accuracy notes

1. **Misalignment is geometry.** Segmentation finds edges; calibration (`pixelsPerMm`, camera pose) produces mm. Report MAE in mm on a held-out plant set, not only mAP.
2. **Oversized load** needs known scale (belt width in frame or depth). Label max dimension in mm when possible.
3. **Splice & clips** want a dedicated close-up camera and many frames per splice revolution.
4. Keep a golden set per site; feed false alerts back into Roboflow.

## Wiring into the app

`GET /api/inference/[conveyorId]` currently returns the **mock / stub** from `src/lib/inference.ts`.

When weights exist under `ml/weights/...`, point an edge worker (or Next route with Python sidecar) at `infer_stub.py` and set `mode: "model"`. Until then the UI polls the mock so operators can exercise overlays and alerts.
