import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { rconCommand, isConfigured } from '../../features/mcrcon';
import { base, frLoc } from '../../i18n';

/**
 * Gestion de la whitelist du serveur Minecraft via RCON.
 * Nécessite que RCON soit configuré dans /config minecraft-rcon.
 */
export default {
  data: new SlashCommandBuilder()
    .setName('mcwhitelist')
    .setDescription(base('mcwhitelist.cmd.desc'))
      .setDescriptionLocalizations(frLoc('mcwhitelist.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('add').setDescription(base('mcwhitelist.sub.add.desc'))
      .setDescriptionLocalizations(frLoc('mcwhitelist.sub.add.desc'))
      .addStringOption((o) => o.setName('pseudo').setDescription('Pseudo Minecraft').setRequired(true)))
    .addSubcommand((s) => s.setName('remove').setDescription(base('mcwhitelist.sub.remove.desc'))
      .setDescriptionLocalizations(frLoc('mcwhitelist.sub.remove.desc'))
      .addStringOption((o) => o.setName('pseudo').setDescription('Pseudo Minecraft').setRequired(true)))
    .addSubcommand((s) => s.setName('list').setDescription(base('mcwhitelist.sub.list.desc'))
      .setDescriptionLocalizations(frLoc('mcwhitelist.sub.list.desc'))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    if (!(await isConfigured(interaction.guild.id))) {
      return interaction.reply({
        content: '⚠️ RCON non configuré pour ce serveur. Utilise `/config minecraft-rcon`.',
        flags: MessageFlags.Ephemeral
      });
    }

    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (sub === 'add') {
      const pseudo = interaction.options.getString('pseudo', true).trim();
      if (!/^[A-Za-z0-9_]{3,16}$/.test(pseudo)) {
        return interaction.editReply('❌ Pseudo invalide.');
      }
      const out = await rconCommand(interaction.guild.id, `whitelist add ${pseudo}`);
      if (out === null) return interaction.editReply('❌ RCON injoignable.');
      return interaction.editReply(`📥 ${out || `\`${pseudo}\` ajouté à la whitelist.`}`);
    }

    if (sub === 'remove') {
      const pseudo = interaction.options.getString('pseudo', true).trim();
      const out = await rconCommand(interaction.guild.id, `whitelist remove ${pseudo}`);
      if (out === null) return interaction.editReply('❌ RCON injoignable.');
      return interaction.editReply(`📤 ${out || `\`${pseudo}\` retiré de la whitelist.`}`);
    }

    if (sub === 'list') {
      const out = await rconCommand(interaction.guild.id, 'whitelist list');
      if (out === null) return interaction.editReply('❌ RCON injoignable.');
      return interaction.editReply('```\n' + (out || '(vide)') + '\n```');
    }
  }
};
