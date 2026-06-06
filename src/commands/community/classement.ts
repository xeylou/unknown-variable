import {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  type Guild, type GuildTextBasedChannel, type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import { createPanel, deletePanels, type LeaderboardType } from '../../features/leaderboards';
import { resetMessages } from '../../features/messagestats';
import { resetInvites } from '../../features/invitetracker';
import config from '../../config';
import { base, frLoc } from '../../i18n';

type ResetType = LeaderboardType | 'tout';

/**
 * Supprime les classements (un type ou tous) ET réinitialise les compteurs
 * correspondants. Appelé après confirmation depuis `classement:confirm-delete`.
 */
export async function performLeaderboardReset(guild: Guild, type: ResetType): Promise<number> {
  const n = await deletePanels(guild, type);
  if (type === 'messages' || type === 'tout') await resetMessages(guild.id);
  if (type === 'invites' || type === 'tout') await resetInvites(guild.id);
  return n;
}

/** Déploie un panneau de classement dans le salon choisi (ou le salon courant). */
async function deploy(interaction: ChatInputCommandInteraction<'cached'>, type: LeaderboardType) {
  const channel = (interaction.options.getChannel('salon') ?? interaction.channel) as GuildTextBasedChannel | null;
  if (!channel || !channel.isTextBased() || !('send' in channel) || !('permissionsFor' in channel)) {
    return interaction.reply({ content: '❌ Choisis un salon texte valide.', flags: MessageFlags.Ephemeral });
  }
  const me = interaction.guild.members.me;
  if (!me || !channel.permissionsFor(me)?.has(['SendMessages', 'EmbedLinks'])) {
    return interaction.reply({
      content: `❌ Il me manque la permission **Envoyer des messages** ou **Liens intégrés** dans ${channel}.`,
      flags: MessageFlags.Ephemeral
    });
  }

  const top = interaction.options.getInteger('top') ?? 10;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const sent = await createPanel(channel, type, top).catch(() => null);
  if (!sent) {
    return interaction.editReply('❌ Échec du déploiement du classement.');
  }
  const extra = type === 'invites'
    ? '\n*Le suivi des invitations nécessite la permission **Gérer le serveur** pour le bot.*'
    : '';
  return interaction.editReply(`✅ Classement déployé dans ${channel} — [voir le message](${sent.url}).${extra}`);
}

export default {
  data: new SlashCommandBuilder()
    .setName('classement')
    .setDescription(base('classement.cmd.desc'))
      .setDescriptionLocalizations(frLoc('classement.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('messages')
      .setDescription(base('classement.sub.messages.desc'))
      .setDescriptionLocalizations(frLoc('classement.sub.messages.desc'))
      .addChannelOption((o) => o.setName('salon')
        .setDescription(base('classement.opt.salon.desc'))
      .setDescriptionLocalizations(frLoc('classement.opt.salon.desc'))
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
      .addIntegerOption((o) => o.setName('top')
        .setDescription(base('classement.opt.top.desc'))
      .setDescriptionLocalizations(frLoc('classement.opt.top.desc')).setMinValue(3).setMaxValue(25)))
    .addSubcommand((s) => s.setName('invitations')
      .setDescription(base('classement.sub.invitations.desc'))
      .setDescriptionLocalizations(frLoc('classement.sub.invitations.desc'))
      .addChannelOption((o) => o.setName('salon')
        .setDescription('Salon où poster le classement (défaut : salon courant)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
      .addIntegerOption((o) => o.setName('top')
        .setDescription('Nombre de membres affichés (défaut : 10)').setMinValue(3).setMaxValue(25)))
    .addSubcommand((s) => s.setName('liste')
      .setDescription(base('classement.sub.liste.desc'))
      .setDescriptionLocalizations(frLoc('classement.sub.liste.desc')))
    .addSubcommand((s) => s.setName('supprimer')
      .setDescription(base('classement.sub.supprimer.desc'))
      .setDescriptionLocalizations(frLoc('classement.sub.supprimer.desc'))
      .addStringOption((o) => o.setName('type')
        .setDescription(base('classement.opt.type.desc'))
      .setDescriptionLocalizations(frLoc('classement.opt.type.desc')).setRequired(true)
        .addChoices(
          { name: 'Messages', value: 'messages' },
          { name: 'Invitations', value: 'invites' },
          { name: 'Tout', value: 'tout' }
        ))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === 'messages') return deploy(interaction, 'messages');
    if (sub === 'invitations') return deploy(interaction, 'invites');

    // --- Liste ---
    if (sub === 'liste') {
      const rows = await prisma.leaderboard_panels.findMany({ where: { guild_id: guild.id } });
      if (!rows.length) {
        return interaction.reply({
          content: 'ℹ️ Aucun classement déployé. Utilise `/classement messages` ou `/classement invitations`.',
          flags: MessageFlags.Ephemeral
        });
      }
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🏆 Classements déployés')
        .setDescription(rows.map((r) => {
          const label = r.type === 'messages' ? 'Messages' : 'Invitations';
          return `• **${label}** — [message](https://discord.com/channels/${guild.id}/${r.channel_id}/${r.message_id}) dans <#${r.channel_id}>`;
        }).join('\n'));
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // --- Supprimer (avec confirmation) ---
    if (sub === 'supprimer') {
      const type = interaction.options.getString('type', true) as ResetType;
      const label = type === 'messages' ? 'des messages' : type === 'invites' ? 'des invitations' : 'de TOUS les classements';
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`classement:confirm-delete:${type}`)
          .setLabel('Supprimer').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('classement:cancel-delete')
          .setLabel('Annuler').setStyle(ButtonStyle.Secondary)
      );
      return interaction.reply({
        content: `⚠️ Confirmer la suppression ${label} (message(s) + remise à zéro des compteurs) ? ` +
          'Cette action est irréversible.',
        components: [row],
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
