import { describe, it, expect } from 'vitest';
import { buildEmbed, buildRows } from '../src/features/polls';

describe('polls.buildEmbed', () => {
  const base = {
    message_id: '1', guild_id: '0', channel_id: '0', host_id: '42',
    question: 'Quelle couleur ?', options: JSON.stringify(['Bleu', 'Rouge', 'Vert']),
    multi_choice: 0, anonymous: 0, ends_at: Date.now() + 60_000,
    ended: 0, created_at: 0
  };

  it('génère un embed sans vote', () => {
    const e = buildEmbed(base, []).toJSON();
    expect(e.title).toContain('Quelle couleur');
    expect(e.description).toContain('Bleu');
    expect(e.description).toContain('Rouge');
    expect(e.description).toContain('Vert');
  });

  it('reflète les pourcentages', () => {
    const e = buildEmbed(base, [
      { option_idx: 0, count: 4 },
      { option_idx: 1, count: 6 }
    ]).toJSON();
    // 4/10 = 40 %, 6/10 = 60 %
    expect(e.description).toContain('40');
    expect(e.description).toContain('60');
  });
});

describe('polls.buildRows', () => {
  it('produit 1 ligne pour 3 options', () => {
    const rows = buildRows(3, false);
    expect(rows).toHaveLength(1);
    expect(rows[0].components).toHaveLength(3);
  });

  it('produit 2 lignes pour 8 options', () => {
    const rows = buildRows(8, false);
    expect(rows).toHaveLength(2);
    expect(rows[0].components).toHaveLength(5);
    expect(rows[1].components).toHaveLength(3);
  });
});
