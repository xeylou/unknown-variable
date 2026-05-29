import { describe, it, expect } from 'vitest';
import { combiningRatio } from '../src/features/automod';

describe('automod.combiningRatio (Zalgo)', () => {
  it('renvoie 0 pour du texte normal', () => {
    expect(combiningRatio('Hello world')).toBe(0);
  });

  it('détecte un excès de caractères combinants', () => {
    // « a » avec 3 combinants Unicode (U+0301 accent aigu, etc.)
    const zalgo = 'á̂̃ b́̂̃';
    expect(combiningRatio(zalgo)).toBeGreaterThan(0.3);
  });

  it('reste bas pour un texte accentué normal', () => {
    expect(combiningRatio('café')).toBeLessThan(0.3);
  });

  it('gère la chaîne vide', () => {
    expect(combiningRatio('')).toBe(0);
  });
});
