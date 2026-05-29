import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { notifyAndRecord } from '../../utils/moderation';

export default {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription("Lever l'exclusion temporaire d'un membre")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('membre').setDescription('Membre').setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription('Raison')),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const user = interaction.options.getUser('membre', true);
    const member = interaction.options.getMember('membre');
    const reason = interaction.options.getString('raison');

    if (!member) {
      return interaction.reply({ content: '❌ Membre introuvable sur le serveur.', flags: MessageFlags.Ephemeral });
    }
    if (!member.isCommunicationDisabled()) {
      return interaction.reply({ content: 'ℹ️ Ce membre n\'est pas exclu.', flags: MessageFlags.Ephemeral });
    }

    await member.timeout(null, reason || undefined);
    await notifyAndRecord({
      guild: interaction.guild, target: user, moderator: interaction.user, type: 'untimeout', reason
    });
    return interaction.reply(`✅ L'exclusion de **${user.tag}** a été levée.`);
  }
};
