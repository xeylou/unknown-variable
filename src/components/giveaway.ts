import { MessageFlags, type ButtonInteraction, type Client } from 'discord.js';
import { prisma } from '../database';
import * as giveaways from '../features/giveaways';

export default {
  prefix: 'giveaway',

  async execute(interaction: ButtonInteraction<'cached'>, _client: Client<true>, args: string[]) {
    if (args[0] !== 'enter') return;

    const messageId = interaction.message.id;
    const g = await prisma.giveaways.findUnique({ where: { message_id: messageId } });
    if (!g || g.ended) {
      return interaction.reply({ content: '❌ Ce giveaway est terminé.', flags: MessageFlags.Ephemeral });
    }
    if (g.paused) {
      return interaction.reply({ content: '⏸️ Ce giveaway est actuellement en pause — réessaie plus tard.', flags: MessageFlags.Ephemeral });
    }

    // Vérifie les conditions d'entrée
    const req = giveaways.parseRequirements(g.requirements);
    const failure = await giveaways.checkEligibility(interaction.member, req);
    if (failure) {
      return interaction.reply({ content: `❌ ${failure}`, flags: MessageFlags.Ephemeral });
    }

    const entry = await prisma.giveaway_entries.findUnique({
      where: {
        message_id_user_id: {
          message_id: messageId,
          user_id: interaction.user.id
        }
      }
    });

    let reply;
    if (entry) {
      await prisma.giveaway_entries.delete({
        where: {
          message_id_user_id: {
            message_id: messageId,
            user_id: interaction.user.id
          }
        }
      });
      reply = '➖ Tu ne participes plus à ce giveaway.';
    } else {
      await prisma.giveaway_entries.create({
        data: {
          message_id: messageId,
          user_id: interaction.user.id
        }
      });
      // Note si l'utilisateur bénéficie d'un bonus
      const bonus = giveaways.parseBonusRoles(g.bonus_roles);
      let mult = 1;
      for (const [roleId, m] of Object.entries(bonus)) {
        if (interaction.member.roles.cache.has(roleId)) mult = Math.max(mult, m);
      }
      reply = mult > 1
        ? `🎉 Tu participes à ce giveaway avec un bonus **×${mult}** !`
        : '🎉 Tu participes à ce giveaway, bonne chance !';
    }

    // Met à jour le compteur de participants sur le message
    const count = await prisma.giveaway_entries.count({ where: { message_id: messageId } });
    await interaction.message.edit({
      embeds: [giveaways.buildEmbed(g, { count, paused: !!g.paused })]
    }).catch(() => {});

    return interaction.reply({ content: reply, flags: MessageFlags.Ephemeral });
  }
};
