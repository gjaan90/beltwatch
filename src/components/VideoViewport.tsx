"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FrameInference, OverlayHint, Status } from "@/lib/types";

type Props = {
  conveyorId: string;
  camera?: string;
  beltWidthMm: number;
  initialOverlay: OverlayHint;
  initialWanderMm: number;
  initialStatus: Status;
  offline?: boolean;
  /** Optional hosted demo clip; falls back to synthetic belt if missing */
  videoSrc?: string;
};

const HISTORY_LEN = 24;

export default function VideoViewport({
  conveyorId,
  camera = "CAM-1",
  beltWidthMm,
  initialOverlay,
  initialWanderMm,
  initialStatus,
  offline = false,
  videoSrc,
}: Props) {
  const resolvedVideo = videoSrc ?? "/samples/misalignment-demo.mp4";
  const [frame, setFrame] = useState<FrameInference | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<number[]>(
    Array.from({ length: HISTORY_LEN }, () => initialWanderMm)
  );
  const [videoOk, setVideoOk] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const overlay = frame?.overlay ?? initialOverlay;
  const wanderMm = frame?.wanderMm ?? initialWanderMm;
  const status = frame?.wanderStatus ?? initialStatus;
  const mode = frame?.mode ?? "mock";
  const fps = frame?.fps ?? 0;
  const latencyMs = frame?.latencyMs ?? 0;
  const showAlert = !offline && (status === "watch" || status === "alarm");

  const idlerCentre = (overlay.idlerL + overlay.idlerR) / 2;
  const beltCentre = (overlay.edgeL + overlay.edgeR) / 2;
  const driftDir = beltCentre >= idlerCentre ? "right" : "left";

  /** Yellow callout between drifted belt edge and the matching idler reference */
  const misBox = useMemo(() => {
    if (!showAlert) return null;
    const edge = driftDir === "right" ? overlay.edgeR : overlay.edgeL;
    const idler = driftDir === "right" ? overlay.idlerR : overlay.idlerL;
    const left = Math.min(edge, idler) - 1;
    const width = Math.max(4, Math.abs(edge - idler) + 2);
    return { left, width, top: 22, height: 56 };
  }, [showAlert, driftDir, overlay]);

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
      setHistory((h) => [...h.slice(1), data.wanderMm]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "inference failed");
    }
  }, [conveyorId, camera, offline]);

  useEffect(() => {
    poll();
    if (offline) return;
    const t = setInterval(poll, 700);
    return () => clearInterval(t);
  }, [poll, offline]);

  useEffect(() => {
    setVideoOk(true);
  }, [resolvedVideo]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoOk) return;
    v.load();
    v.play().catch(() => {
      /* autoplay may be blocked — muted loop should work */
    });
  }, [videoOk, resolvedVideo]);

  const maxAbs = Math.max(20, ...history.map((v) => Math.abs(v)));

  return (
    <div className={`viewport razor-vp ${offline ? "offline-vp" : ""} ${status}`}>
      <div className="belt-scene" aria-hidden>
        {videoOk && !offline ? (
          <video
            ref={videoRef}
            className="vp-video"
            src={resolvedVideo}
            muted
            loop
            playsInline
            autoPlay
            onError={() => setVideoOk(false)}
          />
        ) : (
          <>
            <div className="belt-surface" />
            <div className="material-flow" />
          </>
        )}

        {/* Structure / idler centreline reference (magenta dashed) — Razor principle */}
        <div
          className="centre-ref"
          style={{ left: `${idlerCentre}%` }}
          title="Idler / structure centreline"
        />

        {/* Measured belt outer edges (teal) */}
        <div
          className="edge-track edge-l"
          style={{ left: `${overlay.edgeL}%` }}
        />
        <div
          className="edge-track edge-r"
          style={{ left: `${overlay.edgeR}%` }}
        />

        {/* Idler bay side references (subtle) */}
        <div
          className="idler-tick"
          style={{ left: `${overlay.idlerL}%` }}
        />
        <div
          className="idler-tick"
          style={{ left: `${overlay.idlerR}%` }}
        />

        {misBox ? (
          <div
            className="misalign-box"
            style={{
              left: `${misBox.left}%`,
              top: `${misBox.top}%`,
              width: `${misBox.width}%`,
              height: `${misBox.height}%`,
            }}
          >
            <span>Misalignment</span>
          </div>
        ) : null}

        {(overlay.boxes ?? [])
          .filter((b) => b.kind !== "misalignment")
          .map((b, i) => (
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
          {camera} · edge vs idler centreline · {mode}
          {error ? ` · err: ${error}` : ""}
        </div>
        <div className="meta" style={{ margin: 0 }}>
          {offline
            ? "No stream"
            : `${fps} fps · ${latencyMs} ms · belt ${beltWidthMm} mm`}
        </div>
      </div>

      {showAlert ? (
        <div className={`detect-badge ${status}`}>
          Belt Misalignment Detected
        </div>
      ) : null}

      <div className="gauge-stack">
        <div className="gauge">
          <span className="meta">Wander</span>
          <b className={status}>
            {wanderMm > 0 ? "+" : ""}
            {wanderMm} mm
          </b>
          <span className="meta">
            {offline ? "offline" : `drift ${driftDir}`}
          </span>
        </div>
        <div className="spark" title="Wander trend (mm)">
          <svg viewBox={`0 0 ${HISTORY_LEN} 28`} preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke={
                status === "alarm"
                  ? "#ff5d5d"
                  : status === "watch"
                    ? "#f0b429"
                    : "#3dd68c"
              }
              strokeWidth="1.5"
              points={history
                .map((v, i) => {
                  const y = 14 - (v / maxAbs) * 12;
                  return `${i},${y}`;
                })
                .join(" ")}
            />
            <line
              x1="0"
              y1="14"
              x2={HISTORY_LEN}
              y2="14"
              stroke="#ffffff22"
              strokeWidth="1"
            />
          </svg>
          <span className="meta">trend</span>
        </div>
      </div>

      <div className="legend">
        <span>
          <i className="lg-edge" /> Belt edge
        </span>
        <span>
          <i className="lg-centre" /> Centreline ref
        </span>
        <span>
          <i className="lg-mis" /> Misalignment
        </span>
      </div>
    </div>
  );
}
