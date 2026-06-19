import type { Client } from 'discord.js';
import { prisma } from '../database';
import { rconCommand, isConfigured } from './mcrcon';
import { getConfig } from '../utils/configCache';
import { createLogger } from '../utils/logger';

const log = createLogger('mcingame');

/**
 * Polling RCON pour attribuer/retirer un « rôle en jeu » aux membres dont le
 * compte Minecraft est connecté au serveur. Rafraîchissement : 30 s — c'est
 * le bon compromis entre réactivité et charge RCON.
 *
 * Configs lues par guilde :
 *   mc_ingame_role  → rôle attribué aux joueurs connectés
 *
 * Les liaisons Discord ↔ MC vivent dans la table `mc_links`.
 */

const TICK_MS = 30_000;

/** Parse la sortie de la commande RCON `list`. */
function parsePlayerList(raw: string): string[] {
  // Format usuel : « There are X of a max of Y players online: pseudo1, pseudo2 »
  const m = raw.match(/:\s*(.+)$/);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** Récupère les joueurs en ligne sur le serveur d'une guilde. */
async function fetchOnlinePlayers(guildId: string): Promise<Set<string> | null> {
  const out = await rconCommand(guildId, 'list');
  if (out === null) return null;
  return new Set(parsePlayerList(out).map((p) => p.toLowerCase()));
}

/** Tick principal : valide les demandes pendantes, ajuste les rôles. */
async function tick(client: Client<true>): Promise<void> {
  for (const guild of client.guilds.cache.values()) {
    if (!await isConfigured(guild.id)) continue;

    const online = await fetchOnlinePlayers(guild.id);
    if (online === null) continue; // serveur hors ligne / RCON inaccessible

    // 1. Valide les demandes de liaison pendantes
    const pending = await prisma.mc_link_codes.findMany({ where: { guild_id: guild.id } });
    const now = Date.now();
    for (const p of pending) {
      if (p.expires_at < now) {
        await prisma.mc_link_codes.delete({ where: { code: p.code } }).catch(() => {});
        continue;
      }
      if (online.has(p.mc_username.toLowerCase())) {
        // Pas de doublon : si une autre liaison existe avec le même pseudo, on annule
        const dupe = await prisma.mc_links.findFirst({
          where: { guild_id: p.guild_id, mc_username: p.mc_username }
        });
        if (!dupe) {
          await prisma.mc_links.create({
            data: {
              guild_id: p.guild_id,
              user_id: p.user_id,
              mc_uuid: '', // RCON `list` ne donne pas l'UUID — on peut le récupérer plus tard via /api/whois
              mc_username: p.mc_username,
              linked_at: now
            }
          });
          // Notifie le membre en DM
          const member = await guild.members.fetch(p.user_id).catch(() => null);
          if (member) {
            member.send(`✅ Votre compte Discord est maintenant lié à **${p.mc_username}** sur **${guild.name}**.`)
              .catch(() => {});
          }
        }
        await prisma.mc_link_codes.delete({ where: { code: p.code } }).catch(() => {});
      }
    }

    // 2. Mise à jour du rôle « en jeu »
    const roleId = await getConfig(guild.id, 'mc_ingame_role');
    if (!roleId) continue;
    const links = await prisma.mc_links.findMany({ where: { guild_id: guild.id } });
    if (!links.length) continue;

    // Récupère le rôle et la liste actuelle des membres qui le portent
    const role = guild.roles.cache.get(roleId);
    if (!role) continue;
    const me = guild.members.me;
    if (!me || role.position >= me.roles.highest.position) {
      log.debug(`rôle ${roleId} non attribuable (rôle trop haut)`);
      continue;
    }

    const expected = new Map<string, string>(); // discordUserId → pseudoMC
    for (const link of links) {
      if (online.has(link.mc_username.toLowerCase())) {
        expected.set(link.user_id, link.mc_username);
      }
    }

    // Attribution / retrait par diff avec le set actuel des porteurs
    for (const link of links) {
      const member = guild.members.cache.get(link.user_id);
      if (!member) continue;
      const has = member.roles.cache.has(roleId);
      const shouldHave = expected.has(link.user_id);
      if (shouldHave && !has) {
        await member.roles.add(roleId, 'En jeu sur le serveur Minecraft').catch(() => {});
      } else if (!shouldHave && has) {
        await member.roles.remove(roleId, 'Déconnecté du serveur Minecraft').catch(() => {});
      }
    }
  }
}

/** Démarre la boucle (tick toutes les 30 s). */
export function init(client: Client<true>): void {
  const run = () => tick(client).catch((e) => log.warn('tick error', e));
  // Premier tick décalé pour laisser le bot se stabiliser
  setTimeout(run, 10_000).unref();
  setInterval(run, TICK_MS).unref();
}
