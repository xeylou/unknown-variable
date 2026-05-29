import { describe, it, expect } from 'vitest';
import { nextOccurrence } from '../src/features/reminders';

describe('reminders.nextOccurrence', () => {
  const base = new Date('2026-05-15T12:00:00Z').getTime();

  it('avance d\'un jour pour daily', () => {
    const next = new Date(nextOccurrence(base, 'daily'));
    expect(next.toISOString()).toBe('2026-05-16T12:00:00.000Z');
  });

  it('avance de 7 jours pour weekly', () => {
    const next = new Date(nextOccurrence(base, 'weekly'));
    expect(next.toISOString()).toBe('2026-05-22T12:00:00.000Z');
  });

  it('avance d\'un mois pour monthly', () => {
    const next = new Date(nextOccurrence(base, 'monthly'));
    expect(next.toISOString()).toBe('2026-06-15T12:00:00.000Z');
  });
});
