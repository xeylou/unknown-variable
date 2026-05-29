import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PermissionFlagsBits } from 'discord.js';

// vi.mock est hoisté en tête de fichier — il faut utiliser vi.hoisted pour
// partager une référence avec les tests.
const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    staffRoleId: undefined as string | undefined,
    adminRoleId: undefined as string | undefined,
    tickets: { categories: [] as Array<{ value: string; staffRoleId: string }> }
  }
}));

vi.mock('../src/config', () => ({ default: mockConfig }));

// On stubbe la sub-import de configCache pour éviter de toucher Prisma au boot.
vi.mock('../src/database', () => ({
  prisma: {},
  getConfig: vi.fn(),
  setConfig: vi.fn()
}));

import { isAdmin, isStaff, isTicketStaff, viewerTier, canSee, ticketStaffRoleIds } from '../src/utils/permissions';

/**
 * Fabrique un GuildMember minimal compatible avec les helpers : seules les
 * propriétés `guild.ownerId`, `id`, `roles.cache.has`, `permissions.has`,
 * `permissions.any` sont lues.
 */
function makeMember(opts: {
  id?: string;
  isOwner?: boolean;
  roleIds?: string[];
  perms?: bigint[];
}): any {
  const id = opts.id ?? 'user-1';
  const roleSet = new Set(opts.roleIds ?? []);
  const permsSet = new Set((opts.perms ?? []).map((p) => p.toString()));
  return {
    id,
    guild: { ownerId: opts.isOwner ? id : 'owner-x' },
    roles: { cache: { has: (rid: string) => roleSet.has(rid) } },
    permissions: {
      has: (p: bigint) => permsSet.has(p.toString()),
      any: (list: bigint[]) => list.some((p) => permsSet.has(p.toString()))
    }
  };
}

beforeEach(() => {
  mockConfig.staffRoleId = undefined;
  mockConfig.adminRoleId = undefined;
  mockConfig.tickets.categories = [];
});

describe('permissions.isAdmin', () => {
  it('renvoie false sur un membre null', () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });

  it('renvoie true pour le propriétaire du serveur', () => {
    expect(isAdmin(makeMember({ isOwner: true }))).toBe(true);
  });

  it('renvoie true si le membre a la permission Administrator', () => {
    expect(isAdmin(makeMember({ perms: [PermissionFlagsBits.Administrator] }))).toBe(true);
  });

  it('renvoie true si le membre a ADMIN_ROLE_ID', () => {
    mockConfig.adminRoleId = 'admin-role';
    expect(isAdmin(makeMember({ roleIds: ['admin-role'] }))).toBe(true);
  });

  it('renvoie false si ADMIN_ROLE_ID est absent et que le membre n\'a aucune perm', () => {
    expect(isAdmin(makeMember({}))).toBe(false);
  });
});

describe('permissions.isStaff', () => {
  it('un admin est implicitement staff', () => {
    expect(isStaff(makeMember({ isOwner: true }))).toBe(true);
    expect(isStaff(makeMember({ perms: [PermissionFlagsBits.Administrator] }))).toBe(true);
  });

  it('renvoie true via STAFF_ROLE_ID', () => {
    mockConfig.staffRoleId = 'staff-role';
    expect(isStaff(makeMember({ roleIds: ['staff-role'] }))).toBe(true);
  });

  it('renvoie true via une permission de modération typique', () => {
    for (const p of [
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.BanMembers,
      PermissionFlagsBits.ModerateMembers,
      PermissionFlagsBits.ManageMessages
    ]) {
      expect(isStaff(makeMember({ perms: [p] }))).toBe(true);
    }
  });

  it('renvoie false pour un membre sans rôle ni permissions de modération', () => {
    expect(isStaff(makeMember({}))).toBe(false);
  });
});

describe('permissions.isTicketStaff', () => {
  it('renvoie false sans catégorie configurée', () => {
    expect(isTicketStaff(makeMember({ roleIds: ['builder'] }))).toBe(false);
  });

  it('renvoie true si le membre a un rôle de catégorie', () => {
    mockConfig.tickets.categories = [
      { value: 'build', staffRoleId: 'builder' },
      { value: 'bug', staffRoleId: 'dev' }
    ];
    expect(isTicketStaff(makeMember({ roleIds: ['builder'] }))).toBe(true);
    expect(isTicketStaff(makeMember({ roleIds: ['dev'] }))).toBe(true);
  });

  it('renvoie false si le membre n\'a aucun des rôles de catégories', () => {
    mockConfig.tickets.categories = [{ value: 'build', staffRoleId: 'builder' }];
    expect(isTicketStaff(makeMember({ roleIds: ['random'] }))).toBe(false);
  });

  it('ignore les catégories avec staffRoleId vide', () => {
    mockConfig.tickets.categories = [
      { value: 'build', staffRoleId: '' },
      { value: 'bug', staffRoleId: '   ' }
    ];
    expect(ticketStaffRoleIds()).toEqual([]);
  });

  it('un staff/admin n\'est PAS implicitement ticket-staff', () => {
    mockConfig.staffRoleId = 'staff';
    mockConfig.adminRoleId = 'admin';
    expect(isTicketStaff(makeMember({ roleIds: ['staff'] }))).toBe(false);
    expect(isTicketStaff(makeMember({ roleIds: ['admin'] }))).toBe(false);
  });
});

describe('permissions.viewerTier', () => {
  it('classe correctement les 4 niveaux', () => {
    expect(viewerTier(null)).toBe('public');
    expect(viewerTier(makeMember({}))).toBe('public');

    mockConfig.tickets.categories = [{ value: 'build', staffRoleId: 'builder' }];
    expect(viewerTier(makeMember({ roleIds: ['builder'] }))).toBe('ticket-staff');

    mockConfig.staffRoleId = 'staff';
    expect(viewerTier(makeMember({ roleIds: ['staff'] }))).toBe('staff');

    mockConfig.adminRoleId = 'admin';
    expect(viewerTier(makeMember({ roleIds: ['admin'] }))).toBe('admin');
  });

  it('admin > staff > ticket-staff > public quand plusieurs rôles', () => {
    mockConfig.staffRoleId = 'staff';
    mockConfig.adminRoleId = 'admin';
    mockConfig.tickets.categories = [{ value: 'build', staffRoleId: 'builder' }];

    expect(viewerTier(makeMember({ roleIds: ['builder', 'staff'] }))).toBe('staff');
    expect(viewerTier(makeMember({ roleIds: ['builder', 'staff', 'admin'] }))).toBe('admin');
  });
});

describe('permissions.canSee (4 tiers)', () => {
  it('public visible par tous', () => {
    for (const v of ['public', 'ticket-staff', 'staff', 'admin'] as const) {
      expect(canSee('public', v)).toBe(true);
      expect(canSee(undefined, v)).toBe(true);
    }
  });

  it('ticket-staff visible à partir du tier ticket-staff', () => {
    expect(canSee('ticket-staff', 'public')).toBe(false);
    expect(canSee('ticket-staff', 'ticket-staff')).toBe(true);
    expect(canSee('ticket-staff', 'staff')).toBe(true);
    expect(canSee('ticket-staff', 'admin')).toBe(true);
  });

  it('staff visible à partir du tier staff', () => {
    expect(canSee('staff', 'public')).toBe(false);
    expect(canSee('staff', 'ticket-staff')).toBe(false);
    expect(canSee('staff', 'staff')).toBe(true);
    expect(canSee('staff', 'admin')).toBe(true);
  });

  it('admin visible uniquement à l\'admin', () => {
    expect(canSee('admin', 'public')).toBe(false);
    expect(canSee('admin', 'ticket-staff')).toBe(false);
    expect(canSee('admin', 'staff')).toBe(false);
    expect(canSee('admin', 'admin')).toBe(true);
  });
});
