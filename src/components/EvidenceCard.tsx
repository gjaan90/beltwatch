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
          className="centre-ref"
          style={{ left: `${(o.idlerL + o.idlerR) / 2}%` }}
        />
        <div className="edge-track" style={{ left: `${o.edgeL}%` }} />
        <div className="edge-track" style={{ left: `${o.edgeR}%` }} />
        {alert.kind === "misalignment" && alert.status !== "ok" ? (
          <div
            className="misalign-box"
            style={{
              left: `${Math.min(o.edgeR, o.idlerR) - 1}%`,
              top: "20%",
              width: `${Math.max(4, Math.abs(o.edgeR - o.idlerR) + 2)}%`,
              height: "55%",
            }}
          />
        ) : null}
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
