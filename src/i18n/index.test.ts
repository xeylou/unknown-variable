import { describe, it, expect } from 'vitest';
import { Locale } from 'discord.js';
import { resolveLang, t, ti, base, frLoc } from './index';

describe('resolveLang', () => {
  it('mappe les locales françaises sur fr', () => {
    expect(resolveLang('fr')).toBe('fr');
    expect(resolveLang('FR')).toBe('fr');
  });

  it('mappe tout le reste sur en (défaut)', () => {
    expect(resolveLang('en-US')).toBe('en');
    expect(resolveLang('en-GB')).toBe('en');
    expect(resolveLang('de')).toBe('en');
    expect(resolveLang(null)).toBe('en');
    expect(resolveLang(undefined)).toBe('en');
  });
});

describe('t', () => {
  it('renvoie la bonne langue', () => {
    expect(t('fr', 'avatar.title', { name: 'Zoé' })).toBe('Avatar de Zoé');
    expect(t('en', 'avatar.title', { name: 'Zoe' })).toBe("Zoe's avatar");
  });

  it('interpole les placeholders', () => {
    expect(t('en', 'avatar.title', { name: 'Bob' })).toContain('Bob');
  });

  it('laisse le texte intact sans variables', () => {
    expect(t('fr', 'common.error')).toContain('Une erreur');
    expect(t('en', 'common.error')).toContain('error');
  });
});

describe('ti', () => {
  it('résout la locale puis traduit', () => {
    expect(ti('fr', 'avatar.title', { name: 'Léa' })).toBe('Avatar de Léa');
    expect(ti('en-US', 'avatar.title', { name: 'Lea' })).toBe("Lea's avatar");
    expect(ti(null, 'common.error')).toContain('error');
  });
});

describe('helpers de builder', () => {
  it('base renvoie l\'anglais', () => {
    expect(base('avatar.cmd.desc')).toMatch(/Show/);
  });

  it('frLoc renvoie une carte de localisation française', () => {
    expect(frLoc('avatar.cmd.desc')).toEqual({ [Locale.French]: expect.any(String) });
    expect(frLoc('avatar.cmd.desc')[Locale.French]).toMatch(/avatar/i);
  });
});
