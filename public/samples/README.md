# Demo video samples

Place local demo clips here (mp4 gitignored):

- `demo1-misalignment.mp4` — along-belt clip for **Demo1**
- `demo1-edges.json` — **real** per-frame edge track (committed)
- `misalignment-demo.mp4` — fallback for other conveyors

Regenerate edges after replacing the Demo1 video:

```bash
python ml/scripts/extract_demo1_edges.py
```
