export type Status = "ok" | "watch" | "alarm" | "offline";

export type DetectorKind = "misalignment" | "oversize" | "splice";

export type Conveyor = {
  id: string;
  name: string;
  site: string;
  region: string;
  cameras: number;
  beltWidthMm: number;
  status: Status;
  lastSeen: string;
  idlers: number;
  material: "coal" | "iron_ore" | "stone" | "mixed";
  detectors: DetectorSnapshot[];
};

export type DetectorSnapshot = {
  kind: DetectorKind;
  label: string;
  status: Status;
  /** Primary metric shown in UI */
  value: string;
  detail: string;
  confidence: number;
  updatedAt: string;
};

export type AlertEvidence = {
  id: string;
  when: string;
  whenIso: string;
  conveyorId: string;
  conveyor: string;
  camera: string;
  kind: DetectorKind;
  text: string;
  status: Status;
  metric: string;
  confidence: number;
  /** Normalized overlay hints for the evidence thumbnail (0–100 %) */
  overlay: OverlayHint;
};

export type OverlayHint = {
  /** Belt left edge as % of frame width */
  edgeL: number;
  /** Belt right edge as % of frame width */
  edgeR: number;
  /** Idler reference left / right */
  idlerL: number;
  idlerR: number;
  /** Optional detection boxes */
  boxes?: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    kind: DetectorKind;
  }>;
};

export type FrameInference = {
  conveyorId: string;
  camera: string;
  ts: string;
  mode: "mock" | "model";
  wanderMm: number;
  wanderStatus: Status;
  detectors: DetectorSnapshot[];
  overlay: OverlayHint;
  fps: number;
  latencyMs: number;
};

export type Calibration = {
  cameraName: string;
  beltWidthMm: number;
  pixelsPerMm: number;
  wanderWatchMm: number;
  wanderAlarmMm: number;
  oversizeMinMm: number;
  spliceConfidenceMin: number;
};
