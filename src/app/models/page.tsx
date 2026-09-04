import Link from "next/link";
import AppShell from "@/components/AppShell";

const models = [
  {
    id: "misalignment",
    title: "Misalignment (seg + geometry)",
    badge: "P1 stub",
    badgeClass: "ok",
    project: "beltsight-misalignment",
    classes: "belt, idler, structure (optional)",
    task: "Instance / semantic segmentation → edge geometry → wander mm",
    path: "ml/datasets/misalignment",
    weights: "ml/weights/misalignment/best.pt",
  },
  {
    id: "oversize",
    title: "Oversized load",
    badge: "scaffold",
    badgeClass: "warn",
    project: "beltsight-oversize",
    classes: "lump, foreign_object",
    task: "Object detection / segmentation + calibrated size estimate",
    path: "ml/datasets/oversize",
    weights: "ml/weights/oversize/best.pt",
  },
  {
    id: "splice",
    title: "Splice & clips",
    badge: "scaffold",
    badgeClass: "warn",
    project: "beltsight-splice-clips",
    classes: "splice, clip, damage, wear, repair",
    task: "Object detection on close-up belt surface passes",
    path: "ml/datasets/splice",
    weights: "ml/weights/splice/best.pt",
  },
];

export default function Models() {
  return (
    <AppShell active="models">
      <div className="page">
        <h1>Models</h1>
        <p className="lead">
          Three Roboflow projects → YOLO train scripts → weights mounted for
          inference. The UI currently polls{" "}
          <code>/api/inference/[conveyorId]</code> which runs the mock /
          misalignment stub until real weights are present.
        </p>

        <div className="model-grid">
          {models.map((m) => (
            <div className="card" key={m.id}>
              <span className={`badge ${m.badgeClass}`}>{m.badge}</span>
              <h2>{m.title}</h2>
              <p className="meta">{m.task}</p>
              <div className="meta" style={{ marginBottom: 4 }}>
                Roboflow project
              </div>
              <code>{m.project}</code>
              <div className="meta" style={{ marginBottom: 4 }}>
                Classes
              </div>
              <code>{m.classes}</code>
              <div className="meta" style={{ marginBottom: 4 }}>
                Dataset / weights
              </div>
              <code>{m.path}</code>
              <code>{m.weights}</code>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginTop: 18 }}>
          <h2>Train locally</h2>
          <p className="meta">
            From the BeltSight repo root (Python 3.10+ with ultralytics):
          </p>
          <code style={{ display: "block", marginBottom: 8 }}>
            pip install -r ml/requirements.txt
          </code>
          <code style={{ display: "block", marginBottom: 8 }}>
            python ml/scripts/export_from_roboflow.py --project beltsight-misalignment --version 1
          </code>
          <code style={{ display: "block", marginBottom: 8 }}>
            python ml/scripts/train_yolo.py --task misalignment --data ml/datasets/misalignment/data.yaml
          </code>
          <code style={{ display: "block" }}>
            python ml/scripts/eval_geometry.py --weights ml/weights/misalignment/best.pt
          </code>
          <p className="meta" style={{ marginTop: 14 }}>
            Full notes: <code>ml/README.md</code>. Bootstrap from public Universe
            sets is fine; production accuracy needs your plant footage.
          </p>
          <Link className="btn ghost" href="/plant">
            Back to plant
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
