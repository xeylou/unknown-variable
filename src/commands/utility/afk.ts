import { SlashCommandBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import { base, frLoc, resolveLang, t } from '../../i18n';

/**
 * /afk : marque le membre comme AFK. Le bot répond aux pings et signale le
 * statut lors du prochain message du membre lui-même (qui retire l'AFK).
 */
export default {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription(base('afk.cmd.desc'))
    .setDescriptionLocalizations(frLoc('afk.cmd.desc'))
    .addStringOption((o) => o.setName('raison')
      .setDescription(base('afk.opt.reason.desc'))
      .setDescriptionLocalizations(frLoc('afk.opt.reason.desc'))
      .setMaxLength(200)),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const lang = resolveLang(interaction.locale);
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
      content: reason
        ? t(lang, 'afk.set.reason', { reason })
        : t(lang, 'afk.set.noreason'),
      flags: MessageFlags.Ephemeral
    });
  }
};
