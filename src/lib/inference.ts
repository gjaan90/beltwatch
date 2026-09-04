import { conveyorById, overlayForConveyor } from "./demo";
import type { FrameInference, Status } from "./types";

/**
 * Mock / stub inference for BeltSight.
 * When MODE=model and a weights path exists, swap this for real YOLO + geometry.
 * Misalignment path: segment belt/idlers → edge geometry → wander mm.
 */
export function inferFrame(
  conveyorId: string,
  camera = "CAM-1",
  jitter = true
): FrameInference | null {
  const c = conveyorById(conveyorId);
  if (!c) return null;

  const mis = c.detectors.find((d) => d.kind === "misalignment");
  let wanderMm = Number.parseInt(mis?.value ?? "0", 10) || 0;
  if (jitter && c.status !== "offline") {
    wanderMm += Math.round((Math.sin(Date.now() / 800) * 1.2 + Math.random() - 0.5) * 10) / 10;
    wanderMm = Math.round(wanderMm * 10) / 10;
  }

  const wanderStatus: Status =
    c.status === "offline"
      ? "offline"
      : Math.abs(wanderMm) >= 15
        ? "alarm"
        : Math.abs(wanderMm) >= 10
          ? "watch"
          : "ok";

  const detectors = c.detectors.map((d) => {
    if (d.kind !== "misalignment") return d;
    return {
      ...d,
      status: wanderStatus,
      value: `${wanderMm > 0 ? "+" : ""}${wanderMm} mm`,
      updatedAt: new Date().toISOString(),
    };
  });

  const overlay = overlayForConveyor({ ...c, detectors });
  // Re-apply wander shift from live value
  const centre = 50;
  const halfBelt = 28;
  const shift = (wanderMm / c.beltWidthMm) * 40;
  overlay.edgeL = centre - halfBelt + shift;
  overlay.edgeR = centre + halfBelt + shift;

  return {
    conveyorId,
    camera,
    ts: new Date().toISOString(),
    mode: "mock",
    wanderMm,
    wanderStatus,
    detectors,
    overlay,
    fps: c.status === "offline" ? 0 : 12 + Math.round(Math.random() * 3),
    latencyMs: c.status === "offline" ? 0 : 40 + Math.round(Math.random() * 35),
  };
}

export function geometryWanderMm(
  edgeLPx: number,
  edgeRPx: number,
  idlerLPx: number,
  idlerRPx: number,
  pixelsPerMm: number
): number {
  const beltCentre = (edgeLPx + edgeRPx) / 2;
  const idlerCentre = (idlerLPx + idlerRPx) / 2;
  return Math.round(((beltCentre - idlerCentre) / pixelsPerMm) * 10) / 10;
}
