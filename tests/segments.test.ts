import { describe, expect, it } from 'vitest';
import { MARATHON_KM, formatTime } from '../src/lib/pace';
import {
  DEFAULT_PACE_SECONDS_PER_KM,
  MIN_SEGMENT_KM,
  SNAP_KM,
  type Segment,
  addSegment,
  defaultSegments,
  removeLastSegment,
  segmentTotalSeconds,
  setBoundary,
  setSegmentPace,
  splitMarkers,
} from '../src/lib/segments';

const sumKm = (segments: Segment[]) => segments.reduce((acc, c) => acc + c.km, 0);

describe('defaultSegments', () => {
  it('returns a single segment covering the full marathon at 5:00 /km', () => {
    const segments = defaultSegments();
    expect(segments).toHaveLength(1);
    const [only] = segments as [Segment];
    expect(only.km).toBe(MARATHON_KM);
    expect(only.paceSecondsPerKm).toBe(DEFAULT_PACE_SECONDS_PER_KM);
  });
});

describe('addSegment', () => {
  it('splits the only segment into two equal halves with the same pace', () => {
    const segments = addSegment(defaultSegments());
    expect(segments).toHaveLength(2);
    const [a, b] = segments as [Segment, Segment];
    expect(a.km).toBe(MARATHON_KM / 2);
    expect(b.km).toBe(MARATHON_KM / 2);
    expect(a.paceSecondsPerKm).toBe(DEFAULT_PACE_SECONDS_PER_KM);
    expect(b.paceSecondsPerKm).toBe(DEFAULT_PACE_SECONDS_PER_KM);
  });

  it('splits the longest segment when sizes differ', () => {
    const segments: Segment[] = [
      { km: 10, paceSecondsPerKm: 270 },
      { km: 32.195, paceSecondsPerKm: 280 },
    ];
    const next = addSegment(segments);
    expect(next).toHaveLength(3);
    const [a, b, c] = next as [Segment, Segment, Segment];
    expect(a.km).toBe(10);
    expect(b.km).toBeCloseTo(16.0975, 10);
    expect(c.km).toBeCloseTo(16.0975, 10);
    expect(b.paceSecondsPerKm).toBe(280);
    expect(c.paceSecondsPerKm).toBe(280);
  });

  it('preserves the distance invariant', () => {
    let segments = defaultSegments();
    for (let i = 0; i < 6; i++) {
      segments = addSegment(segments);
      expect(sumKm(segments)).toBeCloseTo(MARATHON_KM, 10);
    }
  });
});

describe('removeLastSegment', () => {
  it('merges the last segment into the previous one, keeping the previous pace', () => {
    const segments: Segment[] = [
      { km: 10, paceSecondsPerKm: 270 },
      { km: 10, paceSecondsPerKm: 280 },
      { km: 22.195, paceSecondsPerKm: 290 },
    ];
    const next = removeLastSegment(segments);
    expect(next).toHaveLength(2);
    const [a, b] = next as [Segment, Segment];
    expect(a.km).toBe(10);
    expect(a.paceSecondsPerKm).toBe(270);
    expect(b.km).toBeCloseTo(32.195, 10);
    expect(b.paceSecondsPerKm).toBe(280);
  });

  it('is a no-op when only one segment remains', () => {
    const segments = defaultSegments();
    expect(removeLastSegment(segments)).toEqual(segments);
  });

  it('preserves the distance invariant across add then remove', () => {
    let segments = defaultSegments();
    for (let i = 0; i < 4; i++) segments = addSegment(segments);
    while (segments.length > 1) {
      segments = removeLastSegment(segments);
      expect(sumKm(segments)).toBeCloseTo(MARATHON_KM, 10);
    }
    expect(segments).toHaveLength(1);
    expect(sumKm(segments)).toBeCloseTo(MARATHON_KM, 10);
  });
});

describe('setBoundary', () => {
  const evenSplit = (): Segment[] => [
    { km: MARATHON_KM / 2, paceSecondsPerKm: 300 },
    { km: MARATHON_KM / 2, paceSecondsPerKm: 270 },
  ];

  it('snaps to the 0.05 km grid', () => {
    const [a, b] = setBoundary(evenSplit(), 0, 10.07) as [Segment, Segment];
    expect(a.km).toBeCloseTo(10.05, 10);
    expect(b.km).toBeCloseTo(MARATHON_KM - 10.05, 10);
  });

  it('clamps at the previous boundary', () => {
    const [a, b] = setBoundary(evenSplit(), 0, -5) as [Segment, Segment];
    expect(a.km).toBeCloseTo(MIN_SEGMENT_KM, 10);
    expect(b.km).toBeCloseTo(MARATHON_KM - MIN_SEGMENT_KM, 10);
  });

  it('clamps at the next boundary', () => {
    const [a, b] = setBoundary(evenSplit(), 0, 1000) as [Segment, Segment];
    expect(a.km).toBeCloseTo(MARATHON_KM - MIN_SEGMENT_KM, 10);
    expect(b.km).toBeCloseTo(MIN_SEGMENT_KM, 10);
  });

  it('only affects the two adjacent segments', () => {
    const segments: Segment[] = [
      { km: 10, paceSecondsPerKm: 270 },
      { km: 10, paceSecondsPerKm: 280 },
      { km: 22.195, paceSecondsPerKm: 290 },
    ];
    const [a, b, c] = setBoundary(segments, 1, 25) as [Segment, Segment, Segment];
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
    const segments = evenSplit();
    expect(setBoundary(segments, -1, 10)).toEqual(segments);
    expect(setBoundary(segments, 1, 10)).toEqual(segments);
    expect(setBoundary(segments, 5, 10)).toEqual(segments);
  });

  it('snap granularity matches SNAP_KM', () => {
    expect(SNAP_KM).toBe(0.05);
    expect(MIN_SEGMENT_KM).toBe(SNAP_KM);
  });
});

describe('setSegmentPace', () => {
  it('updates only the targeted segment pace', () => {
    const segments: Segment[] = [
      { km: 21.0975, paceSecondsPerKm: 300 },
      { km: 21.0975, paceSecondsPerKm: 300 },
    ];
    const [a, b] = setSegmentPace(segments, 1, 270) as [Segment, Segment];
    expect(a.paceSecondsPerKm).toBe(300);
    expect(b.paceSecondsPerKm).toBe(270);
    expect(a.km).toBe(21.0975);
    expect(b.km).toBe(21.0975);
  });

  it('returns input when index out of range', () => {
    const segments = defaultSegments();
    expect(setSegmentPace(segments, 5, 250)).toEqual(segments);
  });
});

describe('segmentTotalSeconds', () => {
  it('matches the single-segment default at 5:00 /km', () => {
    expect(segmentTotalSeconds(defaultSegments())).toBeCloseTo(MARATHON_KM * 300, 9);
  });

  it('sums per-segment seconds for a two-segment split', () => {
    const segments: Segment[] = [
      { km: 21.0975, paceSecondsPerKm: 300 },
      { km: 21.0975, paceSecondsPerKm: 270 },
    ];
    expect(segmentTotalSeconds(segments)).toBeCloseTo(12025.575, 6);
    expect(formatTime(segmentTotalSeconds(segments))).toBe('03:20:26');
  });

  it('sums per-segment seconds for a four-segment split', () => {
    const segments: Segment[] = [
      { km: 10, paceSecondsPerKm: 270 },
      { km: 10, paceSecondsPerKm: 265 },
      { km: 10, paceSecondsPerKm: 260 },
      { km: 12.195, paceSecondsPerKm: 255 },
    ];
    expect(segmentTotalSeconds(segments)).toBeCloseTo(11059.725, 6);
    expect(formatTime(segmentTotalSeconds(segments))).toBe('03:04:20');
  });
});

type Marker = { km: number; seconds: number };

describe('splitMarkers', () => {
  it('emits one marker per segment with cumulative km and seconds', () => {
    const segments: Segment[] = [
      { km: 10, paceSecondsPerKm: 300 },
      { km: 10, paceSecondsPerKm: 270 },
      { km: 22.195, paceSecondsPerKm: 280 },
    ];
    const markers = splitMarkers(segments);
    expect(markers).toHaveLength(3);
    const [m0, m1, m2] = markers as [Marker, Marker, Marker];
    expect(m0.km).toBe(10);
    expect(m0.seconds).toBeCloseTo(3000, 6);
    expect(m1.km).toBe(20);
    expect(m1.seconds).toBeCloseTo(5700, 6);
    expect(m2.km).toBeCloseTo(MARATHON_KM, 10);
    expect(m2.seconds).toBeCloseTo(11914.6, 6);
  });

  it("last marker's km equals MARATHON_KM and seconds equals segmentTotalSeconds", () => {
    let segments = defaultSegments();
    segments = addSegment(segments);
    segments = setBoundary(segments, 0, 13.5);
    const markers = splitMarkers(segments);
    const last = markers[markers.length - 1] as Marker;
    expect(last.km).toBeCloseTo(MARATHON_KM, 10);
    expect(last.seconds).toBeCloseTo(segmentTotalSeconds(segments), 9);
  });
});
