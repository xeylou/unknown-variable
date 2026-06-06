import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags,
  type ChatInputCommandInteraction, type AutocompleteInteraction
} from 'discord.js';
import { prisma } from '../../database';
import config from '../../config';
import { respondChoices } from '../../utils/autocomplete';
import { base, frLoc, resolveLang, t } from '../../i18n';

/**
 * Système de tags / FAQ : réponses pré-écrites rappelées par `/tag <nom>`.
 * Pratique pour les règles, l'IP serveur MC, les liens utiles, etc.
 */
export default {
  data: new SlashCommandBuilder()
    .setName('tag')
    .setDescription(base('tag.cmd.desc'))
    .setDescriptionLocalizations(frLoc('tag.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) => s.setName('show')
      .setDescription(base('tag.sub.show.desc'))
      .setDescriptionLocalizations(frLoc('tag.sub.show.desc'))
      .addStringOption((o) => o.setName('nom')
        .setDescription(base('tag.opt.nom.desc'))
        .setDescriptionLocalizations(frLoc('tag.opt.nom.desc'))
        .setRequired(true).setAutocomplete(true)))
    .addSubcommand((s) => s.setName('ajouter')
      .setDescription(base('tag.sub.ajouter.desc'))
      .setDescriptionLocalizations(frLoc('tag.sub.ajouter.desc'))
      .addStringOption((o) => o.setName('nom')
        .setDescription(base('tag.opt.nom_short.desc'))
        .setDescriptionLocalizations(frLoc('tag.opt.nom_short.desc'))
        .setRequired(true).setMaxLength(50))
      .addStringOption((o) => o.setName('contenu')
        .setDescription(base('tag.opt.contenu.desc'))
        .setDescriptionLocalizations(frLoc('tag.opt.contenu.desc'))
        .setRequired(true).setMaxLength(2000)))
    .addSubcommand((s) => s.setName('editer')
      .setDescription(base('tag.sub.editer.desc'))
      .setDescriptionLocalizations(frLoc('tag.sub.editer.desc'))
      .addStringOption((o) => o.setName('nom')
        .setDescription(base('tag.opt.nom.desc'))
        .setDescriptionLocalizations(frLoc('tag.opt.nom.desc'))
        .setRequired(true).setAutocomplete(true))
      .addStringOption((o) => o.setName('contenu')
        .setDescription(base('tag.opt.contenu_new.desc'))
        .setDescriptionLocalizations(frLoc('tag.opt.contenu_new.desc'))
        .setRequired(true).setMaxLength(2000)))
    .addSubcommand((s) => s.setName('retirer')
      .setDescription(base('tag.sub.retirer.desc'))
      .setDescriptionLocalizations(frLoc('tag.sub.retirer.desc'))
      .addStringOption((o) => o.setName('nom')
        .setDescription(base('tag.opt.nom.desc'))
        .setDescriptionLocalizations(frLoc('tag.opt.nom.desc'))
        .setRequired(true).setAutocomplete(true)))
    .addSubcommand((s) => s.setName('liste')
      .setDescription(base('tag.sub.liste.desc'))
      .setDescriptionLocalizations(frLoc('tag.sub.liste.desc'))),

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.guildId) return;
    const rows = await prisma.tags.findMany({
      where: { guild_id: interaction.guildId },
      orderBy: { name: 'asc' },
      take: 100
    });
    await respondChoices(interaction, rows.map((tg) => ({ name: tg.name, value: tg.name })));
  },

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const lang = resolveLang(interaction.locale);
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;
    const isStaff = interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);

    if (sub === 'show') {
      const name = interaction.options.getString('nom', true).toLowerCase().trim();
      const tag = await prisma.tags.findUnique({ where: { guild_id_name: { guild_id: gid, name } } });
      if (!tag) {
        return interaction.reply({ content: t(lang, 'tag.show.notfound', { name }), flags: MessageFlags.Ephemeral });
      }
      return interaction.reply({ content: tag.content, allowedMentions: { parse: [] } });
    }

    if (sub === 'liste') {
      const rows = await prisma.tags.findMany({ where: { guild_id: gid }, orderBy: { name: 'asc' } });
      if (!rows.length) {
        return interaction.reply({ content: t(lang, 'tag.liste.empty'), flags: MessageFlags.Ephemeral });
      }
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(t(lang, 'tag.liste.title', { count: rows.length }))
        .setDescription(rows.map((tg) => `• \`${tg.name}\``).join(', '));
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    if (!isStaff) {
      return interaction.reply({ content: t(lang, 'tag.staff_only'), flags: MessageFlags.Ephemeral });
    }

    if (sub === 'ajouter') {
      const name = interaction.options.getString('nom', true).toLowerCase().trim();
      const content = interaction.options.getString('contenu', true);
      if (!/^[a-z0-9_-]{1,50}$/.test(name)) {
        return interaction.reply({ content: t(lang, 'tag.add.invalid_name'), flags: MessageFlags.Ephemeral });
      }
      const existing = await prisma.tags.findUnique({ where: { guild_id_name: { guild_id: gid, name } } });
      if (existing) {
        return interaction.reply({ content: t(lang, 'tag.add.exists', { name }), flags: MessageFlags.Ephemeral });
      }
      await prisma.tags.create({
        data: { guild_id: gid, name, content, created_by: interaction.user.id, created_at: Date.now() }
      });
      return interaction.reply({ content: t(lang, 'tag.add.ok', { name }), flags: MessageFlags.Ephemeral });
    }

    if (sub === 'editer') {
      const name = interaction.options.getString('nom', true).toLowerCase().trim();
      const content = interaction.options.getString('contenu', true);
      const res = await prisma.tags.updateMany({ where: { guild_id: gid, name }, data: { content } });
      return interaction.reply({
        content: res.count ? t(lang, 'tag.edit.ok', { name }) : t(lang, 'tag.edit.notfound', { name }),
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'retirer') {
      const name = interaction.options.getString('nom', true).toLowerCase().trim();
      const res = await prisma.tags.deleteMany({ where: { guild_id: gid, name } });
      return interaction.reply({
        content: res.count ? t(lang, 'tag.delete.ok', { name }) : t(lang, 'tag.delete.notfound', { name }),
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
