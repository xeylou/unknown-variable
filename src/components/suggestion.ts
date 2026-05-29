import { PermissionFlagsBits, MessageFlags, type ButtonInteraction, type Client } from 'discord.js';
import { prisma } from '../database';
import { buildEmbed, buildRow } from '../features/suggestions';

export default {
  prefix: 'suggestion',

  async execute(interaction: ButtonInteraction<'cached'>, _client: Client<true>, args: string[]) {
    const [action, idStr] = args;
    const id = Number(idStr);
    const s = await prisma.suggestions.findUnique({ where: { id: id } });
    if (!s) {
      return interaction.reply({ content: '❌ Suggestion introuvable.', flags: MessageFlags.Ephemeral });
    }

    // --- Votes ---
    if (action === 'up' || action === 'down') {
      if (s.status !== 'pending') {
        return interaction.reply({ content: 'ℹ️ Les votes sont clos pour cette suggestion.', flags: MessageFlags.Ephemeral });
      }
      const vote = action === 'up' ? 1 : -1;
      const existing = await prisma.suggestion_votes.findUnique({
        where: { suggestion_id_user_id: { suggestion_id: id, user_id: interaction.user.id } }
      });

      if (existing && existing.vote === vote) {
        // Re-cliquer sur le même bouton annule le vote
        await prisma.suggestion_votes.delete({
          where: { suggestion_id_user_id: { suggestion_id: id, user_id: interaction.user.id } }
        });
      } else {
        await prisma.suggestion_votes.upsert({
          where: { suggestion_id_user_id: { suggestion_id: id, user_id: interaction.user.id } },
          update: { vote: vote },
          create: { suggestion_id: id, user_id: interaction.user.id, vote: vote }
        });
      }

      const fresh = await prisma.suggestions.findUnique({ where: { id: id } });
      if (!fresh) return;
      const embed = await buildEmbed(fresh);
      return interaction.update({ embeds: [embed], components: [buildRow(fresh)] });
    }

    // --- Décision du staff ---
    if (action === 'approve' || action === 'deny') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ content: '❌ Réservé au staff.', flags: MessageFlags.Ephemeral });
      }
      const status = action === 'approve' ? 'approved' : 'denied';
      await prisma.suggestions.update({ where: { id: id }, data: { status: status } });

      const fresh = await prisma.suggestions.findUnique({ where: { id: id } });
      if (!fresh) return;
      const embed = await buildEmbed(fresh);
      await interaction.update({ embeds: [embed], components: [buildRow(fresh)] });
      return interaction.followUp({
        content: `Suggestion #${id} **${status === 'approved' ? 'approuvée' : 'refusée'}** par ${interaction.user}.`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
