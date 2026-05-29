import {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder,
  ActionRowBuilder, StringSelectMenuBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { requireAdmin } from '../../utils/permissions';
import config from '../../config';

export default {
  data: new SlashCommandBuilder()
    .setName('setup-tickets')
    .setDescription('Déployer le panneau de tickets dans ce salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    if (!await requireAdmin(interaction)) return;
    const channel = interaction.channel;
    if (!channel || !channel.isTextBased() || !('send' in channel) || !('permissionsFor' in channel)) {
      return interaction.reply({ content: '❌ Cette commande doit être lancée dans un salon texte.', flags: MessageFlags.Ephemeral });
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
    return interaction.reply({ content: '✅ Panneau déployé.', flags: MessageFlags.Ephemeral });
  }
};
