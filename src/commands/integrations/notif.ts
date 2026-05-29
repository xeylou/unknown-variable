import {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import config from '../../config';

export default {
  data: new SlashCommandBuilder()
    .setName('notif')
    .setDescription('Gérer les notifications YouTube / Twitch')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('ajouter-youtube').setDescription('Suivre une chaîne YouTube')
      .addStringOption((o) => o.setName('identifiant-chaine')
        .setDescription('ID de la chaîne (commence par UC..., voir Paramètres avancés YouTube)').setRequired(true))
      .addChannelOption((o) => o.setName('salon').setDescription('Salon des annonces')
        .addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption((o) => o.setName('nom').setDescription('Nom affiché de la chaîne'))
      .addRoleOption((o) => o.setName('role').setDescription('Rôle à mentionner à chaque annonce')))
    .addSubcommand((s) => s.setName('ajouter-twitch').setDescription('Suivre une chaîne Twitch')
      .addStringOption((o) => o.setName('pseudo').setDescription("Pseudo Twitch du streamer").setRequired(true))
      .addChannelOption((o) => o.setName('salon').setDescription('Salon des annonces')
        .addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addRoleOption((o) => o.setName('role').setDescription('Rôle à mentionner à chaque annonce')))
    .addSubcommand((s) => s.setName('ajouter-rss')
      .setDescription('Suivre un flux RSS / Atom (Instagram, TikTok, X, blog… via RSSHub ou natif)')
      .addStringOption((o) => o.setName('url')
        .setDescription("URL du flux RSS / Atom (https://...)").setRequired(true))
      .addChannelOption((o) => o.setName('salon').setDescription('Salon des annonces')
        .addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption((o) => o.setName('nom').setDescription('Nom affiché de la source (ex: « Instagram @builders »)'))
      .addRoleOption((o) => o.setName('role').setDescription('Rôle à mentionner à chaque annonce')))
    .addSubcommand((s) => s.setName('liste').setDescription('Lister les notifications configurées'))
    .addSubcommand((s) => s.setName('supprimer').setDescription('Supprimer une notification')
      .addIntegerOption((o) => o.setName('id').setDescription('ID de la notification (voir /notif liste)').setRequired(true))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    if (sub === 'ajouter-youtube') {
      const target = interaction.options.getString('identifiant-chaine', true).trim();
      const channel = interaction.options.getChannel('salon', true);
      const name = interaction.options.getString('nom') || target;
      const role = interaction.options.getRole('role');
      await prisma.notifications.create({
        data: {
          guild_id: gid,
          platform: 'youtube',
          target: target,
          target_name: name,
          discord_channel: channel.id,
          role_id: role?.id ?? null
        }
      });
      return interaction.reply({
        content: `✅ Notifications YouTube activées pour **${name}** dans ${channel}${role ? ` (ping ${role})` : ''}.`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'ajouter-twitch') {
      if (!config.twitch.clientId || !config.twitch.clientSecret) {
        return interaction.reply({
          content: '⚠️ Twitch non configuré : ajoute `TWITCH_CLIENT_ID` et `TWITCH_CLIENT_SECRET` dans le `.env`.',
          flags: MessageFlags.Ephemeral
        });
      }
      const target = interaction.options.getString('pseudo', true).trim().toLowerCase();
      const channel = interaction.options.getChannel('salon', true);
      const role = interaction.options.getRole('role');
      await prisma.notifications.create({
        data: {
          guild_id: gid,
          platform: 'twitch',
          target: target,
          target_name: target,
          discord_channel: channel.id,
          role_id: role?.id ?? null
        }
      });
      return interaction.reply({
        content: `✅ Notifications Twitch activées pour **${target}** dans ${channel}${role ? ` (ping ${role})` : ''}.`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'ajouter-rss') {
      const url = interaction.options.getString('url', true).trim();
      if (!/^https?:\/\/\S+$/i.test(url)) {
        return interaction.reply({
          content: '❌ URL invalide. Attendu : `https://...` (lien direct vers un flux RSS / Atom).',
          flags: MessageFlags.Ephemeral
        });
      }
      const channel = interaction.options.getChannel('salon', true);
      const name = interaction.options.getString('nom') || url;
      const role = interaction.options.getRole('role');
      await prisma.notifications.create({
        data: {
          guild_id: gid,
          platform: 'rss',
          target: url,
          target_name: name,
          discord_channel: channel.id,
          role_id: role?.id ?? null
        }
      });
      return interaction.reply({
        content: `✅ Flux RSS suivi : **${name}** → ${channel}${role ? ` (ping ${role})` : ''}.\n` +
          '*Le premier état est mémorisé sans annonce — les prochains publications déclencheront un message.*',
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'supprimer') {
      const id = interaction.options.getInteger('id', true);
      const res = await prisma.notifications.deleteMany({
        where: { id: id, guild_id: gid }
      });
      return interaction.reply({
        content: res.count ? `✅ Notification #${id} supprimée.` : `❌ Notification #${id} introuvable.`,
        flags: MessageFlags.Ephemeral
      });
    }

    // liste
    const rows = await prisma.notifications.findMany({
      where: { guild_id: gid }
    });
    if (!rows.length) {
      return interaction.reply({ content: 'ℹ️ Aucune notification configurée.', flags: MessageFlags.Ephemeral });
    }
    const platformIcon: Record<string, string> = {
      youtube: '📺 YouTube',
      twitch: '🔴 Twitch',
      rss: '📰 RSS'
    };
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🔔 Notifications configurées')
      .setDescription(rows.map((n) => {
        const platform = platformIcon[n.platform] ?? n.platform;
        const role = n.role_id ? ` · ping <@&${n.role_id}>` : '';
        return `**#${n.id}** • ${platform} — **${n.target_name || n.target}** → <#${n.discord_channel}>${role}`;
      }).join('\n'));
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};
