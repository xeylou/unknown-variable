import {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import config from '../../config';
import { base, frLoc } from '../../i18n';

/**
 * Notes privées staff sur un membre. Invisibles au membre concerné.
 * Sous-commandes : ajouter / liste / retirer.
 */
export default {
  data: new SlashCommandBuilder()
    .setName('note')
    .setDescription(base('note.cmd.desc'))
      .setDescriptionLocalizations(frLoc('note.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) => s.setName('ajouter').setDescription(base('note.sub.ajouter.desc'))
      .setDescriptionLocalizations(frLoc('note.sub.ajouter.desc'))
      .addUserOption((o) => o.setName('membre').setDescription(base('note.opt.member.desc'))
      .setDescriptionLocalizations(frLoc('note.opt.member.desc')).setRequired(true))
      .addStringOption((o) => o.setName('texte').setDescription(base('note.opt.text.desc'))
      .setDescriptionLocalizations(frLoc('note.opt.text.desc')).setRequired(true).setMaxLength(1500)))
    .addSubcommand((s) => s.setName('liste').setDescription(base('note.sub.liste.desc'))
      .setDescriptionLocalizations(frLoc('note.sub.liste.desc'))
      .addUserOption((o) => o.setName('membre').setDescription('Membre').setRequired(true)))
    .addSubcommand((s) => s.setName('retirer').setDescription(base('note.sub.retirer.desc'))
      .setDescriptionLocalizations(frLoc('note.sub.retirer.desc'))
      .addIntegerOption((o) => o.setName('id').setDescription(base('note.opt.id.desc'))
      .setDescriptionLocalizations(frLoc('note.opt.id.desc')).setRequired(true))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    if (sub === 'ajouter') {
      const target = interaction.options.getUser('membre', true);
      const text = interaction.options.getString('texte', true);
      const row = await prisma.member_notes.create({
        data: {
          guild_id: gid,
          user_id: target.id,
          moderator_id: interaction.user.id,
          content: text,
          created_at: Date.now()
        }
      });
      return interaction.reply({
        content: `📝 Note **#${row.id}** ajoutée sur ${target.tag}.`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'liste') {
      const target = interaction.options.getUser('membre', true);
      const rows = await prisma.member_notes.findMany({
        where: { guild_id: gid, user_id: target.id },
        orderBy: { created_at: 'desc' },
        take: 25
      });
      if (!rows.length) {
        return interaction.reply({ content: `ℹ️ Aucune note sur ${target.tag}.`, flags: MessageFlags.Ephemeral });
      }
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setAuthor({ name: `Notes sur ${target.tag} (${rows.length})`, iconURL: target.displayAvatarURL() })
        .setDescription(rows.map((n) =>
          `**#${n.id}** · <t:${Math.floor(n.created_at / 1000)}:f> · <@${n.moderator_id}>\n` +
          `> ${n.content.slice(0, 200)}`
        ).join('\n\n'));
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    if (sub === 'retirer') {
      const id = interaction.options.getInteger('id', true);
      const res = await prisma.member_notes.deleteMany({ where: { id, guild_id: gid } });
      return interaction.reply({
        content: res.count ? `🗑️ Note #${id} retirée.` : `❌ Note #${id} introuvable.`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
