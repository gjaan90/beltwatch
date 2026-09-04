import Link from "next/link";
import type { AlertEvidence } from "@/lib/types";

const kindLabel: Record<string, string> = {
  misalignment: "Misalignment",
  oversize: "Oversized load",
  splice: "Splice & clips",
};

export default function EvidenceCard({
  alert,
  compact = false,
}: {
  alert: AlertEvidence;
  compact?: boolean;
}) {
  const o = alert.overlay;
  return (
    <div className={`evidence ${compact ? "compact" : ""}`}>
      <div className="evidence-thumb" aria-hidden>
        <div className="belt-surface mini" />
        <div
          className="edge-line"
          style={{ left: `${o.edgeL}%`, width: 2 }}
        />
        <div
          className="edge-line"
          style={{ left: `${o.edgeR}%`, width: 2 }}
        />
        <div
          className="ref-line"
          style={{ left: `${o.idlerL}%`, opacity: 0.7 }}
        />
        <div
          className="ref-line"
          style={{ left: `${o.idlerR}%`, opacity: 0.7 }}
        />
        {(o.boxes ?? []).map((b, i) => (
          <div
            key={i}
            className={`det-box ${b.kind}`}
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: `${b.w}%`,
              height: `${b.h}%`,
            }}
          />
        ))}
        <span className="thumb-cam">{alert.camera}</span>
      </div>
      <div className="evidence-body">
        <div className="evidence-top">
          <strong>{alert.when}</strong>
          <span className={`pill ${alert.status}`}>{alert.status}</span>
        </div>
        <div className="evidence-kind">{kindLabel[alert.kind] ?? alert.kind}</div>
        <div>
          <Link href={`/conveyor/${alert.conveyorId}`}>{alert.conveyor}</Link>
          {" · "}
          {alert.text}
        </div>
        <div className="meta" style={{ margin: "6px 0 0" }}>
          Metric {alert.metric}
          {alert.confidence > 0
            ? ` · conf ${(alert.confidence * 100).toFixed(0)}%`
            : ""}
        </div>
      </div>
    </div>
  );
}
