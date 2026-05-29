import { describe, it, expect } from 'vitest';
import { applyPlaceholders } from './placeholders';
import type { GuildMember } from 'discord.js';

/**
 * Mock minimal de GuildMember — applyPlaceholders n'utilise que :
 *   member.toString(), member.user.username,
 *   member.guild.name, member.guild.memberCount.
 */
function mockMember(opts: {
  mention?: string;
  username?: string;
  guildName?: string;
  memberCount?: number;
}): GuildMember {
  return {
    toString: () => opts.mention ?? '<@123>',
    user: { username: opts.username ?? 'Alice' },
    guild: {
      name: opts.guildName ?? 'TestServer',
      memberCount: opts.memberCount ?? 42
    }
  } as unknown as GuildMember;
}

describe('applyPlaceholders', () => {
  it('replaces {user} with the mention', () => {
    const out = applyPlaceholders('Salut {user} !', mockMember({ mention: '<@999>' }));
    expect(out).toBe('Salut <@999> !');
  });

  it('replaces {username} with the raw username (no ping)', () => {
    const out = applyPlaceholders('Bienvenue {username}.', mockMember({ username: 'Bob' }));
    expect(out).toBe('Bienvenue Bob.');
  });

  it('replaces {server} with the guild name', () => {
    const out = applyPlaceholders('Sur {server}', mockMember({ guildName: 'Builders' }));
    expect(out).toBe('Sur Builders');
  });

  it('replaces {count} with the member count as a string', () => {
    const out = applyPlaceholders('Membre #{count}', mockMember({ memberCount: 1337 }));
    expect(out).toBe('Membre #1337');
  });

  it('substitutes all placeholders simultaneously', () => {
    const tpl = 'Hey {user} alias {username}, bienvenue sur {server} ({count} membres) !';
    const out = applyPlaceholders(tpl, mockMember({
      mention: '<@1>', username: 'Z', guildName: 'S', memberCount: 9
    }));
    expect(out).toBe('Hey <@1> alias Z, bienvenue sur S (9 membres) !');
  });

  it('replaces every occurrence of the same placeholder', () => {
    const out = applyPlaceholders('{username} {username} {username}', mockMember({ username: 'A' }));
    expect(out).toBe('A A A');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(applyPlaceholders('Hello {nope}', mockMember({}))).toBe('Hello {nope}');
  });
});
