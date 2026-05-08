import { MARATHON_KM } from './pace';

export type Chunk = {
  km: number;
  paceSecondsPerKm: number;
};

export const DEFAULT_PACE_SECONDS_PER_KM = 300;
export const SNAP_KM = 0.05;
export const MIN_CHUNK_KM = SNAP_KM;

export function defaultChunks(): Chunk[] {
  return [{ km: MARATHON_KM, paceSecondsPerKm: DEFAULT_PACE_SECONDS_PER_KM }];
}

export function addChunk(chunks: Chunk[]): Chunk[] {
  if (chunks.length === 0) return defaultChunks();
  let longestIdx = 0;
  let longestKm = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    if (c && c.km > longestKm) {
      longestIdx = i;
      longestKm = c.km;
    }
  }
  const target = chunks[longestIdx];
  if (!target || target.km < MIN_CHUNK_KM * 2) return chunks;
  const half = target.km / 2;
  const left: Chunk = { km: half, paceSecondsPerKm: target.paceSecondsPerKm };
  const right: Chunk = { km: target.km - half, paceSecondsPerKm: target.paceSecondsPerKm };
  return [...chunks.slice(0, longestIdx), left, right, ...chunks.slice(longestIdx + 1)];
}

export function removeLastChunk(chunks: Chunk[]): Chunk[] {
  if (chunks.length <= 1) return chunks;
  const last = chunks[chunks.length - 1];
  const prev = chunks[chunks.length - 2];
  if (!last || !prev) return chunks;
  const merged: Chunk = {
    km: prev.km + last.km,
    paceSecondsPerKm: prev.paceSecondsPerKm,
  };
  return [...chunks.slice(0, chunks.length - 2), merged];
}

function snap(km: number): number {
  return Math.round(km / SNAP_KM) * SNAP_KM;
}

export function setBoundary(chunks: Chunk[], index: number, km: number): Chunk[] {
  if (index < 0 || index >= chunks.length - 1) return chunks;
  const left = chunks[index];
  const right = chunks[index + 1];
  if (!left || !right) return chunks;
  let cumPrev = 0;
  for (let i = 0; i < index; i++) {
    const c = chunks[i];
    if (c) cumPrev += c.km;
  }
  const cumNext = cumPrev + left.km + right.km;
  const min = cumPrev + MIN_CHUNK_KM;
  const max = cumNext - MIN_CHUNK_KM;
  const snapped = snap(km);
  const clamped = Math.min(max, Math.max(min, snapped));
  const newLeftKm = clamped - cumPrev;
  const newRightKm = cumNext - clamped;
  return chunks.map((c, i) => {
    if (i === index) return { ...c, km: newLeftKm };
    if (i === index + 1) return { ...c, km: newRightKm };
    return c;
  });
}

export function setChunkPace(chunks: Chunk[], index: number, paceSecondsPerKm: number): Chunk[] {
  if (index < 0 || index >= chunks.length) return chunks;
  return chunks.map((c, i) => (i === index ? { ...c, paceSecondsPerKm } : c));
}

export function chunkTotalSeconds(chunks: Chunk[]): number {
  let total = 0;
  for (const c of chunks) total += c.km * c.paceSecondsPerKm;
  return total;
}

export function splitMarkers(chunks: Chunk[]): Array<{ km: number; seconds: number }> {
  const out: Array<{ km: number; seconds: number }> = [];
  let cumKm = 0;
  let cumSeconds = 0;
  for (const c of chunks) {
    cumKm += c.km;
    cumSeconds += c.km * c.paceSecondsPerKm;
    out.push({ km: cumKm, seconds: cumSeconds });
  }
  return out;
}
