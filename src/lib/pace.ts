export const MARATHON_KM = 42.195;

const PACE_RE = /^(\d+):([0-5]\d)$/;
const HMS_RE = /^(\d+):([0-5]\d):([0-5]\d)$/;

export function parsePace(input: string): number | null {
  if (typeof input !== 'string') return null;
  const match = PACE_RE.exec(input.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatPace(secondsPerKm: number): string {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm < 0) return '';
  const total = Math.round(secondsPerKm);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function parseTime(input: string): number | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  const hms = HMS_RE.exec(trimmed);
  if (hms) {
    return Number(hms[1]) * 3600 + Number(hms[2]) * 60 + Number(hms[3]);
  }
  const ms = PACE_RE.exec(trimmed);
  if (ms) {
    return Number(ms[1]) * 60 + Number(ms[2]);
  }
  return null;
}

export function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '';
  const total = Math.round(totalSeconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function paceToTotalSeconds(secondsPerKm: number, distanceKm: number = MARATHON_KM): number {
  return secondsPerKm * distanceKm;
}

export function totalSecondsToPace(totalSeconds: number, distanceKm: number = MARATHON_KM): number {
  return totalSeconds / distanceKm;
}
