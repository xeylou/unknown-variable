import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType,
  type ChatInputCommandInteraction
} from 'discord.js';
import config from '../../config';

export default {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Afficher les informations du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const guild = interaction.guild;
    const channels = guild.channels.cache;
    const textCount = channels.filter((c) => c.type === ChannelType.GuildText).size;
    const voiceCount = channels.filter((c) => c.type === ChannelType.GuildVoice).size;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL() ?? undefined })
      .setThumbnail(guild.iconURL({ size: 256 }) ?? null)
      .addFields(
        { name: 'Identifiant', value: `\`${guild.id}\``, inline: true },
        { name: 'Propriétaire', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Créé le', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
        { name: 'Membres', value: `${guild.memberCount}`, inline: true },
        { name: 'Salons', value: `💬 ${textCount}  •  🔊 ${voiceCount}`, inline: true },
        { name: 'Rôles', value: `${guild.roles.cache.size}`, inline: true },
        { name: 'Boosts', value: `${guild.premiumSubscriptionCount ?? 0} (niveau ${guild.premiumTier})`, inline: true },
        { name: 'Émojis', value: `${guild.emojis.cache.size}`, inline: true }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
