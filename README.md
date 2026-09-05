# BeltWatch (SKF BeltSight)

GitHub: [gjaan90/beltwatch](https://github.com/gjaan90/beltwatch)

Conveyor vision preview: **misalignment**, **oversized load**, and **splice & clips**.

## Run on another PC

```bash
git clone https://github.com/gjaan90/beltwatch.git
cd beltwatch
npm install
npm run dev -- -p 5000
```

Open [http://localhost:5000/conveyor/demo1](http://localhost:5000/conveyor/demo1)

Included for Demo1 (no retrain needed):

| Asset | Path |
|-------|------|
| Along-belt demo video | `public/samples/demo1-misalignment.mp4` (~19 MB) |
| Edge track | `public/samples/demo1-edges.json` |
| YOLO detections | `public/samples/demo1-yolo.json` |
| Misalignment weights | `ml/weights/misalignment/best.pt` |
| Splice / oversize weights | `ml/weights/splice/best.pt`, `ml/weights/oversize/best.pt` |

Optional Roboflow key (training only): copy `.env.example` → `.env.txt` and set `ROBOFLOW_API_KEY`.

## Routes

| Route | Purpose |
|-------|---------|
| `/plant` | Sites & conveyors |
| `/conveyor/demo1` | Demo video + YOLO + edge overlays |
| `/alerts` | Evidence feed |
| `/models` | Model pipeline notes |
| `/settings` | Calibration |

## ML

See [`ml/README.md`](ml/README.md). Overnight Roboflow train: `python ml/scripts/overnight_roboflow_train.py`
