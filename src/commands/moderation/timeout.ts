import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { notifyAndRecord } from '../../utils/moderation';
import { parseDuration, formatDuration } from '../../utils/duration';

const MAX_TIMEOUT = 28 * 86400000; // limite Discord : 28 jours

export default {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Exclure temporairement un membre (réduction au silence)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('membre').setDescription('Membre à exclure').setRequired(true))
    .addStringOption((o) =>
      o.setName('duree').setDescription('Ex : 10m, 2h, 1d (maximum 28d)').setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription('Raison')),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const user = interaction.options.getUser('membre', true);
    const member = interaction.options.getMember('membre');
    const reason = interaction.options.getString('raison');
    const ms = parseDuration(interaction.options.getString('duree', true));

    if (!member) {
      return interaction.reply({ content: '❌ Membre introuvable sur le serveur.', flags: MessageFlags.Ephemeral });
    }
    if (!ms) {
      return interaction.reply({ content: '❌ Durée invalide. Exemples : `10m`, `2h`, `1d`.', flags: MessageFlags.Ephemeral });
    }
    if (ms > MAX_TIMEOUT) {
      return interaction.reply({ content: '❌ Durée maximale : 28 jours.', flags: MessageFlags.Ephemeral });
    }
    if (member.id === interaction.user.id) {
      return interaction.reply({ content: '❌ Action impossible sur vous-même.', flags: MessageFlags.Ephemeral });
    }
    if (!member.moderatable) {
      return interaction.reply({ content: '❌ Je ne peux pas exclure ce membre (rôle trop élevé ou permission manquante).', flags: MessageFlags.Ephemeral });
    }
    if (interaction.guild.ownerId !== interaction.user.id
        && interaction.member.roles.highest.position <= member.roles.highest.position) {
      return interaction.reply({ content: '❌ Ce membre a un rôle supérieur ou égal au vôtre.', flags: MessageFlags.Ephemeral });
    }

    const human = formatDuration(ms);
    const id = await notifyAndRecord({
      guild: interaction.guild, target: user, moderator: interaction.user, type: 'timeout',
      reason, expiresAt: Date.now() + ms, durationText: human, extra: `**Durée :** ${human}`
    });
    await member.timeout(ms, reason || undefined);
    return interaction.reply(`⏳ **${user.tag}** est exclu pour **${human}** (#${id}).${reason ? ` Raison : ${reason}` : ''}`);
  }
};
