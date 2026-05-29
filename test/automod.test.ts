import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/features/automod';

describe('automod.tokenize', () => {
  it('découpe sur les espaces et la ponctuation', () => {
    expect(tokenize('Hello, world!')).toEqual(['hello', 'world']);
    expect(tokenize('a.b,c;d:e!f?g')).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
  });

  it('met en minuscules', () => {
    expect(tokenize('FOO Bar BAZ')).toEqual(['foo', 'bar', 'baz']);
  });

  it('évite les faux positifs « con » dans « conseil »', () => {
    const tokens = new Set(tokenize('Je te donne un conseil important'));
    expect(tokens.has('con')).toBe(false);
    expect(tokens.has('conseil')).toBe(true);
  });

  it('match correctement un mot exact', () => {
    const tokens = new Set(tokenize('Tu es vraiment con'));
    expect(tokens.has('con')).toBe(true);
  });

  it('gère les caractères vides', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('   ')).toEqual([]);
  });
});
