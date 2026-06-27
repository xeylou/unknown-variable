import { describe, it, expect } from 'vitest';
import { validatePseudo, sameUsername } from './mclinking';

describe('validatePseudo', () => {
  it('accepte un pseudo Minecraft valide', () => {
    expect(validatePseudo('Notch')).toBe(true);
    expect(validatePseudo('abc')).toBe(true);
    expect(validatePseudo('A_b9')).toBe(true);
    expect(validatePseudo('x'.repeat(16))).toBe(true);
  });

  it('rejette longueur hors bornes', () => {
    expect(validatePseudo('ab')).toBe(false);
    expect(validatePseudo('x'.repeat(17))).toBe(false);
  });

  it('rejette ce qui permettrait une injection RCON', () => {
    expect(validatePseudo('a b')).toBe(false);   // espace
    expect(validatePseudo('a;op')).toBe(false);  // séparateur
    expect(validatePseudo('a-b')).toBe(false);   // tiret
    expect(validatePseudo('héhé')).toBe(false);  // non ASCII
  });
});

describe('sameUsername', () => {
  it('compare les pseudos sans tenir compte de la casse', () => {
    expect(sameUsername('Bob', 'bob')).toBe(true);
    expect(sameUsername('NoTcH', 'notch')).toBe(true);
    expect(sameUsername('Bob', 'bobby')).toBe(false);
  });
});
