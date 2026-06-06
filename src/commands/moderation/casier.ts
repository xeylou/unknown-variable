import {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getSanctions } from '../../utils/sanctions';
import { LABELS } from '../../utils/moderation';
import config from '../../config';
import { base, frLoc } from '../../i18n';

const EMOJIS: Record<string, string> = {
  warn: '⚠️', kick: '👢', ban: '🔨', unban: '♻️', timeout: '⏳', untimeout: '✅'
};

/** Nombre de sanctions affichées par page. */
export const PAGE_SIZE = 10;

/** Construit l'embed du casier pour une page donnée. */
export function buildCasierEmbed(sanctions: any[], user: any, page = 0) {
  const totalPages = Math.max(1, Math.ceil(sanctions.length / PAGE_SIZE));
  const p = Math.min(Math.max(0, page), totalPages - 1);
  const activeWarns = sanctions.filter((s) => s.type === 'warn' && s.active).length;

  const lines = sanctions.slice(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE).map((s) => {
    const date = `<t:${Math.floor(s.created_at / 1000)}:d>`;
    const line = `${EMOJIS[s.type] || '•'} **#${s.id}** ${LABELS[s.type as import('../../utils/moderation').SanctionType] || s.type} — ` +
      `${s.reason || '*Sans raison*'} (<@${s.moderator_id}>, ${date})`;
    // Avertissement retiré : on le barre
    return (s.type === 'warn' && !s.active) ? `~~${line}~~` : line;
  });

  return new EmbedBuilder()
    .setColor(config.colors.warning)
    .setAuthor({ name: `Casier de ${user.tag}`, iconURL: user.displayAvatarURL() })
    .setDescription(lines.join('\n') || '*Aucune sanction.*')
    .setFooter({
      text: `Page ${p + 1}/${totalPages} • ${sanctions.length} sanction(s) • ${activeWarns} avertissement(s) actif(s)`
    });
}

/** Rangée de navigation du casier, ou null s'il n'y a qu'une seule page. */
export function casierRow(userId: string, page: number, totalPages: number) {
  if (totalPages <= 1) return null;
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`casier:nav:${userId}:${page - 1}`)
      .setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(page <= 0),
    new ButtonBuilder().setCustomId(`casier:nav:${userId}:${page + 1}`)
      .setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
  );
}

export default {
  data: new SlashCommandBuilder()
    .setName('casier')
    .setDescription(base('casier.cmd.desc'))
      .setDescriptionLocalizations(frLoc('casier.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('membre').setDescription(base('casier.opt.member.desc'))
      .setDescriptionLocalizations(frLoc('casier.opt.member.desc')).setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const user = interaction.options.getUser('membre', true);
    const sanctions = await getSanctions(interaction.guild.id, user.id);

    if (sanctions.length === 0) {
      return interaction.reply({ content: `✅ **${user.tag}** a un casier vierge.`, flags: MessageFlags.Ephemeral });
    }

    const totalPages = Math.ceil(sanctions.length / PAGE_SIZE);
    const row = casierRow(user.id, 0, totalPages);
    return interaction.reply({
      embeds: [buildCasierEmbed(sanctions, user, 0)],
      components: row ? [row] : [],
      flags: MessageFlags.Ephemeral
    });
  }
};
