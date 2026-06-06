import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder,
  type ChatInputCommandInteraction
} from 'discord.js';
import config from '../../config';
import { base, frLoc, resolveLang, t } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription(base('userinfo.cmd.desc'))
    .setDescriptionLocalizations(frLoc('userinfo.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('membre')
      .setDescription(base('userinfo.opt.member.desc'))
      .setDescriptionLocalizations(frLoc('userinfo.opt.member.desc'))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const lang = resolveLang(interaction.locale);
    const user = interaction.options.getUser('membre') ?? interaction.user;
    const member = interaction.options.getMember('membre') ?? interaction.member;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: t(lang, 'common.field.id'), value: `\`${user.id}\``, inline: true },
        { name: t(lang, 'userinfo.field.bot'), value: user.bot ? t(lang, 'common.yes') : t(lang, 'common.no'), inline: true },
        { name: t(lang, 'userinfo.field.created'), value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
      )
      .setTimestamp();

    if (member) {
      if (member.joinedTimestamp) {
        embed.addFields({ name: t(lang, 'userinfo.field.joined'), value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true });
      }
      const roles = member.roles.cache.filter((r) => r.id !== interaction.guild.id);
      embed.addFields({
        name: t(lang, 'userinfo.field.roles', { count: roles.size }),
        value: roles.size ? [...roles.values()].join(', ').slice(0, 1024) : t(lang, 'common.none')
      });
    }

    return interaction.reply({ embeds: [embed] });
  }
};
