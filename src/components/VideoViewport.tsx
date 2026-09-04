"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  sampleEdgeTrack,
  sampleYoloTrack,
  statusFromWander,
  type EdgeTrack,
  type YoloTrack,
} from "@/lib/edgeTrack";
import type { DetectorKind, FrameInference, OverlayHint, Status } from "@/lib/types";

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
  /** Precomputed real edge timeline for this clip (JSON in /public) */
  edgeTrackUrl?: string;
  /** Precomputed YOLO detections from kickstart weights */
  yoloTrackUrl?: string;
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
  edgeTrackUrl,
  yoloTrackUrl,
}: Props) {
  const resolvedVideo = videoSrc ?? "/samples/misalignment-demo.mp4";
  const [frame, setFrame] = useState<FrameInference | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<number[]>(
    Array.from({ length: HISTORY_LEN }, () => initialWanderMm)
  );
  const [videoOk, setVideoOk] = useState(true);
  const [track, setTrack] = useState<EdgeTrack | null>(null);
  const [yoloTrack, setYoloTrack] = useState<YoloTrack | null>(null);
  const [liveOverlay, setLiveOverlay] = useState<OverlayHint | null>(null);
  const [liveWander, setLiveWander] = useState(initialWanderMm);
  const [liveStatus, setLiveStatus] = useState<Status>(initialStatus);
  const [detectMode, setDetectMode] = useState<"mock" | "video-edges" | "model">(
    "mock"
  );
  const videoRef = useRef<HTMLVideoElement>(null);

  const usingTrack = Boolean(
    (edgeTrackUrl && track) || (yoloTrackUrl && yoloTrack)
  );

  const overlay = liveOverlay ?? frame?.overlay ?? initialOverlay;
  const wanderMm = usingTrack ? liveWander : (frame?.wanderMm ?? initialWanderMm);
  const status = usingTrack ? liveStatus : (frame?.wanderStatus ?? initialStatus);
  const mode = usingTrack ? detectMode : (frame?.mode ?? "mock");
  const fps = usingTrack
    ? Math.round(yoloTrack?.fps ?? track?.fps ?? 0)
    : (frame?.fps ?? 0);
  const latencyMs = usingTrack ? 0 : (frame?.latencyMs ?? 0);
  const showAlert = !offline && (status === "watch" || status === "alarm");

  const centreLine = overlay.centre ?? (overlay.idlerL + overlay.idlerR) / 2;
  const beltCentre = (overlay.edgeL + overlay.edgeR) / 2;
  const driftDir = beltCentre >= centreLine ? "right" : "left";
  const lineTop = overlay.lineTop ?? 8;
  const lineBottom = overlay.lineBottom ?? 10;
  const lineStyle = {
    top: `${lineTop}%`,
    bottom: `${lineBottom}%`,
  } as const;

  const misBox = useMemo(() => {
    if (!showAlert) return null;
    if (driftDir === "right") {
      const left = Math.min(overlay.idlerL, overlay.edgeL);
      const right = Math.max(centreLine, overlay.edgeL);
      return {
        left,
        width: Math.max(6, right - left),
        top: lineTop + 10,
        height: Math.max(40, 100 - lineTop - lineBottom - 20),
      };
    }
    const left = Math.min(centreLine, overlay.edgeR);
    const right = Math.max(overlay.idlerR, overlay.edgeR);
    return {
      left,
      width: Math.max(6, right - left),
      top: lineTop + 10,
      height: Math.max(40, 100 - lineTop - lineBottom - 20),
    };
  }, [showAlert, driftDir, overlay, centreLine, lineTop, lineBottom]);

  // Load edge + YOLO tracks for Demo1
  useEffect(() => {
    let cancelled = false;
    const jobs: Promise<void>[] = [];

    if (edgeTrackUrl) {
      jobs.push(
        fetch(edgeTrackUrl)
          .then((r) => {
            if (!r.ok) throw new Error(`edge track HTTP ${r.status}`);
            return r.json();
          })
          .then((data: EdgeTrack) => {
            if (cancelled) return;
            setTrack(data);
          })
      );
    } else {
      setTrack(null);
    }

    if (yoloTrackUrl) {
      jobs.push(
        fetch(yoloTrackUrl)
          .then((r) => {
            if (!r.ok) throw new Error(`yolo track HTTP ${r.status}`);
            return r.json();
          })
          .then((data: YoloTrack) => {
            if (cancelled) return;
            setYoloTrack(data);
            setDetectMode("model");
          })
      );
    } else {
      setYoloTrack(null);
    }

    Promise.all(jobs)
      .then(() => {
        if (cancelled) return;
        setError(null);
        if (!yoloTrackUrl && edgeTrackUrl) setDetectMode("video-edges");
        if (!yoloTrackUrl && !edgeTrackUrl) setDetectMode("mock");
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "track load failed");
      });

    return () => {
      cancelled = true;
    };
  }, [edgeTrackUrl, yoloTrackUrl]);

  const applyTrackSample = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;

    const yolo = yoloTrack ? sampleYoloTrack(yoloTrack, v.currentTime) : null;
    const edge = track ? sampleEdgeTrack(track, v.currentTime) : null;

    const edgeL = yolo?.edgeL ?? edge?.edgeL;
    const edgeR = yolo?.edgeR ?? edge?.edgeR;
    const centre = yolo?.centre ?? edge?.centre ?? track?.centre ?? 50;
    const wander = yolo?.wanderMm ?? edge?.wanderMm;
    if (edgeL == null || edgeR == null || wander == null) return;

    const st = statusFromWander(wander);
    setLiveWander(wander);
    setLiveStatus(st);
    setLiveOverlay({
      edgeL,
      edgeR,
      idlerL: 6,
      idlerR: 93,
      centre,
      lineTop: 8,
      lineBottom: 10,
      boxes: (yolo?.boxes ?? []).map((b) => ({
        x: b.x,
        y: b.y,
        w: b.w,
        h: b.h,
        label: b.label,
        kind: (b.kind as DetectorKind) || "misalignment",
      })),
    });
    if (yoloTrack) setDetectMode("model");
    else setDetectMode("video-edges");
    setHistory((h) => [...h.slice(1), wander]);
  }, [track, yoloTrack]);

  useEffect(() => {
    if (!usingTrack) return;
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => applyTrackSample();
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("seeked", onTime);
    v.addEventListener("play", onTime);
    const raf = window.setInterval(applyTrackSample, 100);
    applyTrackSample();
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("seeked", onTime);
      v.removeEventListener("play", onTime);
      window.clearInterval(raf);
    };
  }, [usingTrack, applyTrackSample]);

  const poll = useCallback(async () => {
    if (offline || usingTrack) return;
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
  }, [conveyorId, camera, offline, usingTrack]);

  useEffect(() => {
    if (usingTrack) return;
    poll();
    if (offline) return;
    const t = setInterval(poll, 700);
    return () => clearInterval(t);
  }, [poll, offline, usingTrack]);

  useEffect(() => {
    setVideoOk(true);
  }, [resolvedVideo]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoOk) return;
    v.load();
    v.play().catch(() => {
      /* muted autoplay should work */
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

        <div
          className="centre-ref"
          style={{ left: `${centreLine}%`, ...lineStyle }}
          title="Structure centreline"
        />

        <div
          className="edge-track edge-l"
          style={{ left: `${overlay.edgeL}%`, ...lineStyle }}
        />
        <div
          className="edge-track edge-r"
          style={{ left: `${overlay.edgeR}%`, ...lineStyle }}
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
          {camera} ·{" "}
          {detectMode === "model"
            ? "YOLO kickstart weights synced to video"
            : detectMode === "video-edges"
              ? "real edge track synced to video"
              : "edge vs centreline · mock"}
          {error ? ` · err: ${error}` : ""}
        </div>
        <div className="meta" style={{ margin: 0 }}>
          {offline
            ? "No stream"
            : `${fps} fps · ${latencyMs} ms · belt ${beltWidthMm} mm · mode ${mode}`}
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
