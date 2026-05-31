import { MARATHON_KM } from './pace';

export type Segment = {
  km: number;
  paceSecondsPerKm: number;
};

export const DEFAULT_PACE_SECONDS_PER_KM = 300;
export const SNAP_KM = 0.05;
export const MIN_SEGMENT_KM = SNAP_KM;

export function defaultSegments(distanceKm: number = MARATHON_KM): Segment[] {
  return [{ km: distanceKm, paceSecondsPerKm: DEFAULT_PACE_SECONDS_PER_KM }];
}

export function singleSegment(distanceKm: number, paceSecondsPerKm: number): Segment[] {
  return [{ km: distanceKm, paceSecondsPerKm }];
}

export function addSegment(segments: Segment[]): Segment[] {
  if (segments.length === 0) return defaultSegments();
  let longestIdx = 0;
  let longestKm = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < segments.length; i++) {
    const c = segments[i];
    if (c && c.km > longestKm) {
      longestIdx = i;
      longestKm = c.km;
    }
  }
  const target = segments[longestIdx];
  if (!target || target.km < MIN_SEGMENT_KM * 2) return segments;
  const half = target.km / 2;
  const left: Segment = { km: half, paceSecondsPerKm: target.paceSecondsPerKm };
  const right: Segment = { km: target.km - half, paceSecondsPerKm: target.paceSecondsPerKm };
  return [...segments.slice(0, longestIdx), left, right, ...segments.slice(longestIdx + 1)];
}

export function removeLastSegment(segments: Segment[]): Segment[] {
  if (segments.length <= 1) return segments;
  const last = segments[segments.length - 1];
  const prev = segments[segments.length - 2];
  if (!last || !prev) return segments;
  const merged: Segment = {
    km: prev.km + last.km,
    paceSecondsPerKm: prev.paceSecondsPerKm,
  };
  return [...segments.slice(0, segments.length - 2), merged];
}

function snap(km: number): number {
  return Math.round(km / SNAP_KM) * SNAP_KM;
}

export function setBoundary(segments: Segment[], index: number, km: number): Segment[] {
  if (index < 0 || index >= segments.length - 1) return segments;
  const left = segments[index];
  const right = segments[index + 1];
  if (!left || !right) return segments;
  let cumPrev = 0;
  for (let i = 0; i < index; i++) {
    const c = segments[i];
    if (c) cumPrev += c.km;
  }
  const cumNext = cumPrev + left.km + right.km;
  const min = cumPrev + MIN_SEGMENT_KM;
  const max = cumNext - MIN_SEGMENT_KM;
  const snapped = snap(km);
  const clamped = Math.min(max, Math.max(min, snapped));
  const newLeftKm = clamped - cumPrev;
  const newRightKm = cumNext - clamped;
  return segments.map((c, i) => {
    if (i === index) return { ...c, km: newLeftKm };
    if (i === index + 1) return { ...c, km: newRightKm };
    return c;
  });
}

export function setSegmentPace(
  segments: Segment[],
  index: number,
  paceSecondsPerKm: number,
): Segment[] {
  if (index < 0 || index >= segments.length) return segments;
  return segments.map((c, i) => (i === index ? { ...c, paceSecondsPerKm } : c));
}

export function segmentTotalSeconds(segments: Segment[]): number {
  let total = 0;
  for (const c of segments) total += c.km * c.paceSecondsPerKm;
  return total;
}

export function splitMarkers(segments: Segment[]): Array<{ km: number; seconds: number }> {
  const out: Array<{ km: number; seconds: number }> = [];
  let cumKm = 0;
  let cumSeconds = 0;
  for (const c of segments) {
    cumKm += c.km;
    cumSeconds += c.km * c.paceSecondsPerKm;
    out.push({ km: cumKm, seconds: cumSeconds });
  }
  return out;
}
