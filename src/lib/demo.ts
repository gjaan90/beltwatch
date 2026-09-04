import type {
  AlertEvidence,
  Calibration,
  Conveyor,
  DetectorSnapshot,
  OverlayHint,
  Status,
} from "./types";

export type { Status, Conveyor, AlertEvidence, Calibration };

const baseOverlay = (
  wanderMm: number,
  beltWidthMm: number,
  boxes?: OverlayHint["boxes"]
): OverlayHint => {
  // Centre gap ~ belt visual; wander shifts edges relative to idler refs
  const centre = 50;
  const halfBelt = 28;
  const shift = (wanderMm / beltWidthMm) * 40;
  return {
    edgeL: centre - halfBelt + shift,
    edgeR: centre + halfBelt + shift,
    idlerL: centre - halfBelt,
    idlerR: centre + halfBelt,
    boxes,
  };
};

function detectorsFor(
  wanderMm: number,
  wanderStatus: Status,
  oversize: { status: Status; value: string; detail: string; conf: number },
  splice: { status: Status; value: string; detail: string; conf: number }
): DetectorSnapshot[] {
  return [
    {
      kind: "misalignment",
      label: "Misalignment",
      status: wanderStatus,
      value: `${wanderMm > 0 ? "+" : ""}${wanderMm} mm`,
      detail: "Belt outer edge vs idler centreline",
      confidence: wanderStatus === "offline" ? 0 : 0.92,
      updatedAt: "live",
    },
    {
      kind: "oversize",
      label: "Oversized load",
      status: oversize.status,
      value: oversize.value,
      detail: oversize.detail,
      confidence: oversize.conf,
      updatedAt: "live",
    },
    {
      kind: "splice",
      label: "Splice & clips",
      status: splice.status,
      value: splice.value,
      detail: splice.detail,
      confidence: splice.conf,
      updatedAt: "live",
    },
  ];
}

export const conveyors: Conveyor[] = [
  {
    id: "demo1",
    name: "Demo1",
    site: "Demo Plant",
    region: "Local preview",
    cameras: 1,
    beltWidthMm: 1600,
    status: "alarm",
    lastSeen: "live",
    idlers: 24,
    material: "iron_ore",
    videoSrc: "/samples/demo1-misalignment.mp4",
    detectors: detectorsFor(
      14,
      "alarm",
      {
        status: "ok",
        value: "Clear",
        detail: "Load within envelope on demo clip",
        conf: 0.8,
      },
      {
        status: "ok",
        value: "Healthy",
        detail: "No splice pass in this clip",
        conf: 0.75,
      }
    ),
  },
  {
    id: "cv-12",
    name: "CV-12 Overland",
    site: "Iron Ridge",
    region: "Pilbara, WA",
    cameras: 4,
    beltWidthMm: 1600,
    status: "ok",
    lastSeen: "12s ago",
    idlers: 48,
    material: "iron_ore",
    detectors: detectorsFor(
      4,
      "ok",
      {
        status: "ok",
        value: "Clear",
        detail: "No lumps above 180 mm",
        conf: 0.88,
      },
      {
        status: "ok",
        value: "Healthy",
        detail: "Last splice pass clean",
        conf: 0.91,
      }
    ),
  },
  {
    id: "cv-07",
    name: "CV-07 Stacker",
    site: "Iron Ridge",
    region: "Pilbara, WA",
    cameras: 2,
    beltWidthMm: 1400,
    status: "watch",
    lastSeen: "28s ago",
    idlers: 22,
    material: "iron_ore",
    detectors: detectorsFor(
      11,
      "watch",
      {
        status: "ok",
        value: "Clear",
        detail: "Load within envelope",
        conf: 0.84,
      },
      {
        status: "watch",
        value: "Clip wear",
        detail: "2 clips low contrast near splice 3",
        conf: 0.79,
      }
    ),
  },
  {
    id: "cv-04",
    name: "CV-04 ROM feed",
    site: "Hunter Valley",
    region: "NSW",
    cameras: 3,
    beltWidthMm: 1800,
    status: "alarm",
    lastSeen: "6s ago",
    idlers: 36,
    material: "coal",
    detectors: detectorsFor(
      18,
      "alarm",
      {
        status: "alarm",
        value: "312 mm lump",
        detail: "Oversized coal / stone at bay 14",
        conf: 0.94,
      },
      {
        status: "ok",
        value: "Healthy",
        detail: "Splice 1-4 nominal",
        conf: 0.87,
      }
    ),
  },
  {
    id: "cv-01",
    name: "CV-01 Transfer",
    site: "Hunter Valley",
    region: "NSW",
    cameras: 1,
    beltWidthMm: 1200,
    status: "offline",
    lastSeen: "14m ago",
    idlers: 12,
    material: "mixed",
    detectors: detectorsFor(
      0,
      "offline",
      {
        status: "offline",
        value: "—",
        detail: "Camera offline",
        conf: 0,
      },
      {
        status: "offline",
        value: "—",
        detail: "Camera offline",
        conf: 0,
      }
    ),
  },
];

export const alerts: AlertEvidence[] = [
  {
    id: "a0",
    when: "now",
    whenIso: "2026-09-04T19:00:00+10:00",
    conveyorId: "demo1",
    conveyor: "Demo1",
    camera: "CAM-1",
    kind: "misalignment",
    text: "Along-belt demo: wander +14 mm vs idler centreline",
    status: "alarm",
    metric: "+14 mm",
    confidence: 0.9,
    overlay: baseOverlay(14, 1600),
  },
  {
    id: "a1",
    when: "18:11",
    whenIso: "2026-09-04T18:11:00+10:00",
    conveyorId: "cv-04",
    conveyor: "CV-04 ROM feed",
    camera: "CAM-1",
    kind: "misalignment",
    text: "Belt wander +18 mm at idler 14",
    status: "alarm",
    metric: "+18 mm",
    confidence: 0.93,
    overlay: baseOverlay(18, 1800, [
      {
        x: 62,
        y: 28,
        w: 18,
        h: 42,
        label: "edge drift",
        kind: "misalignment",
      },
    ]),
  },
  {
    id: "a2",
    when: "18:09",
    whenIso: "2026-09-04T18:09:22+10:00",
    conveyorId: "cv-04",
    conveyor: "CV-04 ROM feed",
    camera: "CAM-2",
    kind: "oversize",
    text: "Oversized coal lump ~312 mm on loaded belt",
    status: "alarm",
    metric: "312 mm",
    confidence: 0.94,
    overlay: baseOverlay(8, 1800, [
      { x: 44, y: 36, w: 14, h: 18, label: "lump 312mm", kind: "oversize" },
    ]),
  },
  {
    id: "a3",
    when: "17:48",
    whenIso: "2026-09-04T17:48:00+10:00",
    conveyorId: "cv-07",
    conveyor: "CV-07 Stacker",
    camera: "CAM-1",
    kind: "misalignment",
    text: "Wander holding +11 mm, under alarm threshold",
    status: "watch",
    metric: "+11 mm",
    confidence: 0.9,
    overlay: baseOverlay(11, 1400),
  },
  {
    id: "a4",
    when: "17:22",
    whenIso: "2026-09-04T17:22:41+10:00",
    conveyorId: "cv-07",
    conveyor: "CV-07 Stacker",
    camera: "CAM-1",
    kind: "splice",
    text: "Clip wear / low contrast near splice 3",
    status: "watch",
    metric: "2 clips",
    confidence: 0.79,
    overlay: baseOverlay(11, 1400, [
      { x: 38, y: 48, w: 22, h: 8, label: "splice 3", kind: "splice" },
      { x: 48, y: 52, w: 4, h: 4, label: "clip", kind: "splice" },
    ]),
  },
  {
    id: "a5",
    when: "16:02",
    whenIso: "2026-09-04T16:02:00+10:00",
    conveyorId: "cv-01",
    conveyor: "CV-01 Transfer",
    camera: "CAM-1",
    kind: "misalignment",
    text: "Camera 1 offline — no frames",
    status: "offline",
    metric: "offline",
    confidence: 0,
    overlay: baseOverlay(0, 1200),
  },
  {
    id: "a6",
    when: "15:21",
    whenIso: "2026-09-04T15:21:00+10:00",
    conveyorId: "cv-12",
    conveyor: "CV-12 Overland",
    camera: "CAM-3",
    kind: "misalignment",
    text: "Wander returned to +4 mm",
    status: "ok",
    metric: "+4 mm",
    confidence: 0.95,
    overlay: baseOverlay(4, 1600),
  },
];

export const defaultCalibration: Calibration = {
  cameraName: "CAM-1 CV-04",
  beltWidthMm: 1800,
  pixelsPerMm: 0.42,
  wanderWatchMm: 10,
  wanderAlarmMm: 15,
  oversizeMinMm: 180,
  spliceConfidenceMin: 0.75,
};

export function conveyorById(id: string) {
  return conveyors.find((c) => c.id === id);
}

export function alertsForConveyor(id: string) {
  return alerts.filter((a) => a.conveyorId === id);
}

export function overallStatus(detectors: DetectorSnapshot[]): Status {
  if (detectors.some((d) => d.status === "offline")) return "offline";
  if (detectors.some((d) => d.status === "alarm")) return "alarm";
  if (detectors.some((d) => d.status === "watch")) return "watch";
  return "ok";
}

export function overlayForConveyor(c: Conveyor): OverlayHint {
  const mis = c.detectors.find((d) => d.kind === "misalignment");
  const wander = Number.parseInt(mis?.value ?? "0", 10) || 0;
  const boxes: OverlayHint["boxes"] = [];
  for (const d of c.detectors) {
    if (d.kind === "oversize" && d.status === "alarm") {
      boxes.push({
        x: 44,
        y: 34,
        w: 16,
        h: 20,
        label: d.value,
        kind: "oversize",
      });
    }
    if (d.kind === "splice" && (d.status === "watch" || d.status === "alarm")) {
      boxes.push({
        x: 36,
        y: 46,
        w: 24,
        h: 10,
        label: d.value,
        kind: "splice",
      });
    }
  }
  return baseOverlay(wander, c.beltWidthMm, boxes.length ? boxes : undefined);
}
