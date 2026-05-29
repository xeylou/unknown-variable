import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder,
  type ChatInputCommandInteraction
} from 'discord.js';
import config from '../../config';

export default {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription("Afficher les informations d'un membre")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('membre').setDescription('Membre (toi par défaut)')),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const user = interaction.options.getUser('membre', true) || interaction.user;
    const member = interaction.options.getMember('membre') || interaction.member;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Identifiant', value: `\`${user.id}\``, inline: true },
        { name: 'Bot', value: user.bot ? 'Oui' : 'Non', inline: true },
        { name: 'Compte créé', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
      )
      .setTimestamp();

    if (member) {
      if (member.joinedTimestamp) {
        embed.addFields({ name: 'A rejoint le serveur', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true });
      }
      const roles = member.roles.cache.filter((r) => r.id !== interaction.guild.id);
      embed.addFields({
        name: `Rôles (${roles.size})`,
        value: roles.size ? [...roles.values()].join(', ').slice(0, 1024) : '*Aucun*'
      });
    }

    return interaction.reply({ embeds: [embed] });
  }
};
