import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { sendLog } from '../../features/logger';
import { requireStaff } from '../../utils/permissions';
import config from '../../config';
import { base, frLoc } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription(base('clear.cmd.desc'))
      .setDescriptionLocalizations(frLoc('clear.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((o) =>
      o.setName('nombre').setDescription(base('clear.opt.nombre.desc'))
      .setDescriptionLocalizations(frLoc('clear.opt.nombre.desc'))
        .setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption((o) =>
      o.setName('membre').setDescription(base('clear.opt.member.desc'))
      .setDescriptionLocalizations(frLoc('clear.opt.member.desc'))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    // Gate runtime : ManageMessages est aussi accordé au ticket-staff (via
    // /permissions grant-ticket-staff), or /clear doit rester réservé aux mods.
    if (!await requireStaff(interaction)) return;
    const amount = interaction.options.getInteger('nombre', true);
    const member = interaction.options.getUser('membre');
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = interaction.channel as import('discord.js').TextChannel | null;
    if (!channel || !('bulkDelete' in channel)) {
      return interaction.editReply('❌ Cette commande doit être lancée dans un salon texte.');
    }

    let messages = await channel.messages.fetch({ limit: 100 });
    // Discord refuse de supprimer en masse les messages de plus de 14 jours
    const cutoff = Date.now() - 14 * 86400000;
    messages = messages.filter((m) => m.createdTimestamp > cutoff);
    if (member) messages = messages.filter((m) => m.author.id === member.id);

    const toDelete = [...messages.values()].slice(0, amount);
    if (toDelete.length === 0) {
      return interaction.editReply(
        '❌ Aucun message supprimable trouvé (messages trop anciens, ou aucun de ce membre récemment).'
      );
    }

    const deleted = await channel.bulkDelete(toDelete, true);

    // --- Journal ---
    sendLog(interaction.guild, 'moderation', new EmbedBuilder()
      .setColor(config.colors.neutral)
      .setAuthor({ name: 'Nettoyage de messages' })
      .setDescription(
        `**Modérateur :** ${interaction.user}\n` +
        `**Salon :** ${interaction.channel}\n` +
        `**Messages supprimés :** ${deleted.size}` +
        (member ? `\n**Filtre :** messages de ${member}` : '')
      )
      .setTimestamp());

    // --- Retour détaillé ---
    let reply = `🧹 **${deleted.size}** message(s) supprimé(s)${member ? ` de ${member}` : ''}.`;
    if (deleted.size < amount) {
      reply += `\n*${amount - deleted.size} non supprimé(s) — trop anciens (> 14 jours) ou introuvables.*`;
    }
    return interaction.editReply(reply);
  }
};
