import { describe, it, expect } from 'vitest';
import { normalizeName } from './normalizeName';

describe('normalizeName', () => {
  it('dé-hoist : retire les caractères de tête non alphanumériques', () => {
    expect(normalizeName('!!!Bob')).toBe('Bob');
    expect(normalizeName('...zzz')).toBe('zzz');
    expect(normalizeName('___Admin')).toBe('Admin');
  });

  it('translittère les accents via NFKD', () => {
    expect(normalizeName('Désiré')).toBe('Desire');
    expect(normalizeName('Éléonore')).toBe('Eleonore');
  });

  it('neutralise le Zalgo (marques combinantes)', () => {
    expect(normalizeName('b̀́̂ob')).toBe('bob');
  });

  it('ramène les polices fantaisie (caractères de compatibilité) en ASCII', () => {
    expect(normalizeName('\u{1D401}\u{1D427}\u{1D427}')).toBe('Bnn'); // 𝐁𝐧𝐧
  });

  it('compresse les espaces et coupe les extrémités', () => {
    expect(normalizeName('  a   b   ')).toBe('a b');
  });

  it('renvoie une chaîne vide quand rien de latin ne subsiste', () => {
    expect(normalizeName('🎮🔥')).toBe('');
    expect(normalizeName('Привет')).toBe('');
  });

  it('laisse intact un pseudo déjà propre', () => {
    expect(normalizeName('xX_Pro-Gamer.99')).toBe('xX_Pro-Gamer.99');
  });

  it('respecte la limite de 32 caractères', () => {
    expect(normalizeName('a'.repeat(40))).toHaveLength(32);
  });
});
