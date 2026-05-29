import { describe, it, expect } from 'vitest';
import {
  dedupKey, parseRepoSlug, branchFromRef, commitTitle, truncate, shortSha,
  runIcon, isFailureConclusion, prIcon, canonicalPrAction
} from './format';

describe('parseRepoSlug', () => {
  it('accepte « owner/repo »', () => {
    expect(parseRepoSlug('octocat/Hello-World')).toEqual({ owner: 'octocat', repo: 'Hello-World' });
  });
  it('accepte une URL GitHub avec .git', () => {
    expect(parseRepoSlug('https://github.com/octocat/Hello-World.git')).toEqual({ owner: 'octocat', repo: 'Hello-World' });
  });
  it('extrait owner/repo d\'une URL de PR', () => {
    expect(parseRepoSlug('https://github.com/octocat/Hello-World/pull/42')).toEqual({ owner: 'octocat', repo: 'Hello-World' });
  });
  it('renvoie null sur une entrée invalide', () => {
    expect(parseRepoSlug('pasunslug')).toBeNull();
    expect(parseRepoSlug('')).toBeNull();
  });
});

describe('dedupKey', () => {
  it('compose owner/repo:type:partie', () => {
    expect(dedupKey('o/r', 'commit', 'abc')).toBe('o/r:commit:abc');
    expect(dedupKey('o/r', 'workflow_run', 123, 1)).toBe('o/r:workflow_run:123:1');
  });
});

describe('branchFromRef', () => {
  it('extrait la branche', () => {
    expect(branchFromRef('refs/heads/main')).toBe('main');
    expect(branchFromRef('refs/heads/feature/x')).toBe('feature/x');
    expect(branchFromRef('refs/tags/v1.0')).toBe('v1.0');
    expect(branchFromRef(null)).toBe('');
  });
});

describe('commitTitle / truncate / shortSha', () => {
  it('prend la première ligne du message', () => {
    expect(commitTitle('Fix bug\n\nDétails ici')).toBe('Fix bug');
  });
  it('tronque avec une ellipse', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcd…');
    expect(truncate('court', 10)).toBe('court');
  });
  it('raccourcit un sha à 7 caractères', () => {
    expect(shortSha('0123456789abcdef')).toBe('0123456');
  });
});

describe('runIcon / isFailureConclusion', () => {
  it('mappe l\'état d\'un run', () => {
    expect(runIcon('completed', 'success')).toBe('✅');
    expect(runIcon('completed', 'failure')).toBe('❌');
    expect(runIcon('in_progress', null)).toBe('🟡');
  });
  it('détecte les échecs « durs »', () => {
    expect(isFailureConclusion('failure')).toBe(true);
    expect(isFailureConclusion('timed_out')).toBe(true);
    expect(isFailureConclusion('success')).toBe(false);
    expect(isFailureConclusion(null)).toBe(false);
  });
});

describe('canonicalPrAction', () => {
  it('priorise le merge', () => {
    expect(canonicalPrAction({ webhookAction: 'closed', merged: true })).toBe('merged');
  });
  it('mappe les actions webhook', () => {
    expect(canonicalPrAction({ webhookAction: 'opened' })).toBe('opened');
    expect(canonicalPrAction({ webhookAction: 'reopened' })).toBe('reopened');
    expect(canonicalPrAction({ webhookAction: 'ready_for_review' })).toBe('ready');
    expect(canonicalPrAction({ webhookAction: 'closed', merged: false })).toBe('closed');
  });
  it('ignore les actions sans intérêt', () => {
    expect(canonicalPrAction({ webhookAction: 'edited' })).toBeNull();
    expect(canonicalPrAction({ webhookAction: 'synchronize' })).toBeNull();
  });
  it('déduit l\'action depuis l\'état (polling, sans action webhook)', () => {
    expect(canonicalPrAction({ state: 'closed' })).toBe('closed');
    expect(canonicalPrAction({ state: 'open' })).toBe('opened');
  });
  it('marque l\'icône de PR', () => {
    expect(prIcon('merged')).toBe('🟣');
    expect(prIcon('opened')).toBe('🟢');
  });
});
