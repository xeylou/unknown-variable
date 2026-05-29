import { MessageFlags, type ButtonInteraction, type Client } from 'discord.js';
import { prisma } from '../database';
import { buildEmbed, buildRows, tallyVotes } from '../features/polls';

export default {
  prefix: 'poll',

  async execute(interaction: ButtonInteraction<'cached'>, _client: Client<true>, args: string[]) {
    if (args[0] !== 'vote') return;
    const idx = Number(args[1]);
    if (!Number.isInteger(idx) || idx < 0) return;

    const messageId = interaction.message.id;
    const poll = await prisma.polls.findUnique({ where: { message_id: messageId } });
    if (!poll) return interaction.reply({ content: '❌ Sondage introuvable.', flags: MessageFlags.Ephemeral });
    if (poll.ended) return interaction.reply({ content: '❌ Ce sondage est terminé.', flags: MessageFlags.Ephemeral });

    // Toggle / single-choice / multi-choice
    const existing = await prisma.poll_votes.findUnique({
      where: { message_id_user_id_option_idx: { message_id: messageId, user_id: interaction.user.id, option_idx: idx } }
    });

    if (existing) {
      // Annule ce vote précis
      await prisma.poll_votes.delete({
        where: { message_id_user_id_option_idx: { message_id: messageId, user_id: interaction.user.id, option_idx: idx } }
      });
    } else {
      if (!poll.multi_choice) {
        // Choix unique : supprime tout autre vote du même user d'abord
        await prisma.poll_votes.deleteMany({ where: { message_id: messageId, user_id: interaction.user.id } });
      }
      await prisma.poll_votes.create({
        data: { message_id: messageId, user_id: interaction.user.id, option_idx: idx }
      });
    }

    const tally = await tallyVotes(messageId);
    await interaction.update({
      embeds: [buildEmbed(poll, tally)],
      components: buildRows(JSON.parse(poll.options).length, false)
    }).catch(() => {});
  }
};
