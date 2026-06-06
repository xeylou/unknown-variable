import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, version as djsVersion,
  type ChatInputCommandInteraction, type Client, type Guild
} from 'discord.js';
import config from '../../config';
import { base, frLoc, resolveLang, t, type Lang } from '../../i18n';

/** Formate une durée de fonctionnement (ms) en « 1 j 2 h 3 min » / « 1d 2h 3m ». */
function formatUptime(ms: number, lang: Lang) {
  const u = lang === 'fr' ? { d: 'j', h: 'h', m: 'min' } : { d: 'd', h: 'h', m: 'm' };
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d} ${u.d}`);
  if (h) parts.push(`${h} ${u.h}`);
  parts.push(`${m} ${u.m}`);
  return parts.join(' ');
}

export default {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription(base('botinfo.cmd.desc'))
    .setDescriptionLocalizations(frLoc('botinfo.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction: ChatInputCommandInteraction<'cached'>, client: Client<true>) {
    const lang = resolveLang(interaction.locale);
    const members = client.guilds.cache.reduce((n: number, g: Guild) => n + (g.memberCount || 0), 0);

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
      .setTitle(t(lang, 'botinfo.title'))
      .addFields(
        { name: t(lang, 'botinfo.field.latency'), value: `${Math.round(client.ws.ping)} ms`, inline: true },
        { name: t(lang, 'botinfo.field.uptime'), value: formatUptime(client.uptime ?? 0, lang), inline: true },
        { name: t(lang, 'botinfo.field.servers'), value: `${client.guilds.cache.size}`, inline: true },
        { name: t(lang, 'botinfo.field.members'), value: `${members}`, inline: true },
        { name: t(lang, 'botinfo.field.commands'), value: `${client.commands?.size ?? 0}`, inline: true },
        { name: '🧩 discord.js', value: `v${djsVersion}`, inline: true }
      )
      .setFooter({ text: `Node ${process.version}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
