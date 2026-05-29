import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { notifyAndRecord } from '../../utils/moderation';

export default {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Avertir un membre')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('membre').setDescription('Membre à avertir').setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription("Raison de l'avertissement")),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const target = interaction.options.getUser('membre', true);
    const reason = interaction.options.getString('raison');

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '❌ Vous ne pouvez pas vous avertir vous-même.', flags: MessageFlags.Ephemeral });
    }
    if (target.bot) {
      return interaction.reply({ content: '❌ Impossible d\'avertir un bot.', flags: MessageFlags.Ephemeral });
    }

    const id = await notifyAndRecord({
      guild: interaction.guild, target, moderator: interaction.user, type: 'warn', reason
    });
    return interaction.reply(
      `⚠️ ${target} a reçu un avertissement (#${id}).${reason ? ` Raison : ${reason}` : ''}`
    );
  }
};
