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

/** Nearest timeline sample for video currentTime (seconds). */
export function sampleEdgeTrack(
  track: EdgeTrack,
  timeSec: number
): EdgeFrame | null {
  const frames = track.frames;
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

export function statusFromWander(mm: number): "ok" | "watch" | "alarm" {
  const a = Math.abs(mm);
  if (a >= 15) return "alarm";
  if (a >= 10) return "watch";
  return "ok";
}
