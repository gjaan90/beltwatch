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

## Misalignment principle

Same approach used by industrial Visual AI demos (e.g. DataMind-style overlays):

1. Track **belt outer edges** in the frame  
2. Compare to a fixed **idler / structure centreline**  
3. Convert pixel offset → **wander mm** via calibration  
4. Show **trend**, yellow callout, and **“Belt Misalignment Detected”** when thresholds trip  

Demo clip (local only): put `misalignment-demo.mp4` in `public/samples/` (gitignored).

## Status

- UI: live viewport with Razor-style edge / centreline / callout overlays
- Inference: **mock stub** in `src/lib/inference.ts` (ready to swap for model sidecar)
- Training: scripts under `ml/scripts/` — export from Roboflow Universe free, train locally
