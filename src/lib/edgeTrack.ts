export type EdgeFrame = {
  t: number;
  frame: number;
  edgeL: number;
  edgeR: number;
  beltC: number;
  centre: number;
  wanderMm: number;
  conf?: number;
};

export type EdgeTrack = {
  video: string;
  fps: number;
  width: number;
  height: number;
  centre: number;
  method: string;
  frames: EdgeFrame[];
};

export type YoloBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  kind: string;
  conf?: number;
  cls?: string;
};

export type YoloFrame = {
  t: number;
  frame: number;
  boxes: YoloBox[];
  edgeL?: number | null;
  edgeR?: number | null;
  centre?: number;
  wanderMm?: number;
};

export type YoloTrack = {
  video: string;
  weights: string;
  fps: number;
  width: number;
  height: number;
  mode: string;
  frames: YoloFrame[];
};

/** Nearest timeline sample for video currentTime (seconds). */
export function sampleTrackFrame<T extends { t: number }>(
  frames: T[],
  timeSec: number
): T | null {
  if (!frames.length) return null;
  let best = frames[0];
  let bestDt = Math.abs(best.t - timeSec);
  for (let i = 1; i < frames.length; i++) {
    const dt = Math.abs(frames[i].t - timeSec);
    if (dt < bestDt) {
      best = frames[i];
      bestDt = dt;
    } else if (frames[i].t > timeSec) {
      break;
    }
  }
  return best;
}

export function sampleEdgeTrack(
  track: EdgeTrack,
  timeSec: number
): EdgeFrame | null {
  return sampleTrackFrame(track.frames, timeSec);
}

export function sampleYoloTrack(
  track: YoloTrack,
  timeSec: number
): YoloFrame | null {
  return sampleTrackFrame(track.frames, timeSec);
}

export function statusFromWander(mm: number): "ok" | "watch" | "alarm" {
  const a = Math.abs(mm);
  if (a >= 15) return "alarm";
  if (a >= 10) return "watch";
  return "ok";
}
