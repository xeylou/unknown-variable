import {
  Events, type Client, type Guild, type GuildMember, type PartialGuildMember,
  type Invite
} from 'discord.js';
import { prisma } from '../database';
import { createLogger } from '../utils/logger';

/**
 * Suivi des invitations NETTES par membre (classement invitations).
 *
 * Algorithme classique : on garde en mémoire le nombre d'usages de chaque code
 * d'invitation. À l'arrivée d'un membre, on re-fetch et on repère le code dont
 * les usages ont augmenté → on crédite son créateur. On enregistre aussi
 * l'attribution (`invite_joins`) pour pouvoir décrémenter le bon compteur quand
 * l'invité quitte le serveur.
 *
 * ⚠️ Nécessite la permission « Gérer le serveur » pour `guild.invites.fetch()`.
 */

const log = createLogger('invitetracker');

type InviteUse = { uses: number; inviter: string | null };

/** Cache des usages par code, par serveur : guildId → (code → usages/inviteur). */
const cache = new Map<string, Map<string, InviteUse>>();

/** Photographie l'état courant des invitations d'un serveur. */
async function snapshotGuild(guild: Guild): Promise<Map<string, InviteUse>> {
  const map = new Map<string, InviteUse>();
  try {
    const invites = await guild.invites.fetch();
    for (const inv of invites.values()) {
      map.set(inv.code, { uses: inv.uses ?? 0, inviter: inv.inviter?.id ?? null });
    }
  } catch (e) {
    log.debug(`invites.fetch impossible pour ${guild.id} (permission « Gérer le serveur » ?)`, e);
  }
  return map;
}

/** Crédite l'inviteur d'un nouvel arrivant et enregistre l'attribution. */
export async function onMemberJoin(member: GuildMember): Promise<void> {
  const guild = member.guild;
  const before = cache.get(guild.id) ?? new Map<string, InviteUse>();
  const after = await snapshotGuild(guild);
  cache.set(guild.id, after);

  // Repère le premier code dont les usages ont augmenté.
  let inviterId: string | null = null;
  for (const [code, info] of after) {
    if (info.uses > (before.get(code)?.uses ?? 0)) {
      inviterId = info.inviter;
      break;
    }
  }
  // Pas d'attribution possible (vanity, invite non cachée, bot OAuth) ou auto-invite.
  if (!inviterId || inviterId === member.id) return;

  await prisma.invite_counts.upsert({
    where: { guild_id_user_id: { guild_id: guild.id, user_id: inviterId } },
    update: { count: { increment: 1 } },
    create: { guild_id: guild.id, user_id: inviterId, count: 1 }
  });
  await prisma.invite_joins.upsert({
    where: { guild_id_user_id: { guild_id: guild.id, user_id: member.id } },
    update: { inviter_id: inviterId, joined_at: Date.now() },
    create: { guild_id: guild.id, user_id: member.id, inviter_id: inviterId, joined_at: Date.now() }
  });
}

/** Décrémente le compteur de l'inviteur quand un invité quitte (net). */
export async function onMemberLeave(member: GuildMember | PartialGuildMember): Promise<void> {
  const guild = member.guild;
  const key = { guild_id_user_id: { guild_id: guild.id, user_id: member.id } };
  const join = await prisma.invite_joins.findUnique({ where: key }).catch(() => null);
  if (!join) return;
  await prisma.invite_joins.delete({ where: key }).catch(() => {});
  await prisma.invite_counts.updateMany({
    where: { guild_id: guild.id, user_id: join.inviter_id, count: { gt: 0 } },
    data: { count: { decrement: 1 } }
  });
}

/** Top N des membres ayant invité le plus de monde. */
export function topInvites(guildId: string, n: number) {
  return prisma.invite_counts.findMany({
    where: { guild_id: guildId, count: { gt: 0 } },
    orderBy: { count: 'desc' },
    take: n
  });
}

/** Réinitialise compteurs + attributions d'invitations du serveur. */
export async function resetInvites(guildId: string): Promise<void> {
  await prisma.invite_counts.deleteMany({ where: { guild_id: guildId } });
  await prisma.invite_joins.deleteMany({ where: { guild_id: guildId } });
}

/** Amorce le cache et maintient les usages à jour via les events d'invitation. */
export function init(client: Client<true>): void {
  for (const guild of client.guilds.cache.values()) {
    snapshotGuild(guild).then((m) => cache.set(guild.id, m)).catch(() => {});
  }

  client.on(Events.InviteCreate, (invite: Invite) => {
    if (!invite.guild) return;
    const map = cache.get(invite.guild.id) ?? new Map<string, InviteUse>();
    map.set(invite.code, { uses: invite.uses ?? 0, inviter: invite.inviter?.id ?? null });
    cache.set(invite.guild.id, map);
  });

  client.on(Events.InviteDelete, (invite) => {
    if (!invite.guild) return;
    cache.get(invite.guild.id)?.delete(invite.code);
  });

  client.on(Events.GuildCreate, (guild) => {
    snapshotGuild(guild).then((m) => cache.set(guild.id, m)).catch(() => {});
  });
}
