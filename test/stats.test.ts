import { describe, it, expect } from 'vitest';
import { statName } from '../src/features/statschannels';

describe('statschannels.statName', () => {
  it('formate « label : count »', () => {
    expect(statName('Membres', 42)).toBe('Membres : 42');
  });

  it('tronque à 100 caractères', () => {
    const long = 'X'.repeat(150);
    const out = statName(long, 1);
    expect(out.length).toBe(100);
  });
});
