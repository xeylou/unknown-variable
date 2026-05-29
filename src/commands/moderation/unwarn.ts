import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { deactivateWarn } from '../../utils/sanctions';

export default {
  data: new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Retirer un avertissement du casier')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addIntegerOption((o) =>
      o.setName('id').setDescription('Numéro de la sanction (visible avec /casier)').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const id = interaction.options.getInteger('id', true);
    const res = await deactivateWarn(interaction.guild.id, id);

    if (res.count === 0) {
      return interaction.reply({
        content: `❌ Aucun avertissement actif avec l'identifiant #${id}.`,
        flags: MessageFlags.Ephemeral
      });
    }
    return interaction.reply(`✅ Avertissement #${id} retiré du casier.`);
  }
};
