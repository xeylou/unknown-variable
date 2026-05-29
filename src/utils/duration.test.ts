import { describe, it, expect } from 'vitest';
import { parseDuration, formatDuration } from './duration';

describe('parseDuration', () => {
  it('accepts seconds / minutes / hours / days', () => {
    expect(parseDuration('30s')).toBe(30_000);
    expect(parseDuration('5m')).toBe(5 * 60_000);
    expect(parseDuration('2h')).toBe(2 * 3_600_000);
    expect(parseDuration('1d')).toBe(86_400_000);
  });

  it('treats `j` as a synonym of `d` (French)', () => {
    expect(parseDuration('1j')).toBe(parseDuration('1d'));
    expect(parseDuration('7j')).toBe(7 * 86_400_000);
  });

  it('is case-insensitive on the unit', () => {
    expect(parseDuration('10M')).toBe(parseDuration('10m'));
    expect(parseDuration('2H')).toBe(parseDuration('2h'));
  });

  it('tolerates whitespace between value and unit', () => {
    expect(parseDuration('10 m')).toBe(parseDuration('10m'));
    expect(parseDuration(' 5h ')).toBe(parseDuration('5h'));
  });

  it('returns null for invalid input', () => {
    expect(parseDuration('')).toBeNull();
    expect(parseDuration(null)).toBeNull();
    expect(parseDuration(undefined)).toBeNull();
    expect(parseDuration('abc')).toBeNull();
    expect(parseDuration('10x')).toBeNull();
    expect(parseDuration('10')).toBeNull();
    expect(parseDuration('m10')).toBeNull();
    expect(parseDuration('-5m')).toBeNull();
  });
});

describe('formatDuration', () => {
  it('returns "0s" for falsy / sub-second inputs', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(null)).toBe('0s');
    expect(formatDuration(undefined)).toBe('0s');
    expect(formatDuration(500)).toBe('0s');
  });

  it('formats single units cleanly', () => {
    expect(formatDuration(1000)).toBe('1s');
    expect(formatDuration(60_000)).toBe('1min');
    expect(formatDuration(3_600_000)).toBe('1h');
    expect(formatDuration(86_400_000)).toBe('1j');
  });

  it('combines units in order j → h → min → s', () => {
    const ms = 86_400_000 + 2 * 3_600_000 + 30 * 60_000 + 15_000;
    expect(formatDuration(ms)).toBe('1j 2h 30min 15s');
  });

  it('skips zero units', () => {
    expect(formatDuration(86_400_000 + 15_000)).toBe('1j 15s');
    expect(formatDuration(3_600_000 + 60_000)).toBe('1h 1min');
  });
});
