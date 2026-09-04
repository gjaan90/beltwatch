"use client";

import { useCallback, useEffect, useState } from "react";
import type { FrameInference, OverlayHint, Status } from "@/lib/types";

type Props = {
  conveyorId: string;
  camera?: string;
  beltWidthMm: number;
  initialOverlay: OverlayHint;
  initialWanderMm: number;
  initialStatus: Status;
  offline?: boolean;
};

export default function VideoViewport({
  conveyorId,
  camera = "CAM-1",
  beltWidthMm,
  initialOverlay,
  initialWanderMm,
  initialStatus,
  offline = false,
}: Props) {
  const [frame, setFrame] = useState<FrameInference | null>(null);
  const [error, setError] = useState<string | null>(null);

  const overlay = frame?.overlay ?? initialOverlay;
  const wanderMm = frame?.wanderMm ?? initialWanderMm;
  const status = frame?.wanderStatus ?? initialStatus;
  const mode = frame?.mode ?? "mock";
  const fps = frame?.fps ?? 0;
  const latencyMs = frame?.latencyMs ?? 0;

  const poll = useCallback(async () => {
    if (offline) return;
    try {
      const res = await fetch(
        `/api/inference/${conveyorId}?camera=${encodeURIComponent(camera)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as FrameInference;
      setFrame(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "inference failed");
    }
  }, [conveyorId, camera, offline]);

  useEffect(() => {
    poll();
    if (offline) return;
    const t = setInterval(poll, 900);
    return () => clearInterval(t);
  }, [poll, offline]);

  return (
    <div className={`viewport ${offline ? "offline-vp" : ""}`}>
      <div className="belt-scene" aria-hidden>
        <div className="belt-surface" />
        <div className="material-flow" />
        <div
          className="ref-line idler-l"
          style={{ left: `${overlay.idlerL}%` }}
          title="Idler reference L"
        />
        <div
          className="ref-line idler-r"
          style={{ left: `${overlay.idlerR}%` }}
          title="Idler reference R"
        />
        <div
          className="edge-line edge-l"
          style={{ left: `${overlay.edgeL}%` }}
        />
        <div
          className="edge-line edge-r"
          style={{ left: `${overlay.edgeR}%` }}
        />
        <div className="centre-line" />
        {(overlay.boxes ?? []).map((b, i) => (
          <div
            key={`${b.label}-${i}`}
            className={`det-box ${b.kind}`}
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: `${b.w}%`,
              height: `${b.h}%`,
            }}
          >
            <span>{b.label}</span>
          </div>
        ))}
      </div>

      <div className="hud">
        <div>
          {camera} · {mode} inference
          {error ? ` · err: ${error}` : ""}
        </div>
        <div className="meta" style={{ margin: 0 }}>
          {offline
            ? "No stream"
            : `${fps} fps · ${latencyMs} ms · belt ${beltWidthMm} mm`}
        </div>
      </div>

      <div className="gauge">
        <span className="meta">Wander</span>
        <b className={status}>
          {wanderMm > 0 ? "+" : ""}
          {wanderMm} mm
        </b>
        <span className="meta">edge vs idlers</span>
      </div>

      <div className="legend">
        <span>
          <i className="lg-edge" /> Belt edge
        </span>
        <span>
          <i className="lg-idler" /> Idler ref
        </span>
        <span>
          <i className="lg-box" /> Detection
        </span>
      </div>
    </div>
  );
}
