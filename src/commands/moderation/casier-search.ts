import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import { LABELS, type SanctionType } from '../../utils/moderation';
import config from '../../config';

const SANCTION_TYPES = (Object.keys(LABELS) as SanctionType[]).map((t) => ({ name: LABELS[t], value: t }));

/**
 * Recherche dans le casier global du serveur — par modérateur, par type,
 * ou par mot-clé contenu dans la raison.
 */
export default {
  data: new SlashCommandBuilder()
    .setName('casier-search')
    .setDescription('Rechercher dans les sanctions du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('moderateur').setDescription('Filtrer par modérateur'))
    .addStringOption((o) => o.setName('type').setDescription('Filtrer par type de sanction').addChoices(...SANCTION_TYPES))
    .addStringOption((o) => o.setName('mot-cle').setDescription('Mot contenu dans la raison')),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const gid = interaction.guild.id;
    const mod = interaction.options.getUser('moderateur');
    const type = interaction.options.getString('type');
    const keyword = interaction.options.getString('mot-cle');

    if (!mod && !type && !keyword) {
      return interaction.reply({
        content: '❌ Fournis au moins un filtre (modérateur, type, ou mot-clé).',
        flags: MessageFlags.Ephemeral
      });
    }

    const rows = await prisma.sanctions.findMany({
      where: {
        guild_id: gid,
        ...(mod ? { moderator_id: mod.id } : {}),
        ...(type ? { type } : {}),
        ...(keyword ? { reason: { contains: keyword } } : {})
      },
      orderBy: { created_at: 'desc' },
      take: 20
    });

    if (!rows.length) {
      return interaction.reply({ content: 'ℹ️ Aucune sanction ne correspond à ces filtres.', flags: MessageFlags.Ephemeral });
    }

    const totalEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🔎 Recherche dans le casier')
      .setDescription([
        mod ? `**Modérateur :** <@${mod.id}>` : null,
        type ? `**Type :** ${LABELS[type as SanctionType]}` : null,
        keyword ? `**Mot-clé :** \`${keyword}\`` : null,
        `**Résultats :** ${rows.length} (20 max affichés)`
      ].filter(Boolean).join('\n'));

    const lines = rows.map((s) => {
      const reason = s.reason ? ` — ${s.reason.slice(0, 80)}` : '';
      return `**#${s.id}** · <t:${Math.floor(s.created_at / 1000)}:d> · ${LABELS[s.type as SanctionType] ?? s.type} · ` +
             `<@${s.user_id}> par <@${s.moderator_id}>${reason}`;
    }).join('\n');

    return interaction.reply({
      embeds: [totalEmbed.addFields({ name: 'Sanctions', value: lines.slice(0, 4096) })],
      flags: MessageFlags.Ephemeral
    });
  }
};
