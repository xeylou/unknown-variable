import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import config from '../../config';
import { base, frLoc, resolveLang, t, type Lang } from '../../i18n';

/** Libellé localisé du type de changement enregistré. */
const KIND_LABEL: Record<string, Record<Lang, string>> = {
  nickname: { fr: 'Surnom', en: 'Nickname' },
  username: { fr: "Nom d'utilisateur", en: 'Username' },
  global:   { fr: 'Nom global', en: 'Display name' }
};

/**
 * Affiche l'historique des changements de pseudo (surnom serveur, nom
 * d'utilisateur, nom global) d'un membre. Alimenté par les events
 * `nameHistoryMember.ts` (surnom) et `nameHistoryUser.ts` (compte).
 */
export default {
  data: new SlashCommandBuilder()
    .setName('pseudos')
    .setDescription(base('pseudos.cmd.desc'))
      .setDescriptionLocalizations(frLoc('pseudos.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('membre')
      .setDescription(base('pseudos.opt.member.desc'))
      .setDescriptionLocalizations(frLoc('pseudos.opt.member.desc'))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const lang = resolveLang(interaction.locale);
    const user = interaction.options.getUser('membre') ?? interaction.user;

    const rows = await prisma.name_history.findMany({
      where: { guild_id: interaction.guild.id, user_id: user.id },
      orderBy: { changed_at: 'desc' },
      take: 20
    });

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
      .setTitle(t(lang, 'pseudos.title'));

    if (!rows.length) {
      embed.setDescription(t(lang, 'pseudos.empty'));
    } else {
      const none = lang === 'fr' ? '*(vide)*' : '*(empty)*';
      embed.setDescription(rows.map((r) => {
        const label = KIND_LABEL[r.kind]?.[lang] ?? r.kind;
        const from = r.old_value ? `\`${r.old_value}\`` : none;
        const to = r.new_value ? `\`${r.new_value}\`` : none;
        return `<t:${Math.floor(r.changed_at / 1000)}:R> · **${label}** : ${from} → ${to}`;
      }).join('\n').slice(0, 4000));
    }

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};
