import { describe, expect, it } from 'vitest';
import { DEFAULT_DISTANCE, DISTANCES, DISTANCE_KEYS, type DistanceKey } from '../src/lib/distance';
import { MARATHON_KM } from '../src/lib/pace';

describe('DISTANCES', () => {
  it('exposes the four fixed distances with exact km values', () => {
    expect(DISTANCES['5K']).toBe(5);
    expect(DISTANCES['10K']).toBe(10);
    expect(DISTANCES.Half).toBe(21.0975);
    expect(DISTANCES.Marathon).toBe(MARATHON_KM);
  });

  it('Half equals exactly half of Marathon', () => {
    expect(DISTANCES.Half * 2).toBeCloseTo(DISTANCES.Marathon, 10);
  });
});

describe('DISTANCE_KEYS', () => {
  it('enumerates the four distances in race-progression order', () => {
    expect([...DISTANCE_KEYS]).toEqual(['5K', '10K', 'Half', 'Marathon'] satisfies DistanceKey[]);
  });
});

describe('DEFAULT_DISTANCE', () => {
  it('defaults to Marathon for backward compatibility with Specs 0002 and 0003', () => {
    expect(DEFAULT_DISTANCE).toBe('Marathon');
  });
});
