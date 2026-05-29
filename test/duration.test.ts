import { describe, it, expect } from 'vitest';
import { parseDuration, formatDuration } from '../src/utils/duration';

describe('Duration Utils', () => {
  describe('parseDuration', () => {
    it('should parse seconds', () => {
      expect(parseDuration('10s')).toBe(10000);
      expect(parseDuration('1S')).toBe(1000);
    });

    it('should parse minutes', () => {
      expect(parseDuration('5m')).toBe(300000);
    });

    it('should parse hours', () => {
      expect(parseDuration('2h')).toBe(7200000);
    });

    it('should parse days', () => {
      expect(parseDuration('1d')).toBe(86400000);
      expect(parseDuration('2j')).toBe(172800000);
    });

    it('should return null for invalid inputs', () => {
      expect(parseDuration('invalid')).toBe(null);
      expect(parseDuration('')).toBe(null);
      expect(parseDuration('10 x')).toBe(null);
      expect(parseDuration(null)).toBe(null);
    });
  });

  describe('formatDuration', () => {
    it('should format seconds', () => {
      expect(formatDuration(1000)).toBe('1s');
      expect(formatDuration(5500)).toBe('5s');
    });

    it('should format mixed durations', () => {
      expect(formatDuration(86400000 + 3600000 + 60000 + 1000)).toBe('1j 1h 1min 1s');
      expect(formatDuration(7200000 + 120000)).toBe('2h 2min');
    });

    it('should fallback to 0s', () => {
      expect(formatDuration(0)).toBe('0s');
      expect(formatDuration(500)).toBe('0s');
      expect(formatDuration(null)).toBe('0s');
    });
  });
});
