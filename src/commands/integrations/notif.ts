import {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType, MessageFlags,
  type ChatInputCommandInteraction, type AutocompleteInteraction
} from 'discord.js';
import { prisma } from '../../database';
import config from '../../config';
import { respondChoices } from '../../utils/autocomplete';
import { base, frLoc } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('notif')
    .setDescription(base('notif.cmd.desc'))
      .setDescriptionLocalizations(frLoc('notif.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('ajouter-youtube').setDescription(base('notif.sub.youtube.desc'))
      .setDescriptionLocalizations(frLoc('notif.sub.youtube.desc'))
      .addStringOption((o) => o.setName('identifiant-chaine')
        .setDescription('ID de la chaîne (commence par UC..., voir Paramètres avancés YouTube)').setRequired(true))
      .addChannelOption((o) => o.setName('salon').setDescription(base('notif.opt.salon.desc'))
      .setDescriptionLocalizations(frLoc('notif.opt.salon.desc'))
        .addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption((o) => o.setName('nom').setDescription('Nom affiché de la chaîne'))
      .addRoleOption((o) => o.setName('role').setDescription('Rôle à mentionner à chaque annonce')))
    .addSubcommand((s) => s.setName('ajouter-twitch').setDescription(base('notif.sub.twitch.desc'))
      .setDescriptionLocalizations(frLoc('notif.sub.twitch.desc'))
      .addStringOption((o) => o.setName('pseudo').setDescription(base('notif.opt.pseudo.desc'))
      .setDescriptionLocalizations(frLoc('notif.opt.pseudo.desc')).setRequired(true))
      .addChannelOption((o) => o.setName('salon').setDescription('Salon des annonces')
        .addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addRoleOption((o) => o.setName('role').setDescription('Rôle à mentionner à chaque annonce')))
    .addSubcommand((s) => s.setName('ajouter-rss')
      .setDescription(base('notif.sub.rss.desc'))
      .setDescriptionLocalizations(frLoc('notif.sub.rss.desc'))
      .addStringOption((o) => o.setName('url')
        .setDescription("URL du flux RSS / Atom (https://...)").setRequired(true))
      .addChannelOption((o) => o.setName('salon').setDescription('Salon des annonces')
        .addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption((o) => o.setName('nom').setDescription('Nom affiché de la source (ex: « Instagram @builders »)'))
      .addRoleOption((o) => o.setName('role').setDescription('Rôle à mentionner à chaque annonce')))
    .addSubcommand((s) => s.setName('liste').setDescription(base('notif.sub.liste.desc'))
      .setDescriptionLocalizations(frLoc('notif.sub.liste.desc')))
    .addSubcommand((s) => s.setName('supprimer').setDescription(base('notif.sub.supprimer.desc'))
      .setDescriptionLocalizations(frLoc('notif.sub.supprimer.desc'))
      .addIntegerOption((o) => o.setName('id').setDescription('ID de la notification (voir /notif liste)').setRequired(true).setAutocomplete(true))),

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.guildId) return;
    const rows = await prisma.notifications.findMany({ where: { guild_id: interaction.guildId }, take: 25 });
    const icon: Record<string, string> = { youtube: '📺', twitch: '🔴', rss: '📰' };
    await respondChoices(interaction, rows.map((n) => ({
      name: `#${n.id} ${icon[n.platform] ?? ''} ${n.target_name || n.target}`.replace(/\s+/g, ' ').trim(),
      value: n.id
    })));
  },

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
          content: '⚠️ Les notifications Twitch ne sont pas disponibles sur ce bot : ' +
                   'l\'hébergeur doit configurer une application Twitch. ' +
                   'YouTube et RSS restent disponibles via `/notif`.',
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
