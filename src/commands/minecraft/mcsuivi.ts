import {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags,
  type ChatInputCommandInteraction, type AutocompleteInteraction, type Client
} from 'discord.js';
import { prisma } from '../../database';
import config from '../../config';
import { runWatcherNow } from '../../features/mcwatch';
import { respondChoices } from '../../utils/autocomplete';
import { base, frLoc } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('mcsuivi')
    .setDescription(base('mcsuivi.cmd.desc'))
      .setDescriptionLocalizations(frLoc('mcsuivi.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('ajouter')
      .setDescription(base('mcsuivi.sub.ajouter.desc'))
      .setDescriptionLocalizations(frLoc('mcsuivi.sub.ajouter.desc'))
      .addStringOption((o) => o.setName('ip')
        .setDescription(base('mcsuivi.opt.ip.desc'))
      .setDescriptionLocalizations(frLoc('mcsuivi.opt.ip.desc')).setRequired(true))
      .addChannelOption((o) => o.setName('salon')
        .setDescription('Salon où afficher le panneau de statut')
        .addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addRoleOption((o) => o.setName('role')
        .setDescription('Rôle mentionné à chaque changement de statut').setRequired(true))
      .addIntegerOption((o) => o.setName('intervalle')
        .setDescription(base('mcsuivi.opt.intervalle.desc'))
      .setDescriptionLocalizations(frLoc('mcsuivi.opt.intervalle.desc'))
        .setMinValue(2).setMaxValue(60)))
    .addSubcommand((s) => s.setName('liste')
      .setDescription(base('mcsuivi.sub.liste.desc'))
      .setDescriptionLocalizations(frLoc('mcsuivi.sub.liste.desc')))
    .addSubcommand((s) => s.setName('supprimer')
      .setDescription(base('mcsuivi.sub.supprimer.desc'))
      .setDescriptionLocalizations(frLoc('mcsuivi.sub.supprimer.desc'))
      .addIntegerOption((o) => o.setName('id')
        .setDescription('ID du suivi (voir /mcsuivi liste)').setRequired(true).setAutocomplete(true))),

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.guildId) return;
    const rows = await prisma.mc_watchers.findMany({ where: { guild_id: interaction.guildId }, take: 25 });
    await respondChoices(interaction, rows.map((w) => ({ name: `#${w.id} — ${w.ip}`, value: w.id })));
  },

  async execute(interaction: ChatInputCommandInteraction<'cached'>, client: Client<true>) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    // --- Ajouter ---
    if (sub === 'ajouter') {
      const ip = interaction.options.getString('ip', true).trim();
      const channel = interaction.options.getChannel('salon', true);
      const role = interaction.options.getRole('role', true);
      const interval = interaction.options.getInteger('intervalle') ?? 5;

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const watcher = await prisma.mc_watchers.create({
        data: {
          guild_id: gid,
          channel_id: channel.id,
          ip,
          role_id: role.id,
          interval_min: interval,
          created_at: Date.now()
        }
      });

      // Crée le panneau immédiatement (sans attendre le prochain cycle)
      await runWatcherNow(client, watcher.id);

      return interaction.editReply(
        `✅ Suivi **#${watcher.id}** créé pour \`${ip}\`.\n` +
        `Panneau dans ${channel} · rafraîchi toutes les **${interval} min** · ` +
        `${role} sera mentionné à chaque passage en ligne ou hors ligne.`
      );
    }

    // --- Liste ---
    if (sub === 'liste') {
      const watchers = await prisma.mc_watchers.findMany({ where: { guild_id: gid } });
      if (!watchers.length) {
        return interaction.reply({
          content: 'ℹ️ Aucun suivi configuré. Utiliser `/mcsuivi ajouter`.',
          flags: MessageFlags.Ephemeral
        });
      }
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('⛏️ Suivis Minecraft')
        .setDescription(watchers.map((w) =>
          `**#${w.id}** — \`${w.ip}\`\n` +
          `└ <#${w.channel_id}> · <@&${w.role_id}> · toutes les ${w.interval_min} min`
        ).join('\n\n'));
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // --- Supprimer ---
    if (sub === 'supprimer') {
      const id = interaction.options.getInteger('id', true);
      const watcher = await prisma.mc_watchers.findFirst({ where: { id, guild_id: gid } });
      if (!watcher) {
        return interaction.reply({ content: '❌ Suivi introuvable.', flags: MessageFlags.Ephemeral });
      }
      await prisma.mc_watchers.delete({ where: { id } });

      // Supprime le panneau associé si possible
      if (watcher.message_id) {
        const ch = interaction.guild.channels.cache.get(watcher.channel_id);
        if (ch?.isTextBased()) {
          const msg = await ch.messages.fetch(watcher.message_id).catch(() => null);
          await msg?.delete().catch(() => {});
        }
      }
      return interaction.reply({
        content: `🗑️ Suivi **#${id}** (\`${watcher.ip}\`) supprimé.`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
