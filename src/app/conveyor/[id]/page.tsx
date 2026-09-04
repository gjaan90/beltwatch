import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import DetectorStrip from "@/components/DetectorStrip";
import EvidenceCard from "@/components/EvidenceCard";
import VideoViewport from "@/components/VideoViewport";
import {
  alertsForConveyor,
  conveyorById,
  overlayForConveyor,
} from "@/lib/demo";

export default async function ConveyorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = conveyorById(id);
  if (!c) notFound();

  const mis = c.detectors.find((d) => d.kind === "misalignment");
  const wanderMm = Number.parseInt(mis?.value ?? "0", 10) || 0;
  const hot =
    c.status === "alarm" ? 14 : c.status === "watch" ? 9 : -1;
  const warm = c.status === "alarm" ? [13, 15] : [];
  const evidence = alertsForConveyor(c.id).filter((a) => a.status !== "ok");
  const overlay = overlayForConveyor(c);

  const trend = [3, 4, 5, 6, 8, 9, 11, 10, 12, 14, 16, 18, 17, wanderMm || 4];

  return (
    <AppShell active="plant">
      <div className="page">
        <p className="meta">
          <Link href="/plant">Plant</Link> / {c.site}
        </p>
        <h1>{c.name}</h1>
        <p className="lead">
          {c.region} · belt {c.beltWidthMm} mm · {c.cameras} cameras ·{" "}
          {c.material.replace("_", " ")}
          {c.id === "demo1"
            ? ". Demo machine with along-belt footage. Overlays use the kickstart YOLO weights (belt boxes) plus the real edge track, synced to the video timeline."
            : ". Misalignment uses the same principle as industrial Visual AI: track belt edges against the idler centreline, trend wander in mm, then raise Watch / Alarm with on-screen evidence."}
        </p>

        <DetectorStrip detectors={c.detectors} />

        <div className="grid" style={{ gridTemplateColumns: "2fr 1fr" }}>
          <VideoViewport
            conveyorId={c.id}
            camera="CAM-1"
            beltWidthMm={c.beltWidthMm}
            initialOverlay={overlay}
            initialWanderMm={wanderMm}
            initialStatus={mis?.status ?? c.status}
            offline={c.status === "offline"}
            videoSrc={c.videoSrc}
            edgeTrackUrl={c.edgeTrackUrl}
            yoloTrackUrl={c.yoloTrackUrl}
          />
          <div>
            <div className="card">
              <h2>Status</h2>
              <div className="row">
                <span>Overall</span>
                <span className={`pill ${c.status}`}>{c.status}</span>
              </div>
              <div className="row">
                <span>Idlers</span>
                <span>{c.idlers}</span>
              </div>
              <div className="row">
                <span>Last frame</span>
                <span>{c.lastSeen}</span>
              </div>
              <div className="row">
                <span>Inference</span>
                <span>mock API</span>
              </div>
              <h2 style={{ marginTop: 16 }}>Wander trend</h2>
              <div className="meta" style={{ marginBottom: 0 }}>
                Last samples (mm) — stub until history store
              </div>
              <div className="trend" title="Wander mm">
                {trend.map((v, i) => (
                  <i
                    key={i}
                    className={v >= 15 ? "hot" : v >= 10 ? "warm" : ""}
                    style={{ height: `${Math.min(100, (Math.abs(v) / 20) * 100)}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="card" style={{ marginTop: 16 }}>
              <h2>Calibration</h2>
              <p className="meta">
                Pixels/mm and thresholds live under Settings. Misalignment uses
                edge geometry against idler references — not a pure classifier.
              </p>
              <Link className="btn ghost" href="/settings">
                Open settings
              </Link>
            </div>
          </div>
        </div>

        <h2 style={{ marginTop: 24, fontSize: 16 }}>Idler bays</h2>
        <div className="idlers">
          {Array.from({ length: Math.min(c.idlers, 24) }, (_, i) => {
            const n = i + 1;
            const cls =
              n === hot ? "hot" : warm.includes(n) ? "warm" : "";
            return (
              <span key={i} className={cls}>
                {n}
              </span>
            );
          })}
        </div>

        <h2 style={{ marginTop: 28, fontSize: 16 }}>Evidence</h2>
        <p className="meta">
          Alert frames with overlay context — what operators need to trust the
          call.
        </p>
        <div className="evidence-list">
          {evidence.length === 0 ? (
            <div className="card">
              <p className="meta" style={{ margin: 0 }}>
                No open evidence for this conveyor.
              </p>
            </div>
          ) : (
            evidence.map((a) => <EvidenceCard key={a.id} alert={a} compact />)
          )}
        </div>
      </div>
    </AppShell>
  );
}
