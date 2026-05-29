import { describe, it, expect } from 'vitest';
import { PermissionFlagsBits } from 'discord.js';
import { safeMentionAllowed, noMentions } from '../src/utils/mentions';

function fakeMember(canMentionEveryone: boolean) {
  return {
    permissions: {
      has: (flag: bigint) => flag === PermissionFlagsBits.MentionEveryone && canMentionEveryone
    }
  };
}

describe('mentions.safeMentionAllowed', () => {
  const guildId = '111';

  it('autorise @everyone si la permission est présente', () => {
    const r = safeMentionAllowed(fakeMember(true), [guildId, '222'], guildId);
    expect(r.parse).toContain('everyone');
    expect(r.roles).toEqual(['222']);
    expect(r.everyoneBlocked).toBe(false);
  });

  it('bloque @everyone si la permission est absente', () => {
    const r = safeMentionAllowed(fakeMember(false), [guildId, '222'], guildId);
    expect(r.parse).toEqual([]);
    expect(r.roles).toEqual(['222']);
    expect(r.everyoneBlocked).toBe(true);
  });

  it('ne signale pas blocage si @everyone non demandé', () => {
    const r = safeMentionAllowed(fakeMember(false), ['222', '333'], guildId);
    expect(r.everyoneBlocked).toBe(false);
    expect(r.roles).toEqual(['222', '333']);
  });
});

describe('mentions.noMentions', () => {
  it('est un objet avec parse vide', () => {
    expect(noMentions).toEqual({ parse: [] });
  });
});
