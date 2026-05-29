import { describe, it, expect } from 'vitest';
import { fromWebhook, fromPollCommits, fromPollRuns, type ApiRun, type ApiCommit } from './normalize';

/**
 * Invariant central de l'archi hybride : pour un même événement réel, webhook
 * et polling DOIVENT produire des clés de dédup identiques — sinon doublons.
 */
describe('alignement des clés webhook ↔ polling', () => {
  it('push : mêmes clés de commit', () => {
    const sha = 'a'.repeat(40);
    const wh = fromWebhook('push', {
      ref: 'refs/heads/main',
      repository: { owner: { login: 'o' }, name: 'r', full_name: 'o/r' },
      commits: [{ id: sha, message: 'fix', url: 'https://x', author: { username: 'bob', name: 'Bob' } }],
      head_commit: { id: sha }
    });
    const commit: ApiCommit = { sha, html_url: 'https://x', commit: { message: 'fix', author: { name: 'Bob' } }, author: { login: 'bob' } };
    const poll = fromPollCommits('o', 'r', 'main', [commit]);
    expect(wh[0].keys).toEqual(poll.events[0].keys);
    expect(wh[0].keys[0]).toBe(`o/r:commit:${sha}`);
  });

  it('workflow_run : même clé (id + tentative)', () => {
    const run: ApiRun = {
      id: 123, name: 'CI', status: 'completed', conclusion: 'success',
      head_branch: 'main', html_url: 'https://run', run_attempt: 1, head_sha: 'abcdef0',
      actor: { login: 'bob' }, run_started_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:01:00Z'
    };
    const wh = fromWebhook('workflow_run', {
      action: 'completed',
      repository: { owner: { login: 'o' }, name: 'r' },
      workflow_run: run
    });
    const poll = fromPollRuns('o', 'r', [run], 0);
    expect(wh[0].keys).toEqual(poll.events[0].keys);
    expect(wh[0].keys[0]).toBe('o/r:workflow_run:123:1');
    expect(wh[0].important).toBe(false);
  });

  it('marque les runs échoués comme « important » (ping)', () => {
    const run: ApiRun = {
      id: 9, name: 'CI', status: 'completed', conclusion: 'failure',
      head_branch: 'main', html_url: 'https://run', run_attempt: 2, head_sha: 'abc'
    };
    const poll = fromPollRuns('o', 'r', [run], 0);
    expect(poll.events[0].important).toBe(true);
    expect(poll.events[0].keys[0]).toBe('o/r:workflow_run:9:2');
  });
});

describe('filtrage des events', () => {
  it('ignore les runs non terminés', () => {
    const wh = fromWebhook('workflow_run', {
      action: 'in_progress',
      repository: { owner: { login: 'o' }, name: 'r' },
      workflow_run: { id: 1, status: 'in_progress', conclusion: null }
    });
    expect(wh).toEqual([]);
  });
  it('ignore les pushes de tags', () => {
    const wh = fromWebhook('push', {
      ref: 'refs/tags/v1',
      repository: { owner: { login: 'o' }, name: 'r' },
      commits: [{ id: 'x', message: 'm' }]
    });
    expect(wh).toEqual([]);
  });
});

describe('fromPollCommits', () => {
  const c = (sha: string): ApiCommit => ({ sha, html_url: 'u', commit: { message: 'm', author: { name: 'A' } }, author: { login: 'a' } });

  it('ne renvoie que les commits postérieurs à lastSha, en ordre chronologique', () => {
    const res = fromPollCommits('o', 'r', 'main', [c('s3'), c('s2'), c('s1')], 's1');
    expect(res.newSha).toBe('s3');
    const data = res.events[0].data;
    expect(data.kind).toBe('push');
    if (data.kind === 'push') {
      expect(data.commits.map((x) => x.sha)).toEqual(['s2', 's3']);
    }
  });

  it('ne renvoie rien si lastSha == tête', () => {
    const res = fromPollCommits('o', 'r', 'main', [c('s3'), c('s2')], 's3');
    expect(res.events).toEqual([]);
    expect(res.newSha).toBe('s3');
  });
});
