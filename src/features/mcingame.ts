import { PermissionFlagsBits, type Client } from 'discord.js';
import { prisma } from '../database';
import { listOnline, isConfigured } from './mcrcon';
import { pseudoConflict } from './mclinking';
import { auditLinkCreated } from './mclinkaudit';
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

/** Tick principal : valide les demandes pendantes, ajuste les rôles. */
async function tick(client: Client<true>): Promise<void> {
  for (const guild of client.guilds.cache.values()) {
    if (!await isConfigured(guild.id)) continue;

    const online = await listOnline(guild.id);
    if (online === null) continue; // serveur hors ligne / RCON inaccessible

    // 1. Valide les demandes de liaison pendantes
    const pending = await prisma.mc_link_codes.findMany({ where: { guild_id: guild.id } });
    const now = Date.now();
    for (const p of pending) {
      if (p.expires_at < now) {
        await prisma.mc_link_codes.delete({ where: { code: p.code } }).catch(() => {});
        continue;
      }
      if (!online.has(p.mc_username.toLowerCase())) continue;

      // Re-vérifie AU MOMENT de valider (course possible depuis la demande) :
      //  - le membre n'est pas déjà lié à un autre pseudo ;
      //  - le pseudo/UUID n'a pas été pris entre-temps (insensible à la casse).
      const alreadyLinked = await prisma.mc_links.findUnique({
        where: { guild_id_user_id: { guild_id: guild.id, user_id: p.user_id } }
      });
      const conflict = await pseudoConflict(guild.id, {
        name: p.mc_username, uuid: p.mc_uuid, excludeUserId: p.user_id
      });

      // La demande est consommée dans tous les cas (succès comme rejet).
      await prisma.mc_link_codes.delete({ where: { code: p.code } }).catch(() => {});

      if (alreadyLinked || conflict) {
        // Rejet EXPLIQUÉ en DM (plutôt qu'un échec silencieux).
        const member = await guild.members.fetch(p.user_id).catch(() => null);
        const why = alreadyLinked
          ? 'votre compte est déjà lié à un autre pseudo'
          : 'ce pseudo est déjà lié à un autre membre';
        member?.send(`⚠️ La liaison à **${p.mc_username}** sur **${guild.name}** a échoué : ${why}.`).catch(() => {});
        continue;
      }

      await prisma.mc_links.create({
        data: {
          guild_id: p.guild_id,
          user_id: p.user_id,
          mc_uuid: p.mc_uuid ?? '', // UUID Mojang récupéré à la demande, si dispo
          mc_username: p.mc_username,
          linked_at: now
        }
      });
      const member = await guild.members.fetch(p.user_id).catch(() => null);
      member?.send(`✅ Votre compte Discord est maintenant lié à **${p.mc_username}** sur **${guild.name}**.`).catch(() => {});
      auditLinkCreated(guild, p.user_id, p.mc_username).catch(() => {});
    }

    // 2. Mise à jour du rôle « en jeu »
    const roleId = await getConfig(guild.id, 'mc_ingame_role');
    if (!roleId) continue; // rôle en jeu non configuré pour ce serveur

    // Garde-fous explicites + journalisés (les causes les plus fréquentes du
    // « ça ne marche pas » : rôle supprimé, permission manquante, hiérarchie).
    const role = guild.roles.cache.get(roleId);
    if (!role) {
      log.warn(`[${guild.name}] rôle en jeu ${roleId} introuvable (supprimé ou mauvais ID).`);
      continue;
    }
    const me = guild.members.me;
    if (!me || !me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      log.warn(`[${guild.name}] rôle en jeu non attribuable : permission « Gérer les rôles » manquante.`);
      continue;
    }
    if (role.position >= me.roles.highest.position) {
      log.warn(`[${guild.name}] rôle en jeu non attribuable : « ${role.name} » est au-dessus (ou égal à) du rôle le plus haut du bot — remonter le rôle du bot.`);
      continue;
    }

    const links = await prisma.mc_links.findMany({ where: { guild_id: guild.id } });

    // Membres liés ET en ligne en jeu : ils doivent porter le rôle.
    const expected = new Set<string>();
    for (const link of links) {
      if (online.has(link.mc_username.toLowerCase())) expected.add(link.user_id);
    }

    // ATTRIBUTION — on FETCH les membres attendus : `members.cache` est souvent
    // incomplet (un joueur en jeu mais inactif sur Discord n'y figure pas), ce
    // qui faisait silencieusement échouer l'attribution.
    for (const userId of expected) {
      const member = guild.members.cache.get(userId)
        ?? await guild.members.fetch(userId).catch(() => null);
      if (member && !member.roles.cache.has(roleId)) {
        await member.roles.add(roleId, 'En jeu sur le serveur Minecraft')
          .then(() => log.info(`[${guild.name}] rôle en jeu attribué à ${member.user.tag}`))
          .catch((e) => log.warn(`[${guild.name}] échec attribution rôle en jeu à ${userId}`, e));
      }
    }

    // RETRAIT — parmi les porteurs actuels, retirer ceux qui ne sont plus en
    // jeu. `role.members` couvre les membres en cache (dont ceux à qui le bot a
    // posé le rôle), suffisant pour le retrait en régime normal.
    for (const member of role.members.values()) {
      if (!expected.has(member.id)) {
        await member.roles.remove(roleId, 'Déconnecté du serveur Minecraft')
          .then(() => log.info(`[${guild.name}] rôle en jeu retiré à ${member.user.tag}`))
          .catch((e) => log.warn(`[${guild.name}] échec retrait rôle en jeu à ${member.id}`, e));
      }
    }

    log.debug(`[${guild.name}] rôle en jeu — en ligne=${online.size} liés=${links.length} attendus=${expected.size} porteurs=${role.members.size}`);
  }
}

/** Démarre la boucle (tick toutes les 30 s). */
export function init(client: Client<true>): void {
  const run = () => tick(client).catch((e) => log.warn('tick error', e));
  // Premier tick décalé pour laisser le bot se stabiliser
  setTimeout(run, 10_000).unref();
  setInterval(run, TICK_MS).unref();
}
