import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder,
  type ChatInputCommandInteraction
} from 'discord.js';
import config from '../../config';

export default {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription("Afficher l'avatar d'un membre en grand")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('membre').setDescription('Membre (toi par défaut)')),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const user = interaction.options.getUser('membre', true) || interaction.user;
    const url = user.displayAvatarURL({ size: 1024 });

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`Avatar de ${user.username}`)
      .setURL(url)
      .setImage(url);

    return interaction.reply({ embeds: [embed] });
  }
};
