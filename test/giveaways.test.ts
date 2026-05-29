import { describe, it, expect } from 'vitest';
import { pickWinners } from '../src/features/giveaways';

describe('giveaways.pickWinners', () => {
  it('renvoie le nombre demandé quand assez de participants', () => {
    const entries = Array.from({ length: 20 }, (_, i) => `user${i}`);
    const winners = pickWinners(entries, 3);
    expect(winners).toHaveLength(3);
    expect(new Set(winners).size).toBe(3); // pas de doublon
    winners.forEach((w) => expect(entries).toContain(w));
  });

  it('ne renvoie pas plus de gagnants que de participants', () => {
    const entries = ['a', 'b'];
    const winners = pickWinners(entries, 5);
    expect(winners).toHaveLength(2);
  });

  it('renvoie un tableau vide pour une liste vide', () => {
    expect(pickWinners([], 3)).toEqual([]);
  });

  it('renvoie 0 gagnant si count=0', () => {
    expect(pickWinners(['a', 'b', 'c'], 0)).toEqual([]);
  });
});
