import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';

/**
 * /afk : marque le membre comme AFK. Le bot répond aux pings et signale le
 * statut lors du prochain message du membre lui-même (qui retire l'AFK).
 */
export default {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Te marque comme AFK (le bot répondra à ceux qui te pinguent)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addStringOption((o) => o.setName('raison').setDescription('Raison affichée').setMaxLength(200)),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const reason = interaction.options.getString('raison') ?? null;
    await prisma.afk.upsert({
      where: { guild_id_user_id: { guild_id: interaction.guild.id, user_id: interaction.user.id } },
      update: { reason, since: Date.now() },
      create: {
        guild_id: interaction.guild.id,
        user_id: interaction.user.id,
        reason,
        since: Date.now()
      }
    });
    return interaction.reply({
      content: `💤 Tu es maintenant AFK${reason ? ` : *${reason}*` : ''}. Envoie un message ici pour retirer ton statut.`,
      flags: MessageFlags.Ephemeral
    });
  }
};
