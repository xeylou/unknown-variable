import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
  type Guild, type Message, type InteractionReplyOptions
} from 'discord.js';
import { prisma } from '../database';
import { setConfig } from './configCache';
import config from '../config';

/**
 * Cycle de vie des panneaux déployés par les commandes setup-*.
 *
 * Chaque déploiement est enregistré (`recordPanel`) pour qu'une sous-commande
 * « supprimer » puisse retirer le message ET réinitialiser les réglages liés
 * (`performPanelTeardown`). Les reaction-roles utilisent leur table dédiée
 * (`reaction_role_panels`), gérée ici aussi par souci d'uniformité.
 */

export const PANEL_KINDS = {
  reglement: {
    label: 'règlement',
    resets: 'le salon du règlement et le rôle de validation (verified_role)'
  },
  tickets: {
    label: 'panneau de tickets',
    resets: "le(s) message(s) d'ouverture personnalisé(s)"
  },
  captcha: {
    label: 'captcha',
    resets: "l'activation et les rôles vérifié / non-vérifié du captcha"
  },
  'reaction-roles': {
    label: 'reaction-roles',
    resets: 'aucun autre réglage'
  }
} as const;

export type PanelKind = keyof typeof PANEL_KINDS;

/** Enregistre un panneau déployé pour pouvoir le retirer plus tard. */
export async function recordPanel(kind: 'reglement' | 'tickets' | 'captcha', message: Message): Promise<void> {
  if (!message.guildId) return;
  await prisma.deployed_panels.create({
    data: {
      message_id: message.id,
      guild_id: message.guildId,
      channel_id: message.channelId,
      kind,
      created_at: Date.now()
    }
  }).catch(() => {});
}

/** Réponse de confirmation (boutons Supprimer / Annuler) pour une sous-commande « supprimer ». */
export function buildDeleteConfirm(kind: PanelKind): InteractionReplyOptions {
  const meta = PANEL_KINDS[kind];
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`panel:confirm-delete:${kind}`)
      .setLabel('Supprimer').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('panel:cancel-delete')
      .setLabel('Annuler').setStyle(ButtonStyle.Secondary)
  );
  return {
    content: `⚠️ Confirmer la suppression du ${meta.label} ? Cela effacera le(s) message(s) déployé(s) ` +
      `et réinitialisera ${meta.resets}. Action irréversible.`,
    components: [row],
    flags: MessageFlags.Ephemeral
  };
}

/** Nombre de panneaux enregistrés d'un type donné. */
export function countPanels(guild: Guild, kind: PanelKind): Promise<number> {
  if (kind === 'reaction-roles') {
    return prisma.reaction_role_panels.count({ where: { guild_id: guild.id } });
  }
  return prisma.deployed_panels.count({ where: { guild_id: guild.id, kind } });
}

/** Efface les messages enregistrés d'un type + leurs lignes. Renvoie le nombre. */
async function removeDeployed(guild: Guild, kind: 'reglement' | 'tickets' | 'captcha'): Promise<number> {
  const rows = await prisma.deployed_panels.findMany({ where: { guild_id: guild.id, kind } });
  for (const r of rows) {
    const channel = guild.channels.cache.get(r.channel_id);
    if (channel?.isTextBased() && 'messages' in channel) {
      await channel.messages.delete(r.message_id).catch(() => {});
    }
  }
  await prisma.deployed_panels.deleteMany({ where: { guild_id: guild.id, kind } });
  return rows.length;
}

/** Efface les panneaux reaction-roles (table dédiée) + leurs entrées emoji→rôle. */
async function removeReactionRoles(guild: Guild): Promise<number> {
  const panels = await prisma.reaction_role_panels.findMany({ where: { guild_id: guild.id } });
  for (const p of panels) {
    const channel = guild.channels.cache.get(p.channel_id);
    if (channel?.isTextBased() && 'messages' in channel) {
      await channel.messages.delete(p.message_id).catch(() => {});
    }
    await prisma.reaction_role_entries.deleteMany({ where: { message_id: p.message_id } });
  }
  await prisma.reaction_role_panels.deleteMany({ where: { guild_id: guild.id } });
  return panels.length;
}

/** Supprime une fonctionnalité déployée : message(s) + réglages associés. */
export async function performPanelTeardown(guild: Guild, kind: PanelKind): Promise<number> {
  if (kind === 'reaction-roles') return removeReactionRoles(guild);

  const n = await removeDeployed(guild, kind);
  const gid = guild.id;

  if (kind === 'reglement') {
    await setConfig(gid, 'rules_channel_id', null);
    await setConfig(gid, 'verified_role', null);
  } else if (kind === 'tickets') {
    await setConfig(gid, 'ticket_open_message', null);
    for (const c of config.tickets.categories) {
      await setConfig(gid, `ticket_open_message:${c.value}`, null);
    }
  } else if (kind === 'captcha') {
    await setConfig(gid, 'captcha_enabled', null);
    await setConfig(gid, 'captcha_unverified_role', null);
    await setConfig(gid, 'captcha_verified_role', null);
  }
  return n;
}
