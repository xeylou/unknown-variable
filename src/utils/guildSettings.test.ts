import { describe, it, expect, beforeEach, vi } from 'vitest';

// Config mockée : « HOME » est le serveur principal (défauts .env), les autres
// serveurs ne doivent JAMAIS hériter de ces défauts (anti-fuite inter-serveurs).
vi.mock('../config', () => ({
  default: {
    guildId: 'HOME',
    staffRoleId: 'ENV_STAFF',
    adminRoleId: 'ENV_ADMIN',
    tickets: {
      categoryId: 'ENV_CAT',
      logsChannelId: 'ENV_LOGS',
      categories: [
        { value: 'support', label: 'Support', description: '', emoji: '', staffRoleId: '' },
        { value: 'bug', label: 'Bug', description: '', emoji: '', staffRoleId: 'CODE_DEFAULT_BUG' }
      ]
    }
  }
}));

// `guildSettings` importe `prisma` ; init() n'est jamais appelé ici.
vi.mock('../database', () => ({ prisma: {} }));

import {
  onConfigWrite, _resetForTests,
  getStaffRole, getAdminRole, getTicketCategory, getTicketLogsChannel,
  getTicketRole, ticketStaffRoleIds
} from './guildSettings';

beforeEach(() => _resetForTests());

describe('défauts .env du serveur principal', () => {
  it('renvoie les défauts .env pour le serveur principal', () => {
    expect(getStaffRole('HOME')).toBe('ENV_STAFF');
    expect(getAdminRole('HOME')).toBe('ENV_ADMIN');
    expect(getTicketCategory('HOME')).toBe('ENV_CAT');
    expect(getTicketLogsChannel('HOME')).toBe('ENV_LOGS');
  });

  it("ne fuite PAS les défauts .env vers les autres serveurs", () => {
    expect(getStaffRole('OTHER')).toBeNull();
    expect(getAdminRole('OTHER')).toBeNull();
    expect(getTicketCategory('OTHER')).toBeNull();
    expect(getTicketLogsChannel('OTHER')).toBeNull();
  });
});

describe('réglages par serveur', () => {
  it('stocke et lit des valeurs isolées par serveur', () => {
    onConfigWrite('OTHER', 'staff_role', 'O_STAFF');
    onConfigWrite('OTHER', 'ticket_category', 'O_CAT');
    onConfigWrite('OTHER', 'ticket_logs_channel', 'O_LOGS');
    expect(getStaffRole('OTHER')).toBe('O_STAFF');
    expect(getTicketCategory('OTHER')).toBe('O_CAT');
    expect(getTicketLogsChannel('OTHER')).toBe('O_LOGS');
    // le serveur principal n'est pas affecté
    expect(getStaffRole('HOME')).toBe('ENV_STAFF');
  });

  it('une valeur par serveur écrase le défaut .env du serveur principal', () => {
    onConfigWrite('HOME', 'staff_role', 'DB_STAFF');
    expect(getStaffRole('HOME')).toBe('DB_STAFF');
  });
});

describe('rôles de catégories de tickets', () => {
  it('utilise la valeur par serveur, sinon le défaut catalogue, sinon null', () => {
    expect(getTicketRole('OTHER', 'support')).toBeNull(); // pas de défaut catalogue
    expect(getTicketRole('OTHER', 'bug')).toBe('CODE_DEFAULT_BUG'); // défaut catalogue (tous serveurs)
    onConfigWrite('OTHER', 'ticket_role:support', 'O_SUPPORT');
    expect(getTicketRole('OTHER', 'support')).toBe('O_SUPPORT');
  });

  it('ticketStaffRoleIds dédoublonne et reflète la config par serveur', () => {
    onConfigWrite('G', 'ticket_role:support', 'R1');
    onConfigWrite('G', 'ticket_role:bug', 'R1'); // même rôle → dédoublonné
    expect(ticketStaffRoleIds('G')).toEqual(['R1']);
  });

  it('retirer un rôle (null) désactive la catégorie', () => {
    onConfigWrite('G', 'ticket_role:support', 'R1');
    onConfigWrite('G', 'ticket_role:support', null);
    expect(getTicketRole('G', 'support')).toBeNull();
  });
});
