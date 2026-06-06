import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder, ButtonStyle,
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  type ButtonInteraction,
  type Client,
  type Guild,
  type GuildMember,
  type Message,
  type StringSelectMenuInteraction,
  type TextChannel,
  type User
} from 'discord.js';
import config from '../config';
import { prisma } from '../database';
import type { ComponentInteraction } from '../types';
import { getConfig } from '../utils/configCache';
import { getAdminRole, getTicketRole, getTicketCategory, getTicketLogsChannel } from '../utils/guildSettings';
import * as embeds from '../utils/embeds';
import { createLogger } from '../utils/logger';

const log = createLogger('tickets');

/** Nombre max de tickets ouverts par membre par 24 h. */
const MAX_TICKETS_PER_DAY = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Message d'ouverture par défaut quand aucune valeur n'est définie via
 * `/config ticket-message`. Les placeholders {user} {username} {category}
 * {number} {server} sont remplacés par `renderTicketMessage`.
 */
const DEFAULT_TICKET_OPEN_DESCRIPTION =
  'Bonjour {user}, merci de décrire votre demande **en détail** (contexte, captures, etc.).\n' +
  'Un membre du staff vous répondra dès que possible.';

/**
 * Substitue les placeholders d'un message d'ouverture de ticket :
 * `{user}` → mention, `{username}` → pseudo brut, `{category}` → libellé de la
 * catégorie, `{number}` → numéro du ticket, `{server}` → nom du serveur.
 */
function renderTicketMessage(template: string, ctx: {
  userId: string;
  username: string;
  categoryLabel: string;
  ticketNumber: number;
  serverName: string;
}): string {
  return template
    .replaceAll('{user}', `<@${ctx.userId}>`)
    .replaceAll('{username}', ctx.username)
    .replaceAll('{category}', ctx.categoryLabel)
    .replaceAll('{number}', String(ctx.ticketNumber))
    .replaceAll('{server}', ctx.serverName);
}

export default {
  prefix: 'ticket',
  // La sous-action `reopen` est déclenchée depuis le DM envoyé au membre
  // à la fermeture du ticket — `interaction.guild` y est `null`.
  dmFriendly: true,

  /** Routeur : customId « ticket:<action>[:args] ». */
  async execute(interaction: ComponentInteraction, client: Client<true>, args: string[]) {
    const action = args[0];
    if (action === 'category')      return createTicket(interaction as StringSelectMenuInteraction<'cached'>);
    if (action === 'claim')         return claimTicket(interaction as ButtonInteraction<'cached'>);
    if (action === 'close')         return askCloseConfirm(interaction as ButtonInteraction<'cached'>);
    if (action === 'close-confirm') return doCloseTicket(interaction as ButtonInteraction<'cached'>, client);
    if (action === 'close-cancel')  return cancelClose(interaction as ButtonInteraction<'cached'>);
    // « reopen » peut être déclenché depuis un DM : pas d'assertion `'cached'`.
    if (action === 'reopen')        return reopenTicket(interaction as unknown as ButtonInteraction, client, args[1]);
  }
};

/**
 * Vrai si le membre est habilité à gérer un ticket : porteur du rôle staff
 * de la catégorie spécifique, du rôle admin, ou disposant de ManageMessages
 * (filet de sécurité pour les owners/Discord Admins).
 */
function canManageTicket(member: GuildMember | null, ticketCategoryStaffRoleId: string | null = null): boolean {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.ManageMessages)) return true;
  const adminRole = getAdminRole(member.guild.id);
  if (adminRole && member.roles.cache.has(adminRole)) return true;
  if (ticketCategoryStaffRoleId && member.roles.cache.has(ticketCategoryStaffRoleId)) return true;
  return false;
}

/**
 * Construit les permission overwrites d'un salon de ticket pour une catégorie
 * donnée.
 *
 * Politique d'accès :
 * - `@everyone` : ViewChannel refusé.
 * - Auteur du ticket : ViewChannel + SendMessages + ReadMessageHistory + AttachFiles.
 * - Rôle responsable de la catégorie : accès complet (ping reçu à l'ouverture).
 * - Rôle admin du serveur (s'il est configuré) : accès complet, mais PAS pingué.
 * - Rôle staff global : volontairement non ajouté.
 */
function buildTicketOverwrites(
  everyoneId: string,
  userId: string,
  categoryStaffRoleId: string,
  adminRoleId: string | null
): { id: string; allow?: bigint[]; deny?: bigint[] }[] {
  const fullAccess = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.AttachFiles
  ];

  const overwrites = [
    { id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] },
    { id: userId, allow: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.AttachFiles
    ] },
    { id: categoryStaffRoleId, allow: fullAccess }
  ];
  if (adminRoleId && adminRoleId !== categoryStaffRoleId) {
    overwrites.push({ id: adminRoleId, allow: fullAccess });
  }
  return overwrites;
}

/**
 * Incrémente atomiquement le compteur de tickets d'une guilde et renvoie le
 * nouveau numéro. Implémenté en transaction interactive pour éviter qu'un
 * second appel concurrent ne réutilise le même numéro.
 */
async function nextTicketNumber(guildId: string): Promise<number> {
  return await prisma.$transaction(async (tx) => {
    const row = await tx.guild_config.findUnique({
      where: { guild_id_key: { guild_id: guildId, key: 'ticket_counter' } }
    });
    const next = (row ? Number(row.value) || 0 : 0) + 1;
    await tx.guild_config.upsert({
      where: { guild_id_key: { guild_id: guildId, key: 'ticket_counter' } },
      update: { value: String(next) },
      create: { guild_id: guildId, key: 'ticket_counter', value: String(next) }
    });
    return next;
  });
}

/**
 * Crée le salon d'un ticket (overwrites, topic, message d'accueil, boutons,
 * ping) et insère la ligne en base. Cœur partagé entre le menu déroulant du
 * panneau et la sous-commande `/ticket create` (ouverture par le staff au nom
 * d'un membre). Ne gère NI le `deferReply` NI la réponse à l'interaction : c'est
 * au caller de répondre. Renvoie le salon créé, ou `null` si la création du
 * salon a échoué (l'erreur est déjà loggée).
 *
 * `owner` est le destinataire du ticket : il est pingé, propriétaire en base et
 * apparaît dans le nom du salon. `openedByTag` ne sert qu'au pied de page
 * « Ouvert par … » — identique à `owner` en self-service, le staff sinon. La
 * limite anti-spam et la résolution du rôle responsable restent à la charge du
 * caller (elles diffèrent selon le point d'entrée).
 */
export async function openTicket(params: {
  guild: Guild;
  owner: User;
  category: (typeof config.tickets.categories)[number];
  categoryRoleId: string;
  openedByTag: string;
}): Promise<TextChannel | null> {
  const { guild, owner, category, categoryRoleId, openedByTag } = params;

  const ticketNumber = await nextTicketNumber(guild.id);
  const channelName = `${category.value}-${owner.username}-${ticketNumber}`;

  const overwrites = buildTicketOverwrites(
    guild.roles.everyone.id,
    owner.id,
    categoryRoleId,
    getAdminRole(guild.id)
  );

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: getTicketCategory(guild.id) || null,
    topic: `Ticket #${ticketNumber} de ${owner.tag} | Catégorie : ${category.label}`,
    permissionOverwrites: overwrites
  }).catch((e: unknown) => { log.error('create channel failed', e); return null; });

  if (!channel) return null;

  await prisma.tickets.create({
    data: {
      channel_id: channel.id,
      guild_id: guild.id,
      user_id: owner.id,
      number: ticketNumber,
      category: category.value,
      status: 'open',
      created_at: Date.now()
    }
  });

  // Cascade : override par catégorie → valeur globale → défaut codé en dur.
  const template =
    (await getConfig(guild.id, `ticket_open_message:${category.value}`)) ??
    (await getConfig(guild.id, 'ticket_open_message')) ??
    DEFAULT_TICKET_OPEN_DESCRIPTION;
  const description = renderTicketMessage(template, {
    userId: owner.id,
    username: owner.username,
    categoryLabel: category.label,
    ticketNumber,
    serverName: guild.name
  });

  const ticketEmbed = embeds.primary()
    .setTitle(`Ticket #${ticketNumber} — ${category.label}`)
    .setDescription(description)
    .setFooter({ text: `Ouvert par ${openedByTag}` })
    .setTimestamp();

  const claimBtn = new ButtonBuilder()
    .setCustomId('ticket:claim').setLabel('Prendre en charge').setEmoji('✋').setStyle(ButtonStyle.Primary);
  const closeBtn = new ButtonBuilder()
    .setCustomId('ticket:close').setLabel('Fermer le ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger);

  await channel.send({
    content: `<@${owner.id}> • <@&${categoryRoleId}>`,
    embeds: [ticketEmbed],
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(claimBtn, closeBtn)],
    allowedMentions: {
      users: [owner.id],
      roles: [categoryRoleId]
    }
  });

  return channel;
}

/** Création d'un ticket depuis le menu déroulant du panneau. */
async function createTicket(interaction: StringSelectMenuInteraction<'cached'>) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const category = config.tickets.categories.find((c) => c.value === interaction.values[0]);
  if (!category) return interaction.editReply({ content: '❌ Catégorie inconnue.' });

  // --- Limite : max 3 tickets par membre dans les dernières 24 h ---
  const since = Date.now() - DAY_MS;
  const recent = await prisma.tickets.count({
    where: {
      guild_id: interaction.guild.id,
      user_id: interaction.user.id,
      created_at: { gte: since }
    }
  });
  if (recent >= MAX_TICKETS_PER_DAY) {
    return interaction.editReply({
      content: `❌ Tu as déjà ouvert **${recent} tickets** dans les dernières 24 h. ` +
               `Limite : ${MAX_TICKETS_PER_DAY} par jour — réessaie plus tard.`
    });
  }

  // La catégorie doit avoir un rôle responsable défini (`/config ticket-role`).
  const categoryRoleId = getTicketRole(interaction.guild.id, category.value);
  if (!categoryRoleId) {
    return interaction.editReply({
      content: `❌ La catégorie **${category.label}** n'a pas de rôle responsable configuré. ` +
               'Un administrateur doit l\'attribuer avec `/config ticket-role`.'
    });
  }

  const channel = await openTicket({
    guild: interaction.guild,
    owner: interaction.user,
    category,
    categoryRoleId,
    openedByTag: interaction.user.tag
  });
  if (!channel) {
    return interaction.editReply({
      content: '❌ Impossible de créer le salon (permissions du bot ou catégorie pleine ?).'
    });
  }

  await interaction.editReply({ content: `✅ Ticket créé : ${channel}` });

  // Réinitialise le menu déroulant pour qu'il reste réutilisable
  const msg = interaction.message;
  const firstRow = msg.components[0] as { components: any[] };
  const refreshed = StringSelectMenuBuilder.from(firstRow.components[0]);
  await msg.edit({ components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(refreshed)] }).catch(() => {});
}

/** Prise en charge d'un ticket par un membre du staff de la catégorie ou un admin. */
async function claimTicket(interaction: ButtonInteraction<'cached'>) {
  if (!interaction.channel) {
    return interaction.reply({ content: '❌ Salon introuvable.', flags: MessageFlags.Ephemeral });
  }
  const ticketRow = await prisma.tickets.findUnique({ where: { channel_id: interaction.channel.id } });
  const catRoleId = ticketRow?.category ? getTicketRole(interaction.guild.id, ticketRow.category) : null;
  if (!canManageTicket(interaction.member, catRoleId)) {
    return interaction.reply({ content: '❌ Réservé au staff responsable de cette catégorie ou à l\'administration.', flags: MessageFlags.Ephemeral });
  }
  await prisma.tickets.update({
    where: { channel_id: interaction.channel.id },
    data: { claimed_by: interaction.user.id }
  });

  const firstRow = interaction.message.components[0] as { components: any[] };
  await interaction.message.edit({
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
      ButtonBuilder.from(firstRow.components[0]).setDisabled(true),
      ButtonBuilder.from(firstRow.components[1])
    )]
  }).catch(() => {});
  return interaction.reply({ content: `✋ Ticket pris en charge par ${interaction.user}.` });
}

/**
 * Récupère l'intégralité des messages d'un salon (par lots de 100, sans limite
 * stricte au-delà de la pagination). Renvoie les messages dans l'ordre
 * chronologique.
 */
async function fetchAllMessages(channel: TextChannel, hardCap = 5000): Promise<Message[]> {
  const collected: Message[] = [];
  let before: string | undefined;
  while (collected.length < hardCap) {
    const batch = await channel.messages.fetch({ limit: 100, before }).catch(() => null);
    if (!batch || batch.size === 0) break;
    collected.push(...batch.values());
    before = batch.last()?.id;
    if (batch.size < 100) break;
  }
  return collected.reverse();
}

/**
 * Demande la confirmation avant de fermer le ticket. Sans cette étape, un
 * clic accidentel sur « Fermer » détruisait le salon et le transcript dans la
 * foulée.
 */
async function askCloseConfirm(interaction: ButtonInteraction<'cached'>) {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket:close-confirm')
      .setLabel('Confirmer la fermeture')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('ticket:close-cancel')
      .setLabel('Annuler')
      .setStyle(ButtonStyle.Secondary)
  );
  return interaction.reply({
    content: '⚠️ **Confirmer la fermeture du ticket ?**\nLe salon sera supprimé après 5 s — un transcript sera archivé dans le salon de logs et le créateur recevra un DM avec la possibilité de rouvrir pendant 7 jours.',
    components: [row],
    flags: MessageFlags.Ephemeral
  });
}

/** Annulation de la fermeture — répond éphémèrement et retire les boutons. */
async function cancelClose(interaction: ButtonInteraction<'cached'>) {
  return interaction.update({ content: '❎ Fermeture annulée.', components: [] });
}

/** Fermeture confirmée : transcript + archivage + suppression du salon. */
async function doCloseTicket(interaction: ButtonInteraction<'cached'>, client: Client<true>) {
  await interaction.update({ content: '🔒 Fermeture du ticket dans 5 secondes...', components: [] });
  const channel = interaction.channel as TextChannel;

  const messages = await fetchAllMessages(channel);
  const transcript = messages.map((m) =>
    `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content || '(embed/pièce jointe)'}`
  ).join('\n');
  const attachment = new AttachmentBuilder(
    Buffer.from(transcript, 'utf-8'),
    { name: `${channel.name}.txt` }
  );

  // Résolution du salon de logs DANS le serveur du ticket (jamais via
  // `client.channels.fetch`, qui résout globalement et fuiterait le transcript
  // d'un serveur dans le salon d'un autre).
  const logsChannelId = getTicketLogsChannel(interaction.guild.id);
  if (logsChannelId) {
    const logs = await interaction.guild.channels.fetch(logsChannelId).catch(() => null);
    if (logs && logs.isTextBased() && 'send' in logs) {
      await logs.send({
        content: `📁 **Ticket fermé** : \`${channel.name}\` par ${interaction.user.tag} ` +
                 `(${messages.length} message(s))`,
        files: [attachment],
        allowedMentions: { parse: [] }
      }).catch((e: unknown) => log.warn('archive failed', e));
    }
  }

  const ticket = await prisma.tickets.findUnique({ where: { channel_id: channel.id } });
  await prisma.tickets.update({
    where: { channel_id: channel.id },
    data: { status: 'closed', closed_at: Date.now() }
  });

  // Demande de notation + option de réouverture envoyées au créateur du ticket
  if (ticket) {
    const opener = await client.users.fetch(ticket.user_id).catch(() => null);
    if (opener) {
      const stars = new ActionRowBuilder<ButtonBuilder>().addComponents(
        [1, 2, 3, 4, 5].map((n) => new ButtonBuilder()
          .setCustomId(`ticketrating:${channel.id}:${n}`)
          .setLabel(String(n)).setEmoji('⭐').setStyle(ButtonStyle.Secondary))
      );
      const reopen = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket:reopen:${ticket.channel_id}`)
          .setLabel('Rouvrir le ticket')
          .setEmoji('🔓')
          .setStyle(ButtonStyle.Secondary)
      );
      const comment = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticketcomment:open:${ticket.channel_id}`)
          .setLabel('Laisser un commentaire')
          .setEmoji('💬')
          .setStyle(ButtonStyle.Primary)
      );
      opener.send({
        embeds: [embeds.primary()
          .setTitle('Votre ticket a été fermé')
          .setDescription(
            `Merci d'avoir contacté le support de **${interaction.guild.name}**.\n` +
            'Comment évaluez-vous votre expérience sur ce ticket ? (1 = mauvaise · 5 = excellente)\n\n' +
            '💬 *Tu peux aussi laisser un commentaire libre — il sera transmis à l\'équipe.*\n' +
            '🔓 *Le ticket peut être rouvert dans les 7 jours si la discussion n\'est pas terminée.*'
          )],
        components: [stars, reopen, comment]
      }).catch(() => {});
    }
  }

  setTimeout(() => channel.delete().catch(() => {}), 5000);
}

/** Délai au-delà duquel un ticket ne peut plus être rouvert (7 jours). */
const REOPEN_WINDOW_MS = 7 * DAY_MS;

/**
 * Réouverture d'un ticket : recrée un salon avec les permissions d'origine
 * (auteur + staff), met à jour la table tickets en repassant à `open`.
 * Peut être déclenché depuis un DM — on n'utilise jamais `interaction.guild`
 * ni `interaction.member`, tout est dérivé via `client.guilds.cache`.
 */
async function reopenTicket(interaction: ButtonInteraction, client: Client<true>, oldChannelId: string) {
  // Ephemeral n'est pas pertinent en DM mais accepté par l'API ; on garde
  // un comportement unifié.
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const ticket = await prisma.tickets.findUnique({ where: { channel_id: oldChannelId } });
  if (!ticket) {
    return interaction.editReply({ content: '❌ Ce ticket est introuvable dans la base.' });
  }

  const guild = client.guilds.cache.get(ticket.guild_id);
  if (!guild) return interaction.editReply({ content: '❌ Serveur introuvable.' });

  // Pour la vérif d'autorisation, on ne se fie pas à `interaction.member`
  // (null en DM) : on récupère le membre depuis le serveur cible.
  const member = await guild.members.fetch(interaction.user.id).catch(() => null);
  const cat = config.tickets.categories.find((c) => c.value === ticket.category);
  const categoryRoleId = ticket.category ? getTicketRole(guild.id, ticket.category) : null;
  if (ticket.user_id !== interaction.user.id && !canManageTicket(member, categoryRoleId)) {
    return interaction.editReply({ content: '❌ Seul le créateur du ticket, le staff responsable ou l\'administration peut le rouvrir.' });
  }
  if (ticket.closed_at && Date.now() - ticket.closed_at > REOPEN_WINDOW_MS) {
    return interaction.editReply({ content: '❌ Ce ticket a été fermé il y a plus de 7 jours.' });
  }

  // Limite anti-abus appliquée aussi à la réouverture
  const since = Date.now() - DAY_MS;
  const recent = await prisma.tickets.count({
    where: {
      guild_id: ticket.guild_id,
      user_id: ticket.user_id,
      status: 'open',
      created_at: { gte: since }
    }
  });
  if (recent >= MAX_TICKETS_PER_DAY) {
    return interaction.editReply({
      content: `❌ Tu as déjà ${recent} ticket(s) ouvert(s) dans les dernières 24 h.`
    });
  }

  // La catégorie doit toujours avoir un rôle responsable pour pouvoir rouvrir.
  if (!cat || !categoryRoleId) {
    return interaction.editReply({
      content: `❌ La catégorie d'origine (${ticket.category}) n'a plus de rôle responsable configuré. Demande à un administrateur de la réactiver avec \`/config ticket-role\` avant de rouvrir.`
    });
  }
  const category = cat;

  const overwrites = buildTicketOverwrites(guild.roles.everyone.id, ticket.user_id, categoryRoleId, getAdminRole(guild.id));

  const channelName = `${category.value}-${(await client.users.fetch(ticket.user_id).catch(() => null))?.username ?? 'inconnu'}-${ticket.number ?? 0}`;
  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: getTicketCategory(guild.id) || null,
    topic: `Ticket #${ticket.number} rouvert | Catégorie : ${category.label}`,
    permissionOverwrites: overwrites
  }).catch((e: unknown) => { log.error('reopen create channel failed', e); return null; });
  if (!channel) {
    return interaction.editReply({ content: '❌ Impossible de recréer le salon.' });
  }

  // Met à jour la table : nouveau channel_id, statut open, on conserve l'historique number/created_at
  await prisma.tickets.delete({ where: { channel_id: oldChannelId } }).catch(() => {});
  await prisma.tickets.create({
    data: {
      channel_id: channel.id,
      guild_id: ticket.guild_id,
      user_id: ticket.user_id,
      number: ticket.number,
      category: ticket.category,
      status: 'open',
      created_at: ticket.created_at
    }
  });

  const claimBtn = new ButtonBuilder()
    .setCustomId('ticket:claim').setLabel('Prendre en charge').setEmoji('✋').setStyle(ButtonStyle.Primary);
  const closeBtn = new ButtonBuilder()
    .setCustomId('ticket:close').setLabel('Fermer le ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger);

  await channel.send({
    content: `<@${ticket.user_id}> • <@&${categoryRoleId}>`,
    embeds: [embeds.primary()
      .setTitle(`Ticket #${ticket.number} — rouvert`)
      .setDescription('Le ticket a été rouvert. Reprends la discussion ici.')
      .setTimestamp()],
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(claimBtn, closeBtn)],
    allowedMentions: {
      users: [ticket.user_id],
      roles: [categoryRoleId]
    }
  });

  return interaction.editReply({ content: `✅ Ticket rouvert : ${channel}` });
}
