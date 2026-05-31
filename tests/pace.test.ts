import { describe, expect, it } from 'vitest';
import {
  MARATHON_KM,
  formatPace,
  formatTime,
  paceToTotalSeconds,
  parsePace,
  parseTime,
  totalSecondsToPace,
} from '../src/lib/pace';

describe('MARATHON_KM', () => {
  it('is the IAAF marathon distance', () => {
    expect(MARATHON_KM).toBe(42.195);
  });
});

describe('parsePace', () => {
  it('parses mm:ss', () => {
    expect(parsePace('4:30')).toBe(270);
    expect(parsePace('04:30')).toBe(270);
    expect(parsePace('5:00')).toBe(300);
    expect(parsePace('10:00')).toBe(600);
    expect(parsePace('  4:30  ')).toBe(270);
  });
  it('returns null for empty or invalid input', () => {
    expect(parsePace('')).toBeNull();
    expect(parsePace('   ')).toBeNull();
    expect(parsePace('abc')).toBeNull();
    expect(parsePace('4')).toBeNull();
    expect(parsePace('4:5')).toBeNull();
    expect(parsePace('4:60')).toBeNull();
    expect(parsePace('4:05a')).toBeNull();
    expect(parsePace('-4:00')).toBeNull();
  });
});

describe('formatPace', () => {
  it('formats m:ss with zero-padded seconds', () => {
    expect(formatPace(270)).toBe('4:30');
    expect(formatPace(300)).toBe('5:00');
    expect(formatPace(600)).toBe('10:00');
    expect(formatPace(0)).toBe('0:00');
  });
  it('rounds fractional seconds to nearest', () => {
    expect(formatPace(298.6)).toBe('4:59');
    expect(formatPace(341.27)).toBe('5:41');
  });
  it('returns empty string for invalid input', () => {
    expect(formatPace(Number.NaN)).toBe('');
    expect(formatPace(-1)).toBe('');
    expect(formatPace(Number.POSITIVE_INFINITY)).toBe('');
  });
});

describe('parseTime', () => {
  it('parses hh:mm:ss', () => {
    expect(parseTime('3:09:39')).toBe(3 * 3600 + 9 * 60 + 39);
    expect(parseTime('03:09:39')).toBe(3 * 3600 + 9 * 60 + 39);
    expect(parseTime('00:00:01')).toBe(1);
  });
  it('falls back to mm:ss for sub-hour times', () => {
    expect(parseTime('59:00')).toBe(59 * 60);
    expect(parseTime('5:30')).toBe(5 * 60 + 30);
  });
  it('returns null for empty or invalid input', () => {
    expect(parseTime('')).toBeNull();
    expect(parseTime('abc')).toBeNull();
    expect(parseTime('3:60:00')).toBeNull();
    expect(parseTime('3:09:9')).toBeNull();
    expect(parseTime('-3:00:00')).toBeNull();
  });
});

describe('formatTime', () => {
  it('formats hh:mm:ss with zero-padded fields', () => {
    expect(formatTime(3 * 3600 + 9 * 60 + 39)).toBe('03:09:39');
    expect(formatTime(0)).toBe('00:00:00');
    expect(formatTime(60)).toBe('00:01:00');
    expect(formatTime(36000)).toBe('10:00:00');
  });
  it('rounds fractional seconds to nearest', () => {
    expect(formatTime(10126.8)).toBe('02:48:47');
    expect(formatTime(12658.5)).toBe('03:30:59');
  });
  it('returns empty string for invalid input', () => {
    expect(formatTime(Number.NaN)).toBe('');
    expect(formatTime(-1)).toBe('');
  });
});

describe('paceToTotalSeconds / totalSecondsToPace', () => {
  it('computes total marathon time from pace', () => {
    expect(paceToTotalSeconds(240)).toBeCloseTo(10126.8, 5);
    expect(paceToTotalSeconds(300)).toBeCloseTo(12658.5, 5);
  });
  it('computes pace from total marathon time', () => {
    expect(totalSecondsToPace(12600)).toBeCloseTo(298.6135, 3);
    expect(totalSecondsToPace(14400)).toBeCloseTo(341.2727, 3);
  });
});

describe('canonical examples from spec', () => {
  it('pace 4:00 -> total 02:48:47', () => {
    const sec = parsePace('4:00');
    expect(sec).not.toBeNull();
    expect(formatTime(paceToTotalSeconds(sec as number))).toBe('02:48:47');
  });
  it('pace 5:00 -> total 03:30:59', () => {
    const sec = parsePace('5:00');
    expect(sec).not.toBeNull();
    expect(formatTime(paceToTotalSeconds(sec as number))).toBe('03:30:59');
  });
  it('total 03:30:00 -> pace 4:59', () => {
    const sec = parseTime('03:30:00');
    expect(sec).not.toBeNull();
    expect(formatPace(totalSecondsToPace(sec as number))).toBe('4:59');
  });
  it('total 04:00:00 -> pace 5:41', () => {
    const sec = parseTime('04:00:00');
    expect(sec).not.toBeNull();
    expect(formatPace(totalSecondsToPace(sec as number))).toBe('5:41');
  });
});

describe('paceToTotalSeconds / totalSecondsToPace at non-marathon distances', () => {
  it('5K pace 4:00 -> total 00:20:00', () => {
    expect(formatTime(paceToTotalSeconds(240, 5))).toBe('00:20:00');
  });
  it('10K pace 3:45 -> total 00:37:30', () => {
    expect(formatTime(paceToTotalSeconds(225, 10))).toBe('00:37:30');
  });
  it('Half pace 4:30 -> total 01:34:56', () => {
    expect(formatTime(paceToTotalSeconds(270, 21.0975))).toBe('01:34:56');
  });
  it('round-trips through totalSecondsToPace at each distance', () => {
    for (const km of [5, 10, 21.0975, MARATHON_KM]) {
      const total = paceToTotalSeconds(285, km);
      expect(totalSecondsToPace(total, km)).toBeCloseTo(285, 9);
    }
  });
  it('omitting distanceKm preserves the marathon default', () => {
    expect(paceToTotalSeconds(300)).toBe(paceToTotalSeconds(300, MARATHON_KM));
    expect(totalSecondsToPace(12658.5)).toBe(totalSecondsToPace(12658.5, MARATHON_KM));
  });
});

describe('round-trip', () => {
  it('formatPace(parsePace(x)) === x for canonical paces', () => {
    for (const pace of ['3:30', '4:00', '4:30', '5:00', '6:15', '10:00']) {
      const parsed = parsePace(pace);
      expect(parsed).not.toBeNull();
      expect(formatPace(parsed as number)).toBe(pace);
    }
  });
  it('formatTime(parseTime(x)) === x for canonical times', () => {
    for (const time of ['02:48:47', '03:30:00', '04:00:00', '05:00:00']) {
      const parsed = parseTime(time);
      expect(parsed).not.toBeNull();
      expect(formatTime(parsed as number)).toBe(time);
    }
  });
});
