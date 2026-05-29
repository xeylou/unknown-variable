import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PermissionFlagsBits, type GuildMember } from 'discord.js';

// Mock du module config pour contrôler les rôles utilisés par les helpers.
vi.mock('../config', () => ({
  default: {
    staffRoleId: 'STAFF',
    adminRoleId: 'ADMIN',
    tickets: {
      categories: [
        { value: 'support', label: 'Support',  description: '', emoji: '', staffRoleId: 'TS_SUPPORT' },
        { value: 'bug',     label: 'Bug',      description: '', emoji: '', staffRoleId: 'TS_BUG' },
        { value: 'other',   label: 'Other',    description: '', emoji: '', staffRoleId: '' }
      ]
    },
    colors: { primary: 0, neutral: 0, success: 0, danger: 0, warning: 0 }
  }
}));

import {
  isAdmin, isStaff, isTicketStaff, ticketStaffRoleIds,
  viewerTier, canSee
} from './permissions';

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
    guild: { ownerId },
    permissions: {
      has: (flag: bigint) => perms.includes(flag),
      any: (flags: bigint[]) => flags.some((f) => perms.includes(f))
    },
    roles: {
      cache: { has: (rid: string) => roles.has(rid) }
    }
  } as unknown as GuildMember;
}

describe('isAdmin', () => {
  it('returns false for null/undefined', () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });

  it('returns true for the guild owner', () => {
    expect(isAdmin(mockMember({ id: 'X', ownerId: 'X' }))).toBe(true);
  });

  it('returns true when the member has the Discord Administrator permission', () => {
    expect(isAdmin(mockMember({ permissions: [PermissionFlagsBits.Administrator] }))).toBe(true);
  });

  it('returns true when the member holds ADMIN_ROLE_ID', () => {
    expect(isAdmin(mockMember({ roleIds: ['ADMIN'] }))).toBe(true);
  });

  it('returns false for a plain member', () => {
    expect(isAdmin(mockMember({}))).toBe(false);
  });
});

describe('isStaff', () => {
  it('returns true for any admin', () => {
    expect(isStaff(mockMember({ roleIds: ['ADMIN'] }))).toBe(true);
  });

  it('returns true for STAFF_ROLE_ID holders', () => {
    expect(isStaff(mockMember({ roleIds: ['STAFF'] }))).toBe(true);
  });

  it('returns true for members with moderation perms', () => {
    expect(isStaff(mockMember({ permissions: [PermissionFlagsBits.KickMembers] }))).toBe(true);
    expect(isStaff(mockMember({ permissions: [PermissionFlagsBits.BanMembers] }))).toBe(true);
    expect(isStaff(mockMember({ permissions: [PermissionFlagsBits.ModerateMembers] }))).toBe(true);
    expect(isStaff(mockMember({ permissions: [PermissionFlagsBits.ManageMessages] }))).toBe(true);
  });

  it('returns false for ticket-staff role only', () => {
    expect(isStaff(mockMember({ roleIds: ['TS_SUPPORT'] }))).toBe(false);
  });

  it('returns false for a plain member', () => {
    expect(isStaff(mockMember({}))).toBe(false);
  });
});

describe('ticketStaffRoleIds', () => {
  it('returns deduplicated, non-empty staffRoleId values', () => {
    const ids = ticketStaffRoleIds();
    expect(ids).toContain('TS_SUPPORT');
    expect(ids).toContain('TS_BUG');
    expect(ids).not.toContain('');
    expect(ids).toHaveLength(2);
  });
});

describe('isTicketStaff', () => {
  it('returns true if member has one of the category staff roles', () => {
    expect(isTicketStaff(mockMember({ roleIds: ['TS_BUG'] }))).toBe(true);
  });

  it('does not consider STAFF_ROLE_ID alone as ticket-staff', () => {
    expect(isTicketStaff(mockMember({ roleIds: ['STAFF'] }))).toBe(false);
  });
});

describe('viewerTier', () => {
  it('admin > staff > ticket-staff > public', () => {
    expect(viewerTier(mockMember({ roleIds: ['ADMIN'] }))).toBe('admin');
    expect(viewerTier(mockMember({ roleIds: ['STAFF'] }))).toBe('staff');
    expect(viewerTier(mockMember({ roleIds: ['TS_SUPPORT'] }))).toBe('ticket-staff');
    expect(viewerTier(mockMember({}))).toBe('public');
  });

  it('admin role wins over staff role on the same member', () => {
    expect(viewerTier(mockMember({ roleIds: ['ADMIN', 'STAFF'] }))).toBe('admin');
  });
});

describe('canSee', () => {
  it('allows viewers of equal or higher tier', () => {
    expect(canSee('staff', 'staff')).toBe(true);
    expect(canSee('staff', 'admin')).toBe(true);
    expect(canSee('admin', 'admin')).toBe(true);
    expect(canSee('public', 'public')).toBe(true);
  });

  it('blocks viewers of lower tier', () => {
    expect(canSee('admin', 'staff')).toBe(false);
    expect(canSee('staff', 'public')).toBe(false);
    expect(canSee('ticket-staff', 'public')).toBe(false);
  });

  it('treats undefined commandTier as public', () => {
    expect(canSee(undefined, 'public')).toBe(true);
    expect(canSee(undefined, 'admin')).toBe(true);
  });
});

beforeEach(() => {
  // Pas d'état partagé entre tests pour le moment.
});
