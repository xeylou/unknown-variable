import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import config from '../../config';
import { base, frLoc } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('ticket-stats')
    .setDescription(base('ticketstats.cmd.desc'))
      .setDescriptionLocalizations(frLoc('ticketstats.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const gid = interaction.guild.id;
    const open = await prisma.tickets.count({
      where: { guild_id: gid, status: 'open' }
    });
    const closed = await prisma.tickets.count({
      where: { guild_id: gid, status: 'closed' }
    });
    const ratingAggregate = await prisma.tickets.aggregate({
      _avg: { rating: true },
      _count: { rating: true },
      where: { guild_id: gid, rating: { not: null } }
    });

    const cnt = ratingAggregate._count.rating;
    const avg = ratingAggregate._avg.rating;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('📊 Statistiques des tickets')
      .addFields(
        { name: '🟢 Ouverts', value: `${open}`, inline: true },
        { name: '🔒 Fermés', value: `${closed}`, inline: true },
        { name: '📁 Total', value: `${open + closed}`, inline: true },
        {
          name: '⭐ Note moyenne',
          value: cnt > 0 && avg !== null ? `${avg.toFixed(2)} / 5  (${cnt} avis)` : 'Aucun avis'
        }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};
