import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import config from '../../config';
import { base, frLoc, ti } from '../../i18n';
import { openTicket } from '../../components/tickets';
import { requireAdmin } from '../../utils/permissions';
import { getTicketRole } from '../../utils/guildSettings';

const categoryChoices = config.tickets.categories.map((c) => ({ name: c.label, value: c.value }));

export default {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription(base('ticket.cmd.desc'))
      .setDescriptionLocalizations(frLoc('ticket.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((s) => s.setName('move')
      .setDescription(base('ticket.sub.move.desc'))
      .setDescriptionLocalizations(frLoc('ticket.sub.move.desc'))
      .addStringOption((o) => o.setName('categorie')
        .setDescription(base('ticket.opt.categorie.desc'))
      .setDescriptionLocalizations(frLoc('ticket.opt.categorie.desc')).setRequired(true).addChoices(...categoryChoices)))
    .addSubcommand((s) => s.setName('create')
      .setDescription(base('ticket.sub.create.desc'))
      .setDescriptionLocalizations(frLoc('ticket.sub.create.desc'))
      .addUserOption((o) => o.setName('utilisateur')
        .setDescription(base('ticket.create.opt.user.desc'))
        .setDescriptionLocalizations(frLoc('ticket.create.opt.user.desc')).setRequired(true))
      .addStringOption((o) => o.setName('categorie')
        .setDescription(base('ticket.create.opt.categorie.desc'))
        .setDescriptionLocalizations(frLoc('ticket.create.opt.categorie.desc')).setRequired(true).addChoices(...categoryChoices))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'move') return move(interaction);
    if (sub === 'create') return create(interaction);
  }
};

/** Change la catégorie d'un ticket : préfixe du nom de salon + topic + DB. */
async function move(interaction: ChatInputCommandInteraction<'cached'>) {
  const channel = interaction.channel as import('discord.js').TextChannel | null;
  if (!channel) return interaction.reply({ content: '❌ Salon introuvable.', flags: MessageFlags.Ephemeral });
  const ticket = await prisma.tickets.findUnique({ where: { channel_id: channel.id } });
  if (!ticket) {
    return interaction.reply({ content: '❌ Cette commande doit être lancée dans un ticket.', flags: MessageFlags.Ephemeral });
  }
  const targetValue = interaction.options.getString('categorie');
  const category = config.tickets.categories.find((c) => c.value === targetValue);
  if (!category) {
    return interaction.reply({ content: '❌ Catégorie inconnue.', flags: MessageFlags.Ephemeral });
  }
  if (ticket.category === targetValue) {
    return interaction.reply({ content: 'ℹ️ Le ticket est déjà dans cette catégorie.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply();

  // Récupère le pseudo d'origine depuis le nom de salon actuel (format
  // « <ancienne>-<pseudo>-<numero> ») pour préserver la convention de nommage.
  const parts = channel.name.split('-');
  const userPart = parts.length >= 3 ? parts.slice(1, -1).join('-') : interaction.user.username;
  const numberPart = ticket.number ?? parts[parts.length - 1];
  const newName = `${category.value}-${userPart}-${numberPart}`;

  await channel.setName(newName).catch(() => {});
  await channel.setTopic(
    `Ticket #${ticket.number} | Catégorie : ${category.label}`
  ).catch(() => {});

  await prisma.tickets.update({
    where: { channel_id: channel.id },
    data: { category: targetValue }
  });

  return interaction.editReply(`✅ Ticket déplacé vers **${category.label}**.`);
}

/**
 * Ouvre un ticket au nom d'un membre, dans la catégorie choisie. Réservé aux
 * admins ; la limite anti-spam (3/24 h) du self-service est volontairement
 * ignorée. Réutilise le cœur `openTicket` partagé avec le menu déroulant.
 */
async function create(interaction: ChatInputCommandInteraction<'cached'>) {
  if (!await requireAdmin(interaction)) return;

  const target = interaction.options.getUser('utilisateur', true);
  if (target.bot) {
    return interaction.reply({ content: ti(interaction.locale, 'ticket.create.bot'), flags: MessageFlags.Ephemeral });
  }

  const category = config.tickets.categories.find((c) => c.value === interaction.options.getString('categorie', true));
  if (!category) {
    return interaction.reply({ content: ti(interaction.locale, 'ticket.create.unknown_cat'), flags: MessageFlags.Ephemeral });
  }

  // La catégorie doit avoir un rôle responsable défini (`/config ticket-role`).
  const categoryRoleId = getTicketRole(interaction.guild.id, category.value);
  if (!categoryRoleId) {
    return interaction.reply({
      content: ti(interaction.locale, 'ticket.create.no_role', { label: category.label }),
      flags: MessageFlags.Ephemeral
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const channel = await openTicket({
    guild: interaction.guild,
    owner: target,
    category,
    categoryRoleId,
    openedByTag: interaction.user.tag
  });
  if (!channel) {
    return interaction.editReply({ content: ti(interaction.locale, 'ticket.create.failed') });
  }

  return interaction.editReply({
    content: ti(interaction.locale, 'ticket.create.ok', { user: `<@${target.id}>`, channel: channel.toString() }),
    allowedMentions: { parse: [] }
  });
}
