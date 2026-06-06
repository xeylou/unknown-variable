import { describe, it, expect, vi } from 'vitest';
import { PermissionFlagsBits, type GuildMember } from 'discord.js';

// Mock du module config pour fixer les catégories de tickets.
vi.mock('../config', () => ({
  default: {
    guildId: 'GUILD',
    staffRoleId: 'STAFF',
    adminRoleId: 'ADMIN',
    tickets: {
      categories: [
        { value: 'support', label: 'Support général', description: '', emoji: '', staffRoleId: 'TS_SUPPORT' },
        { value: 'bug',     label: 'Signaler un bug',  description: '', emoji: '', staffRoleId: 'TS_BUG' },
        { value: 'build',   label: 'Demande de build', description: '', emoji: '', staffRoleId: 'TS_BUILD' },
        { value: 'other',   label: 'Autre',            description: '', emoji: '', staffRoleId: '' }
      ]
    },
    colors: { primary: 0, neutral: 0, success: 0, danger: 0, warning: 0 }
  }
}));

// `guildSettings` (via ticketScope) importe `prisma` ; on l'évite ici.
vi.mock('../database', () => ({ prisma: {} }));

import { categoriesVisibleTo, categoryLabel } from './ticketScope';

interface Opts {
  id?: string;
  ownerId?: string;
  permissions?: bigint[];
  roleIds?: string[];
}

function mockMember(opts: Opts): GuildMember {
  const id = opts.id ?? 'user-1';
  const ownerId = opts.ownerId ?? 'owner';
  const perms = opts.permissions ?? [];
  const roles = new Set(opts.roleIds ?? []);
  return {
    id,
    guild: { ownerId, id: 'GUILD' },
    permissions: {
      has: (flag: bigint) => perms.includes(flag),
      any: (flags: bigint[]) => flags.some((f) => perms.includes(f))
    },
    roles: {
      cache: { has: (rid: string) => roles.has(rid) }
    }
  } as unknown as GuildMember;
}

describe('categoriesVisibleTo', () => {
  it('returns empty list for null/undefined member', () => {
    expect(categoriesVisibleTo(null)).toEqual([]);
    expect(categoriesVisibleTo(undefined)).toEqual([]);
  });

  it('returns all categories for a staff member', () => {
    const m = mockMember({ roleIds: ['STAFF'] });
    expect(categoriesVisibleTo(m)).toEqual(['support', 'bug', 'build', 'other']);
  });

  it('returns all categories for an admin', () => {
    const m = mockMember({ roleIds: ['ADMIN'] });
    expect(categoriesVisibleTo(m)).toEqual(['support', 'bug', 'build', 'other']);
  });

  it('returns all categories for a member with Discord moderation perm', () => {
    const m = mockMember({ permissions: [PermissionFlagsBits.ManageMessages] });
    expect(categoriesVisibleTo(m)).toEqual(['support', 'bug', 'build', 'other']);
  });

  it('returns the matching category for a single-category ticket-staff', () => {
    const m = mockMember({ roleIds: ['TS_BUG'] });
    expect(categoriesVisibleTo(m)).toEqual(['bug']);
  });

  it('returns multiple categories for a ticket-staff in several categories', () => {
    const m = mockMember({ roleIds: ['TS_BUG', 'TS_BUILD'] });
    expect(categoriesVisibleTo(m)).toEqual(['bug', 'build']);
  });

  it('skips categories whose staffRoleId is empty', () => {
    // Even if somehow the member had an "empty-id" role, the empty staffRoleId
    // must not match.
    const m = mockMember({ roleIds: [''] });
    expect(categoriesVisibleTo(m)).toEqual([]);
  });

  it('returns empty for a plain member', () => {
    expect(categoriesVisibleTo(mockMember({}))).toEqual([]);
  });
});

describe('categoryLabel', () => {
  it('returns the configured label', () => {
    expect(categoryLabel('bug')).toBe('Signaler un bug');
    expect(categoryLabel('support')).toBe('Support général');
  });

  it('falls back to the raw value when the category was removed from config', () => {
    expect(categoryLabel('discontinued')).toBe('discontinued');
  });

  it('returns "Inconnue" for null/undefined/empty', () => {
    expect(categoryLabel(null)).toBe('Inconnue');
    expect(categoryLabel(undefined)).toBe('Inconnue');
    expect(categoryLabel('')).toBe('Inconnue');
  });
});
