import {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder,
  ActionRowBuilder, StringSelectMenuBuilder, MessageFlags, ChannelType,
  type ChatInputCommandInteraction, type GuildTextBasedChannel
} from 'discord.js';
import { requireAdmin } from '../../utils/permissions';
import { ticketStaffRoleIds } from '../../utils/guildSettings';
import { recordPanel, countPanels, buildDeleteConfirm } from '../../utils/panels';
import config from '../../config';
import { base, frLoc } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('setup-tickets')
    .setDescription(base('setuptickets.cmd.desc'))
      .setDescriptionLocalizations(frLoc('setuptickets.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('deployer')
      .setDescription(base('setuptickets.sub.deployer.desc'))
      .setDescriptionLocalizations(frLoc('setuptickets.sub.deployer.desc'))
      .addChannelOption((o) => o.setName('salon')
        .setDescription(base('setuptickets.opt.salon.desc'))
        .setDescriptionLocalizations(frLoc('setuptickets.opt.salon.desc'))
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
    .addSubcommand((s) => s.setName('supprimer')
      .setDescription(base('setuptickets.sub.supprimer.desc'))
      .setDescriptionLocalizations(frLoc('setuptickets.sub.supprimer.desc'))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    if (!await requireAdmin(interaction)) return;
    const sub = interaction.options.getSubcommand();

    // --- Supprimer (confirmation) ---
    if (sub === 'supprimer') {
      const count = await countPanels(interaction.guild, 'tickets');
      if (!count) {
        return interaction.reply({ content: 'ℹ️ Aucun panneau de tickets à supprimer.', flags: MessageFlags.Ephemeral });
      }
      return interaction.reply(buildDeleteConfirm('tickets'));
    }

    // --- Déployer ---
    const channel = (interaction.options.getChannel('salon') ?? interaction.channel) as GuildTextBasedChannel | null;
    if (!channel || !channel.isTextBased() || !('send' in channel) || !('permissionsFor' in channel)) {
      return interaction.reply({ content: '❌ Choisis un salon texte valide (option `salon`) ou lance la commande dans un salon texte.', flags: MessageFlags.Ephemeral });
    }
    const me = interaction.guild.members.me;
    if (!me || !channel.permissionsFor(me)?.has(['SendMessages', 'EmbedLinks'])) {
      return interaction.reply({
        content: `❌ Il me manque la permission **Envoyer des messages** ou **Liens intégrés** dans ${channel}.`,
        flags: MessageFlags.Ephemeral
      });
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.neutral)
      .setTitle('📁 Tickets')
      .setDescription(
        'Bienvenue sur le support.\n' +
        'Sélectionnez la catégorie la plus adaptée à votre demande pour ouvrir un ticket.\n' +
        'Une demande claire, détaillée et complète permet à notre équipe de builders Minecraft de vous répondre plus vite.\n\n' +
        '⚠️ **Les demandes incomplètes, non sérieuses ou hors sujet peuvent être refusées sans suite.**'
      );

    const menu = new StringSelectMenuBuilder()
      .setCustomId('ticket:category')
      .setPlaceholder('Choisissez une catégorie de ticket')
      .addOptions(config.tickets.categories.map((c) => ({
        label: c.label, description: c.description, value: c.value, emoji: c.emoji
      })));

    const sent = await channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
      allowedMentions: { parse: [] }
    }).catch(() => null);
    if (!sent) {
      return interaction.reply({ content: "❌ Échec de l'envoi du panneau.", flags: MessageFlags.Ephemeral });
    }
    await recordPanel('tickets', sent);
    const noRoles = ticketStaffRoleIds(interaction.guild.id).length === 0;
    return interaction.reply({
      content: `✅ Panneau déployé dans ${channel}.` + (noRoles
        ? '\n⚠️ Aucune catégorie n\'a de rôle responsable : les ouvertures seront refusées tant que tu n\'auras pas configuré `/config ticket-role`.'
        : ''),
      flags: MessageFlags.Ephemeral
    });
  }
};
