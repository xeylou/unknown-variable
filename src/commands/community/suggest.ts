import { SlashCommandBuilder, ChannelType, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import { getConfig } from '../../utils/configCache';
import { buildEmbed, buildRow } from '../../features/suggestions';
import { base, frLoc, resolveLang, t } from '../../i18n';

const COOLDOWN_MS = 10 * 60 * 1000;
const lastSuggestion = new Map<string, number>();

const TAGS = [
  { name: '💡 Idée', value: 'idee' },
  { name: '🐛 Bug', value: 'bug' },
  { name: '🎨 UX / Design', value: 'ux' },
  { name: '⛏️ Serveur Minecraft', value: 'minecraft' },
  { name: '🛡️ Modération', value: 'moderation' },
  { name: '❓ Autre', value: 'autre' }
];

export default {
  data: new SlashCommandBuilder()
    .setName('suggestion')
    .setDescription(base('suggestion.cmd.desc'))
    .setDescriptionLocalizations(frLoc('suggestion.cmd.desc'))
    .addStringOption((o) => o.setName('proposition')
      .setDescription(base('suggestion.opt.proposition.desc'))
      .setDescriptionLocalizations(frLoc('suggestion.opt.proposition.desc'))
      .setRequired(true).setMaxLength(1500))
    .addStringOption((o) => o.setName('categorie')
      .setDescription(base('suggestion.opt.categorie.desc'))
      .setDescriptionLocalizations(frLoc('suggestion.opt.categorie.desc'))
      .addChoices(...TAGS)),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const lang = resolveLang(interaction.locale);
    const key = `${interaction.guild.id}:${interaction.user.id}`;
    const last = lastSuggestion.get(key) ?? 0;
    const remaining = COOLDOWN_MS - (Date.now() - last);
    if (remaining > 0) {
      return interaction.reply({ content: t(lang, 'suggestion.cooldown', { min: Math.ceil(remaining / 60000) }), flags: MessageFlags.Ephemeral });
    }
    const channelId = await getConfig(interaction.guild.id, 'suggestions_channel');
    if (!channelId) return interaction.reply({ content: t(lang, 'suggestion.no_channel'), flags: MessageFlags.Ephemeral });
    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel?.isTextBased()) return interaction.reply({ content: t(lang, 'suggestion.channel_missing'), flags: MessageFlags.Ephemeral });

    const content = interaction.options.getString('proposition', true);
    const tag = interaction.options.getString('categorie') ?? null;
    const s = await prisma.suggestions.create({ data: { guild_id: interaction.guild.id, author_id: interaction.user.id, content, tag, created_at: Date.now() } });
    const embed = await buildEmbed(s);
    const message = await channel.send({ embeds: [embed], components: [buildRow(s)], allowedMentions: { parse: [] } });
    let threadId: string | null = null;
    if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) {
      const thread = await message.startThread({ name: `Suggestion #${s.id} — ${content.slice(0, 50)}`, autoArchiveDuration: 1440 }).catch(() => null);
      if (thread) threadId = thread.id;
    }
    await prisma.suggestions.update({ where: { id: s.id }, data: { message_id: message.id, thread_id: threadId } });
    lastSuggestion.set(key, Date.now());
    return interaction.reply({
      content: threadId
        ? t(lang, 'suggestion.ok_thread', { id: s.id, channel: channel.toString(), thread: threadId })
        : t(lang, 'suggestion.ok', { id: s.id, channel: channel.toString() }),
      flags: MessageFlags.Ephemeral
    });
  }
};
