import {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getConfig, setConfig } from '../../utils/configCache';
import { LOG_CATEGORIES, CATEGORY_LABELS } from '../../features/logger';
import { requireAdmin } from '../../utils/permissions';
import config from '../../config';

const categoryChoices = LOG_CATEGORIES.map((c) => ({ name: CATEGORY_LABELS[c], value: c }));

export default {
  data: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Configurer la journalisation du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('voir')
      .setDescription('Afficher la configuration des logs'))
    .addSubcommand((s) => s.setName('salon')
      .setDescription("Définir le salon d'une catégorie de logs")
      .addStringOption((o) => o.setName('categorie')
        .setDescription('Catégorie').setRequired(true).addChoices(...categoryChoices))
      .addChannelOption((o) => o.setName('salon')
        .setDescription('Salon texte').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand((s) => s.setName('toggle')
      .setDescription('Activer ou désactiver une catégorie de logs')
      .addStringOption((o) => o.setName('categorie')
        .setDescription('Catégorie').setRequired(true).addChoices(...categoryChoices))
      .addBooleanOption((o) => o.setName('actif')
        .setDescription('Activer ?').setRequired(true)))
    .addSubcommand((s) => s.setName('tout-dans')
      .setDescription('Envoyer toutes les catégories dans un seul salon')
      .addChannelOption((o) => o.setName('salon')
        .setDescription('Salon texte').addChannelTypes(ChannelType.GuildText).setRequired(true))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    if (!await requireAdmin(interaction)) return;
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;
    const ok = (msg: string) => interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });

    if (sub === 'salon') {
      const cat = interaction.options.getString('categorie', true);
      const ch = interaction.options.getChannel('salon', true);
      await setConfig(gid, `log_${cat}_channel`, ch.id);
      await setConfig(gid, `log_${cat}_enabled`, '1');
      return ok(`✅ Logs **${CATEGORY_LABELS[cat]}** → ${ch}`);
    }

    if (sub === 'toggle') {
      const cat = interaction.options.getString('categorie', true);
      const actif = interaction.options.getBoolean('actif', true);
      await setConfig(gid, `log_${cat}_enabled`, actif ? '1' : '0');
      return ok(`✅ Catégorie **${CATEGORY_LABELS[cat]}** ${actif ? 'activée' : 'désactivée'}.`);
    }

    if (sub === 'tout-dans') {
      const ch = interaction.options.getChannel('salon', true);
      for (const cat of LOG_CATEGORIES) {
        await setConfig(gid, `log_${cat}_channel`, ch.id);
        await setConfig(gid, `log_${cat}_enabled`, '1');
      }
      return ok(`✅ Toutes les catégories de logs seront envoyées dans ${ch}.`);
    }

    // --- voir ---
    const lines: string[] = [];
    for (const cat of LOG_CATEGORIES) {
      const channelId = await getConfig(gid, `log_${cat}_channel`);
      const enabled = (await getConfig(gid, `log_${cat}_enabled`, '1')) !== '0';
      const state = !channelId ? '⚪ Non configurée'
        : !enabled ? '⛔ Désactivée'
        : `🟢 <#${channelId}>`;
      lines.push(`${CATEGORY_LABELS[cat]} — ${state}`);
    }
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('📋 Configuration de la journalisation')
      .setDescription(lines.join('\n'))
      .setFooter({ text: "Le bot a besoin de la permission « Voir les logs d'audit » pour indiquer les auteurs." });
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};
