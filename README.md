# BeltWatch (SKF BeltSight)

GitHub: [gjaan90/beltwatch](https://github.com/gjaan90/beltwatch)

Conveyor vision preview for SKF Australia: **misalignment**, **oversized load**, and **splice & clips**.

## App (Next.js)

```bash
git clone https://github.com/gjaan90/beltwatch.git
cd beltwatch
npm install
npm run dev -- -p 5000
```

Open [http://localhost:5000](http://localhost:5000).

| Route | Purpose |
|-------|---------|
| `/plant` | Sites & conveyors with three-detector summary |
| `/conveyor/[id]` | Live mock viewport, overlays, evidence, idler map |
| `/alerts` | Evidence-first alert feed |
| `/models` | Roboflow / YOLO pipeline overview |
| `/settings` | Calibration (px/mm, thresholds) |
| `GET /api/inference/[id]` | Mock frame inference (wander jitter + overlays) |

## ML pipeline

See [`ml/README.md`](ml/README.md) for Roboflow export, YOLO training, and geometry eval.

## Status

- UI: video-style viewport with belt/idler overlays and detection boxes
- Inference: **mock stub** in `src/lib/inference.ts` (ready to swap for model sidecar)
- Training: scripts under `ml/scripts/` — need your Roboflow API key + plant footage for production accuracy
