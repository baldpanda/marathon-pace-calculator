import { describe, expect, it } from 'vitest';
import {
  type Chunk,
  DEFAULT_PACE_SECONDS_PER_KM,
  MIN_CHUNK_KM,
  SNAP_KM,
  addChunk,
  chunkTotalSeconds,
  defaultChunks,
  removeLastChunk,
  setBoundary,
  setChunkPace,
  splitMarkers,
} from '../src/lib/chunks';
import { MARATHON_KM, formatTime } from '../src/lib/pace';

const sumKm = (chunks: Chunk[]) => chunks.reduce((acc, c) => acc + c.km, 0);

describe('defaultChunks', () => {
  it('returns a single chunk covering the full marathon at 5:00 /km', () => {
    const chunks = defaultChunks();
    expect(chunks).toHaveLength(1);
    const [only] = chunks as [Chunk];
    expect(only.km).toBe(MARATHON_KM);
    expect(only.paceSecondsPerKm).toBe(DEFAULT_PACE_SECONDS_PER_KM);
  });
});

describe('addChunk', () => {
  it('splits the only chunk into two equal halves with the same pace', () => {
    const chunks = addChunk(defaultChunks());
    expect(chunks).toHaveLength(2);
    const [a, b] = chunks as [Chunk, Chunk];
    expect(a.km).toBe(MARATHON_KM / 2);
    expect(b.km).toBe(MARATHON_KM / 2);
    expect(a.paceSecondsPerKm).toBe(DEFAULT_PACE_SECONDS_PER_KM);
    expect(b.paceSecondsPerKm).toBe(DEFAULT_PACE_SECONDS_PER_KM);
  });

  it('splits the longest chunk when sizes differ', () => {
    const chunks: Chunk[] = [
      { km: 10, paceSecondsPerKm: 270 },
      { km: 32.195, paceSecondsPerKm: 280 },
    ];
    const next = addChunk(chunks);
    expect(next).toHaveLength(3);
    const [a, b, c] = next as [Chunk, Chunk, Chunk];
    expect(a.km).toBe(10);
    expect(b.km).toBeCloseTo(16.0975, 10);
    expect(c.km).toBeCloseTo(16.0975, 10);
    expect(b.paceSecondsPerKm).toBe(280);
    expect(c.paceSecondsPerKm).toBe(280);
  });

  it('preserves the distance invariant', () => {
    let chunks = defaultChunks();
    for (let i = 0; i < 6; i++) {
      chunks = addChunk(chunks);
      expect(sumKm(chunks)).toBeCloseTo(MARATHON_KM, 10);
    }
  });
});

describe('removeLastChunk', () => {
  it('merges the last chunk into the previous one, keeping the previous pace', () => {
    const chunks: Chunk[] = [
      { km: 10, paceSecondsPerKm: 270 },
      { km: 10, paceSecondsPerKm: 280 },
      { km: 22.195, paceSecondsPerKm: 290 },
    ];
    const next = removeLastChunk(chunks);
    expect(next).toHaveLength(2);
    const [a, b] = next as [Chunk, Chunk];
    expect(a.km).toBe(10);
    expect(a.paceSecondsPerKm).toBe(270);
    expect(b.km).toBeCloseTo(32.195, 10);
    expect(b.paceSecondsPerKm).toBe(280);
  });

  it('is a no-op when only one chunk remains', () => {
    const chunks = defaultChunks();
    expect(removeLastChunk(chunks)).toEqual(chunks);
  });

  it('preserves the distance invariant across add then remove', () => {
    let chunks = defaultChunks();
    for (let i = 0; i < 4; i++) chunks = addChunk(chunks);
    while (chunks.length > 1) {
      chunks = removeLastChunk(chunks);
      expect(sumKm(chunks)).toBeCloseTo(MARATHON_KM, 10);
    }
    expect(chunks).toHaveLength(1);
    expect(sumKm(chunks)).toBeCloseTo(MARATHON_KM, 10);
  });
});

describe('setBoundary', () => {
  const evenSplit = (): Chunk[] => [
    { km: MARATHON_KM / 2, paceSecondsPerKm: 300 },
    { km: MARATHON_KM / 2, paceSecondsPerKm: 270 },
  ];

  it('snaps to the 0.05 km grid', () => {
    const [a, b] = setBoundary(evenSplit(), 0, 10.07) as [Chunk, Chunk];
    expect(a.km).toBeCloseTo(10.05, 10);
    expect(b.km).toBeCloseTo(MARATHON_KM - 10.05, 10);
  });

  it('clamps at the previous boundary', () => {
    const [a, b] = setBoundary(evenSplit(), 0, -5) as [Chunk, Chunk];
    expect(a.km).toBeCloseTo(MIN_CHUNK_KM, 10);
    expect(b.km).toBeCloseTo(MARATHON_KM - MIN_CHUNK_KM, 10);
  });

  it('clamps at the next boundary', () => {
    const [a, b] = setBoundary(evenSplit(), 0, 1000) as [Chunk, Chunk];
    expect(a.km).toBeCloseTo(MARATHON_KM - MIN_CHUNK_KM, 10);
    expect(b.km).toBeCloseTo(MIN_CHUNK_KM, 10);
  });

  it('only affects the two adjacent chunks', () => {
    const chunks: Chunk[] = [
      { km: 10, paceSecondsPerKm: 270 },
      { km: 10, paceSecondsPerKm: 280 },
      { km: 22.195, paceSecondsPerKm: 290 },
    ];
    const [a, b, c] = setBoundary(chunks, 1, 25) as [Chunk, Chunk, Chunk];
    expect(a.km).toBe(10);
    expect(a.paceSecondsPerKm).toBe(270);
    expect(b.km).toBeCloseTo(15, 10);
    expect(b.paceSecondsPerKm).toBe(280);
    expect(c.km).toBeCloseTo(17.195, 10);
    expect(c.paceSecondsPerKm).toBe(290);
  });

  it('preserves the distance invariant', () => {
    const next = setBoundary(evenSplit(), 0, 13.37);
    expect(sumKm(next)).toBeCloseTo(MARATHON_KM, 10);
  });

  it('returns the input when the index is out of range', () => {
    const chunks = evenSplit();
    expect(setBoundary(chunks, -1, 10)).toEqual(chunks);
    expect(setBoundary(chunks, 1, 10)).toEqual(chunks);
    expect(setBoundary(chunks, 5, 10)).toEqual(chunks);
  });

  it('snap granularity matches SNAP_KM', () => {
    expect(SNAP_KM).toBe(0.05);
    expect(MIN_CHUNK_KM).toBe(SNAP_KM);
  });
});

describe('setChunkPace', () => {
  it('updates only the targeted chunk pace', () => {
    const chunks: Chunk[] = [
      { km: 21.0975, paceSecondsPerKm: 300 },
      { km: 21.0975, paceSecondsPerKm: 300 },
    ];
    const [a, b] = setChunkPace(chunks, 1, 270) as [Chunk, Chunk];
    expect(a.paceSecondsPerKm).toBe(300);
    expect(b.paceSecondsPerKm).toBe(270);
    expect(a.km).toBe(21.0975);
    expect(b.km).toBe(21.0975);
  });

  it('returns input when index out of range', () => {
    const chunks = defaultChunks();
    expect(setChunkPace(chunks, 5, 250)).toEqual(chunks);
  });
});

describe('chunkTotalSeconds', () => {
  it('matches the single-chunk default at 5:00 /km', () => {
    expect(chunkTotalSeconds(defaultChunks())).toBeCloseTo(MARATHON_KM * 300, 9);
  });

  it('sums per-chunk seconds for a two-chunk split', () => {
    const chunks: Chunk[] = [
      { km: 21.0975, paceSecondsPerKm: 300 },
      { km: 21.0975, paceSecondsPerKm: 270 },
    ];
    expect(chunkTotalSeconds(chunks)).toBeCloseTo(12025.575, 6);
    expect(formatTime(chunkTotalSeconds(chunks))).toBe('03:20:26');
  });

  it('sums per-chunk seconds for a four-chunk split', () => {
    const chunks: Chunk[] = [
      { km: 10, paceSecondsPerKm: 270 },
      { km: 10, paceSecondsPerKm: 265 },
      { km: 10, paceSecondsPerKm: 260 },
      { km: 12.195, paceSecondsPerKm: 255 },
    ];
    expect(chunkTotalSeconds(chunks)).toBeCloseTo(11059.725, 6);
    expect(formatTime(chunkTotalSeconds(chunks))).toBe('03:04:20');
  });
});

type Marker = { km: number; seconds: number };

describe('splitMarkers', () => {
  it('emits one marker per chunk with cumulative km and seconds', () => {
    const chunks: Chunk[] = [
      { km: 10, paceSecondsPerKm: 300 },
      { km: 10, paceSecondsPerKm: 270 },
      { km: 22.195, paceSecondsPerKm: 280 },
    ];
    const markers = splitMarkers(chunks);
    expect(markers).toHaveLength(3);
    const [m0, m1, m2] = markers as [Marker, Marker, Marker];
    expect(m0.km).toBe(10);
    expect(m0.seconds).toBeCloseTo(3000, 6);
    expect(m1.km).toBe(20);
    expect(m1.seconds).toBeCloseTo(5700, 6);
    expect(m2.km).toBeCloseTo(MARATHON_KM, 10);
    expect(m2.seconds).toBeCloseTo(11914.6, 6);
  });

  it("last marker's km equals MARATHON_KM and seconds equals chunkTotalSeconds", () => {
    let chunks = defaultChunks();
    chunks = addChunk(chunks);
    chunks = setBoundary(chunks, 0, 13.5);
    const markers = splitMarkers(chunks);
    const last = markers[markers.length - 1] as Marker;
    expect(last.km).toBeCloseTo(MARATHON_KM, 10);
    expect(last.seconds).toBeCloseTo(chunkTotalSeconds(chunks), 9);
  });
});
