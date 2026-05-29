import { SlashCommandBuilder, ChannelType, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import { getConfig } from '../../utils/configCache';
import { buildEmbed, buildRow } from '../../features/suggestions';

/** Cooldown anti-spam suggestions : 10 min par membre (en mémoire). */
const COOLDOWN_MS = 10 * 60 * 1000;
const lastSuggestion = new Map<string, number>();

/** Catégories libres proposées en choix de tag (modifiables sans migration). */
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
    .setDescription('Proposer une suggestion pour le serveur')
    .addStringOption((o) =>
      o.setName('proposition').setDescription('Ta suggestion').setRequired(true).setMaxLength(1500))
    .addStringOption((o) => o.setName('categorie')
      .setDescription('Catégorie / tag').addChoices(...TAGS)),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    // --- Cooldown anti-spam (par membre, par serveur) ---
    const key = `${interaction.guild.id}:${interaction.user.id}`;
    const last = lastSuggestion.get(key) ?? 0;
    const remaining = COOLDOWN_MS - (Date.now() - last);
    if (remaining > 0) {
      return interaction.reply({
        content: `⏳ Attends encore **${Math.ceil(remaining / 60000)} min** avant ta prochaine suggestion.`,
        flags: MessageFlags.Ephemeral
      });
    }

    const channelId = await getConfig(interaction.guild.id, 'suggestions_channel');
    if (!channelId) {
      return interaction.reply({
        content: "⚠️ Le salon des suggestions n'est pas configuré. Un admin doit faire `/config suggestions`.",
        flags: MessageFlags.Ephemeral
      });
    }
    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel?.isTextBased()) {
      return interaction.reply({ content: '⚠️ Le salon des suggestions est introuvable.', flags: MessageFlags.Ephemeral });
    }

    const content = interaction.options.getString('proposition', true);
    const tag = interaction.options.getString('categorie') ?? null;
    const s = await prisma.suggestions.create({
      data: {
        guild_id: interaction.guild.id,
        author_id: interaction.user.id,
        content,
        tag,
        created_at: Date.now()
      }
    });

    const embed = await buildEmbed(s);
    const message = await channel.send({
      embeds: [embed],
      components: [buildRow(s)],
      allowedMentions: { parse: [] }
    });

    // Crée un thread de discussion attaché si le salon le supporte
    let threadId: string | null = null;
    if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) {
      const thread = await message.startThread({
        name: `Suggestion #${s.id} — ${content.slice(0, 50)}`,
        autoArchiveDuration: 1440 // 24 h
      }).catch(() => null);
      if (thread) threadId = thread.id;
    }

    await prisma.suggestions.update({
      where: { id: s.id },
      data: { message_id: message.id, thread_id: threadId }
    });

    lastSuggestion.set(key, Date.now());

    return interaction.reply({
      content: `✅ Suggestion **#${s.id}** envoyée dans ${channel}` +
               (threadId ? ` (thread <#${threadId}>)` : '') + '.',
      flags: MessageFlags.Ephemeral
    });
  }
};
