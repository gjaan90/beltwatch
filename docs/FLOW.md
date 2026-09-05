# How BeltWatch fits together (plain English)

## The simple picture

```text
Camera / video file
        │
        ▼
  BeltWatch app (this project)
        │
        ├── shows the video on screen
        ├── runs (or replays) the AI model
        └── draws boxes / edge lines / alerts
```

- **Video** lives with the app (`public/samples/...`) or later from a plant camera.
- **Models** (`.pt` weight files) also live with the app (`ml/weights/...`) on your PC / server.
- Operators use the **BeltWatch website** to watch conveyors and alerts.

Nothing *has* to go to the cloud for day-to-day monitoring.

## Why Roboflow was mentioned

Roboflow is only a **labeling workshop**, like Excel for drawing boxes on pictures:

1. Upload sample frames  
2. Humans (or helpers) mark “this is the belt”  
3. Export a training pack  
4. You train the model **on your own computer**  
5. Put the finished `.pt` file into BeltWatch  

You can skip Roboflow and label/train fully locally (what we are doing with Demo1).

## Current Demo1 flow

```text
demo1-misalignment.mp4
        │
        ├── edge track (geometry) → teal edges + wander mm
        └── YOLO weights → belt boxes on screen
                │
                ▼
        /conveyor/demo1 in the BeltWatch UI
```
