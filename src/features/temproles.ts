import { type Client, type Guild, type GuildMember, type Role } from 'discord.js';
import { prisma } from '../database';
import { createLogger } from '../utils/logger';
import type { temp_roles as TempRoleRow } from '@prisma/client';

const log = createLogger('temproles');

const MAX_TIMEOUT = 2_147_483_647;
const scheduled = new Map<number, NodeJS.Timeout>();
let clientRef: Client<true> | null = null;

/** Reprogramme tous les rôles temporaires en attente. */
export async function init(client: Client<true>): Promise<void> {
  clientRef = client;
  const rows = await prisma.temp_roles.findMany();
  for (const r of rows) schedule(r);
  if (rows.length) log.info(`${rows.length} rôle(s) temporaire(s) rechargé(s)`);
}

function schedule(r: TempRoleRow): void {
  const delay = r.expires_at - Date.now();
  if (delay <= 0) { fire(r.id); return; }
  const timer = setTimeout(() => fire(r.id), Math.min(delay, MAX_TIMEOUT));
  timer.unref();
  scheduled.set(r.id, timer);
}

async function fire(id: number): Promise<void> {
  scheduled.delete(id);
  if (!clientRef) return;
  const row = await prisma.temp_roles.findUnique({ where: { id } }).catch(() => null);
  if (!row) return;
  if (row.expires_at - Date.now() > 1000) { schedule(row); return; }

  const guild = clientRef.guilds.cache.get(row.guild_id);
  if (guild) {
    const member = await guild.members.fetch(row.user_id).catch(() => null);
    if (member) {
      await member.roles.remove(row.role_id, 'Fin de rôle temporaire').catch((e) => log.warn('remove role', e));
    }
  }
  await prisma.temp_roles.delete({ where: { id } }).catch(() => {});
}

/** Ajoute un rôle temporaire pour `durationMs` à un membre. */
export async function addTempRole({
  guild, member, role, durationMs, assignedBy, reason
}: {
  guild: Guild; member: GuildMember; role: Role;
  durationMs: number; assignedBy: string; reason?: string;
}): Promise<number> {
  await member.roles.add(role.id, reason || 'Rôle temporaire').catch(() => {});
  const row = await prisma.temp_roles.create({
    data: {
      guild_id: guild.id,
      user_id: member.id,
      role_id: role.id,
      expires_at: Date.now() + durationMs,
      assigned_by: assignedBy,
      reason: reason ?? null,
      created_at: Date.now()
    }
  });
  schedule(row);
  return row.id;
}

/** Annule manuellement un rôle temporaire. */
export async function cancelTempRole(id: number): Promise<void> {
  const t = scheduled.get(id);
  if (t) { clearTimeout(t); scheduled.delete(id); }
  await prisma.temp_roles.delete({ where: { id } }).catch(() => {});
}
