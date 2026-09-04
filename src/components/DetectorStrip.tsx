import type { DetectorSnapshot } from "@/lib/types";

const kindIcon: Record<string, string> = {
  misalignment: "⇔",
  oversize: "◼",
  splice: "⧉",
};

export default function DetectorStrip({
  detectors,
}: {
  detectors: DetectorSnapshot[];
}) {
  return (
    <div className="detector-strip">
      {detectors.map((d) => (
        <div key={d.kind} className={`detector-card ${d.status}`}>
          <div className="detector-head">
            <span className="detector-icon" aria-hidden>
              {kindIcon[d.kind] ?? "•"}
            </span>
            <span className={`pill ${d.status}`}>{d.status}</span>
          </div>
          <div className="detector-label">{d.label}</div>
          <div className="detector-value">{d.value}</div>
          <div className="meta" style={{ margin: 0 }}>
            {d.detail}
            {d.confidence > 0 ? ` · ${(d.confidence * 100).toFixed(0)}%` : ""}
          </div>
        </div>
      ))}
    </div>
  );
}
