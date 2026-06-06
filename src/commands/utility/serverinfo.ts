import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType,
  type ChatInputCommandInteraction
} from 'discord.js';
import config from '../../config';
import { base, frLoc, resolveLang, t } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription(base('serverinfo.cmd.desc'))
    .setDescriptionLocalizations(frLoc('serverinfo.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const lang = resolveLang(interaction.locale);
    const guild = interaction.guild;
    const channels = guild.channels.cache;
    const textCount = channels.filter((c) => c.type === ChannelType.GuildText).size;
    const voiceCount = channels.filter((c) => c.type === ChannelType.GuildVoice).size;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL() ?? undefined })
      .setThumbnail(guild.iconURL({ size: 256 }) ?? null)
      .addFields(
        { name: t(lang, 'common.field.id'), value: `\`${guild.id}\``, inline: true },
        { name: t(lang, 'serverinfo.field.owner'), value: `<@${guild.ownerId}>`, inline: true },
        { name: t(lang, 'serverinfo.field.created'), value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
        { name: t(lang, 'common.field.members'), value: `${guild.memberCount}`, inline: true },
        { name: t(lang, 'serverinfo.field.channels'), value: `💬 ${textCount}  •  🔊 ${voiceCount}`, inline: true },
        { name: t(lang, 'common.field.roles'), value: `${guild.roles.cache.size}`, inline: true },
        { name: t(lang, 'serverinfo.field.boosts'), value: t(lang, 'serverinfo.boosts.value', { count: guild.premiumSubscriptionCount ?? 0, tier: guild.premiumTier }), inline: true },
        { name: t(lang, 'serverinfo.field.emojis'), value: `${guild.emojis.cache.size}`, inline: true }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
