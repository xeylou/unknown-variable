import {
  Events, ChannelType, PermissionFlagsBits,
  type Guild, type GuildBasedChannel, type TextChannel
} from 'discord.js';
import config from '../config';
import * as embeds from '../utils/embeds';
import { createLogger } from '../utils/logger';

const log = createLogger('events:guildCreate');

/** Au-delà de ce délai depuis l'ajout, un `guildCreate` est une réapparition
 *  après indisponibilité Discord — pas un vrai ajout : on n'envoie rien. */
const FRESH_JOIN_WINDOW_MS = 5 * 60_000;

/** Trouve un salon texte où le bot peut écrire (priorité au salon système). */
function findWelcomeChannel(guild: Guild): TextChannel | null {
  const me = guild.members.me;
  if (!me) return null;
  const canSend = (ch: GuildBasedChannel): ch is TextChannel =>
    ch.type === ChannelType.GuildText &&
    ch.permissionsFor(me)?.has([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks
    ]) === true;

  const system = guild.systemChannel;
  if (system && canSend(system)) return system;

  return guild.channels.cache
    .filter(canSend)
    .sort((a, b) => a.rawPosition - b.rawPosition)
    .first() ?? null;
}

/** Embed d'accueil + guide de démarrage (destiné aux admins du serveur). */
function welcomeEmbed(guild: Guild) {
  return embeds.primary()
    .setTitle(`Merci de m'avoir ajouté à ${guild.name} !`)
    .setDescription(
      'Je suis prêt. Voici la **mise en route** (commandes réservées aux admins) :\n\n' +
      '**1.** `/config staff` et `/config admin` — déclare tes rôles de modération et d\'administration.\n' +
      '**2.** `/permissions check` → bouton « Tout corriger » — pour que les commandes apparaissent dans Discord.\n' +
      '**3.** `/logs tout-dans` — choisis un salon pour les logs du serveur.\n' +
      '**4.** `/config reglement` puis `/setup-reglement` — règlement à accepter.\n' +
      '**5.** Tickets : `/config ticket-role`, `/config tickets`, puis `/setup-tickets`.\n\n' +
      '📖 Tape `/help` pour la liste complète des commandes. Bonne configuration !'
    )
    .setFooter({ text: config.botName });
}

export default {
  name: Events.GuildCreate,
  async execute(guild: Guild) {
    log.info(`Ajouté au serveur ${guild.name} (${guild.id}) — ${guild.memberCount} membre(s)`);

    // Ignore les réapparitions de guildes après une indisponibilité (évite de
    // reposter l'accueil à chaque reconnexion d'un vieux serveur).
    if (guild.joinedTimestamp && Date.now() - guild.joinedTimestamp > FRESH_JOIN_WINDOW_MS) {
      return;
    }

    const embed = welcomeEmbed(guild);

    const channel = findWelcomeChannel(guild);
    if (channel) {
      await channel.send({ embeds: [embed], allowedMentions: { parse: [] } })
        .catch((e) => log.warn('welcome send failed', e));
      return;
    }

    // Aucun salon accessible : on tente un MP au propriétaire du serveur.
    const owner = await guild.fetchOwner().catch(() => null);
    if (owner) {
      await owner.send({ embeds: [embed] }).catch(() => {});
    }
  }
};
