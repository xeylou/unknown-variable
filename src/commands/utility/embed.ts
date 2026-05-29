import {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType,
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { requireStaff } from '../../utils/permissions';

/** Compositions d'embed en attente, par identifiant d'utilisateur. */
export const pendingEmbeds = new Map<string, any>();

const PENDING_TTL = 10 * 60 * 1000;

/** Purge les compositions expirées. */
export function cleanupPending() {
  const now = Date.now();
  for (const [key, value] of pendingEmbeds) {
    if (value.expiresAt < now) pendingEmbeds.delete(key);
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Composer et envoyer un embed personnalisé')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addChannelOption((o) => o.setName('salon')
      .setDescription("Salon où envoyer l'embed").setRequired(true)
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .addRoleOption((o) => o.setName('role1').setDescription('Rôle à mentionner (optionnel)'))
    .addRoleOption((o) => o.setName('role2').setDescription('2ᵉ rôle à mentionner (optionnel)'))
    .addRoleOption((o) => o.setName('role3').setDescription('3ᵉ rôle à mentionner (optionnel)')),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    // Gate runtime : empêche un ticket-staff (qui a ManageMessages via
    // grant-ticket-staff) de poster des embeds n'importe où.
    if (!await requireStaff(interaction)) return;
    const channel = interaction.options.getChannel('salon', true) as import('discord.js').TextChannel;
    const me = interaction.guild.members.me;
    if (!me || !channel.permissionsFor(me)?.has(['SendMessages', 'EmbedLinks'])) {
      return interaction.reply({
        content: `❌ Il me manque la permission d'envoyer des messages ou des embeds dans ${channel}.`,
        flags: MessageFlags.Ephemeral
      });
    }

    const roleIds = ['role1', 'role2', 'role3']
      .map((name) => interaction.options.getRole(name)?.id)
      .filter((id): id is string => Boolean(id));

    cleanupPending();
    pendingEmbeds.set(interaction.user.id, {
      channelId: channel.id,
      roleIds,
      expiresAt: Date.now() + PENDING_TTL
    });

    const modal = new ModalBuilder().setCustomId('embed:compose').setTitle('Composer un embed');
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId('titre').setLabel('Titre')
          .setStyle(TextInputStyle.Short).setMaxLength(256).setRequired(false)),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId('description').setLabel('Description')
          .setStyle(TextInputStyle.Paragraph).setMaxLength(4000).setRequired(true)),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId('couleur').setLabel('Couleur (ex : #5865F2 ou « bleu »)')
          .setStyle(TextInputStyle.Short).setMaxLength(20).setRequired(false)),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId('image').setLabel('Image — URL https://… (optionnel)')
          .setStyle(TextInputStyle.Short).setMaxLength(500).setRequired(false)),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId('footer').setLabel('Texte du pied de page (optionnel)')
          .setStyle(TextInputStyle.Short).setMaxLength(2048).setRequired(false))
    );
    return interaction.showModal(modal);
  }
};
