import Link from "next/link";

export default function Home() {
  return (
    <div className="hero">
      <div className="hero-card card">
        <img className="logo" src="/skf-logo.png" alt="SKF" />
        <h1 style={{ marginTop: 16 }}>BeltSight</h1>
        <p className="lead" style={{ marginBottom: 8 }}>
          Conveyor vision for mines — three detectors on every camera.
        </p>
        <div className="hero-features">
          <span>
            <i className="dot-mis" /> Misalignment — belt outer edge vs idlers (mm)
          </span>
          <span>
            <i className="dot-over" /> Oversized load — coal, stone, iron lumps
          </span>
          <span>
            <i className="dot-splice" /> Splice &amp; clips — health on every pass
          </span>
        </div>
        <p>
          Cameras on the line. Geometry for wander. Roboflow-trained models for
          oversize and splice. This is an SKF Australia internal preview.
        </p>
        <p style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn primary" href="/conveyor/demo1">
            Open Demo1
          </Link>
          <Link className="btn ghost" href="/plant">
            Enter plant
          </Link>
          <Link className="btn ghost" href="/models">
            Model pipeline
          </Link>
        </p>
      </div>
    </div>
  );
}
