import {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType,
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { requireStaff } from '../../utils/permissions';
import { base, frLoc, resolveLang, t } from '../../i18n';

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
    .setDescription(base('embed.cmd.desc'))
    .setDescriptionLocalizations(frLoc('embed.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addChannelOption((o) => o.setName('salon')
      .setDescription(base('embed.opt.salon.desc'))
      .setDescriptionLocalizations(frLoc('embed.opt.salon.desc'))
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .addRoleOption((o) => o.setName('role1')
      .setDescription(base('embed.opt.role1.desc'))
      .setDescriptionLocalizations(frLoc('embed.opt.role1.desc')))
    .addRoleOption((o) => o.setName('role2')
      .setDescription(base('embed.opt.role2.desc'))
      .setDescriptionLocalizations(frLoc('embed.opt.role2.desc')))
    .addRoleOption((o) => o.setName('role3')
      .setDescription(base('embed.opt.role3.desc'))
      .setDescriptionLocalizations(frLoc('embed.opt.role3.desc'))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    // Gate runtime : empêche un ticket-staff (qui a ManageMessages via
    // grant-ticket-staff) de poster des embeds n'importe où.
    if (!await requireStaff(interaction)) return;
    const lang = resolveLang(interaction.locale);
    const channel = interaction.options.getChannel('salon', true) as import('discord.js').TextChannel;
    const me = interaction.guild.members.me;
    if (!me || !channel.permissionsFor(me)?.has(['SendMessages', 'EmbedLinks'])) {
      return interaction.reply({
        content: t(lang, 'embed.no_perms', { channel: channel.toString() }),
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

    // Les labels de la modale sont l'interface directe avec l'utilisateur —
    // on les localise selon la langue du client.
    const modal = new ModalBuilder()
      .setCustomId('embed:compose')
      .setTitle(t(lang, 'embed.modal.title'));
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId('titre').setLabel(t(lang, 'embed.modal.titre'))
          .setStyle(TextInputStyle.Short).setMaxLength(256).setRequired(false)),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId('description').setLabel(t(lang, 'embed.modal.description'))
          .setStyle(TextInputStyle.Paragraph).setMaxLength(4000).setRequired(true)),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId('couleur').setLabel(t(lang, 'embed.modal.couleur'))
          .setStyle(TextInputStyle.Short).setMaxLength(20).setRequired(false)),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId('image').setLabel(t(lang, 'embed.modal.image'))
          .setStyle(TextInputStyle.Short).setMaxLength(500).setRequired(false)),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId('footer').setLabel(t(lang, 'embed.modal.footer'))
          .setStyle(TextInputStyle.Short).setMaxLength(2048).setRequired(false))
    );
    return interaction.showModal(modal);
  }
};
