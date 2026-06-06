import {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
  type Guild, type Role, type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import { parseColor } from '../../utils/colors';
import config from '../../config';
import { base, frLoc } from '../../i18n';

/**
 * Supprime tous les panneaux de rôles à boutons d'un serveur : efface chaque
 * message-panneau puis vide la table. Appelé après confirmation depuis le
 * composant `rolepanel:confirm-delete`.
 */
export async function performRolePanelsDelete(guild: Guild): Promise<number> {
  const rows = await prisma.button_role_panels.findMany({ where: { guild_id: guild.id } });
  for (const r of rows) {
    const channel = guild.channels.cache.get(r.channel_id);
    if (channel?.isTextBased() && 'messages' in channel) {
      await channel.messages.delete(r.message_id).catch(() => {});
    }
  }
  await prisma.button_role_panels.deleteMany({ where: { guild_id: guild.id } });
  return rows.length;
}

export default {
  data: (() => {
    const b = new SlashCommandBuilder()
      .setName('setup-roles')
      .setDescription(base('setuproles.cmd.desc'))
      .setDescriptionLocalizations(frLoc('setuproles.cmd.desc'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

    b.addSubcommand((s) => {
      s.setName('creer')
        .setDescription(base('setuproles.sub.creer.desc'))
      .setDescriptionLocalizations(frLoc('setuproles.sub.creer.desc'))
        .addRoleOption((o) => o.setName('role1').setDescription('Rôle 1').setRequired(true));
      for (let i = 2; i <= 5; i++) {
        s.addRoleOption((o) => o.setName(`role${i}`).setDescription(`Rôle ${i}`));
      }
      s.addStringOption((o) => o.setName('titre').setDescription('Titre de l\'embed'))
        .addStringOption((o) => o.setName('description').setDescription('Texte de l\'embed'))
        .addStringOption((o) => o.setName('couleur').setDescription(base('setuproles.opt.couleur.desc'))
      .setDescriptionLocalizations(frLoc('setuproles.opt.couleur.desc')))
        .addStringOption((o) => o.setName('image').setDescription('Image — URL https://… (optionnel)'))
        .addStringOption((o) => o.setName('pied').setDescription('Texte du pied de page (optionnel)'));
      return s;
    });

    b.addSubcommand((s) => s.setName('liste')
      .setDescription(base('setuproles.sub.liste.desc'))
      .setDescriptionLocalizations(frLoc('setuproles.sub.liste.desc')));

    b.addSubcommand((s) => s.setName('supprimer')
      .setDescription(base('setuproles.sub.supprimer.desc'))
      .setDescriptionLocalizations(frLoc('setuproles.sub.supprimer.desc')));

    return b;
  })(),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    // --- Créer ---
    if (sub === 'creer') {
      const roles: Role[] = [];
      for (let i = 1; i <= 5; i++) {
        const role = interaction.options.getRole(`role${i}`) as Role | null;
        if (role && !roles.some((r) => r.id === role.id)) roles.push(role);
      }

      const channel = interaction.channel;
      if (!channel || !channel.isTextBased() || !('send' in channel) || !('permissionsFor' in channel)) {
        return interaction.reply({ content: '❌ Cette commande doit être lancée dans un salon texte.', flags: MessageFlags.Ephemeral });
      }
      const me = guild.members.me;
      if (!me || !channel.permissionsFor(me)?.has(['SendMessages', 'EmbedLinks'])) {
        return interaction.reply({
          content: `❌ Il me manque la permission **Envoyer des messages** ou **Liens intégrés** dans ${channel}.`,
          flags: MessageFlags.Ephemeral
        });
      }

      const botHighest = me.roles.highest.position;
      const unassignable = roles.filter((r) => r.managed || r.position >= botHighest);
      if (unassignable.length) {
        return interaction.reply({
          content: `❌ Je ne peux pas attribuer : ${unassignable.join(', ')}. ` +
                   'Place mon rôle au-dessus de ces rôles (et évite les rôles gérés par une intégration).',
          flags: MessageFlags.Ephemeral
        });
      }

      const image = interaction.options.getString('image')?.trim();
      const pied = interaction.options.getString('pied')?.trim();

      const embed = new EmbedBuilder()
        .setColor(parseColor(interaction.options.getString('couleur')) ?? config.colors.primary)
        .setTitle(interaction.options.getString('titre') || '🎭 Choisis tes rôles')
        .setDescription(
          (interaction.options.getString('description') ||
            'Clique sur un bouton pour obtenir ou retirer le rôle correspondant.') +
          '\n\n' + roles.map((r) => `• ${r}`).join('\n')
        );
      if (image && /^https?:\/\//i.test(image)) embed.setImage(image);
      if (pied) embed.setFooter({ text: pied.slice(0, 2048) });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        roles.map((r) => new ButtonBuilder()
          .setCustomId(`selfrole:${r.id}`)
          .setLabel(r.name.slice(0, 80))
          .setStyle(ButtonStyle.Secondary))
      );

      const sent = await channel.send({
        embeds: [embed], components: [row], allowedMentions: { parse: [] }
      }).catch(() => null);
      if (!sent) {
        return interaction.reply({ content: "❌ Échec de l'envoi du panneau.", flags: MessageFlags.Ephemeral });
      }

      await prisma.button_role_panels.create({
        data: {
          message_id: sent.id,
          guild_id: guild.id,
          channel_id: sent.channelId,
          created_at: Date.now()
        }
      });

      return interaction.reply({
        content: `✅ Panneau de rôles déployé (${roles.length} rôle(s)).`,
        flags: MessageFlags.Ephemeral
      });
    }

    // --- Liste ---
    if (sub === 'liste') {
      const rows = await prisma.button_role_panels.findMany({ where: { guild_id: guild.id } });
      if (!rows.length) {
        return interaction.reply({
          content: 'ℹ️ Aucun panneau de rôles. Utilise `/setup-roles creer`.',
          flags: MessageFlags.Ephemeral
        });
      }
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🎭 Panneaux de rôles')
        .setDescription(rows.map((r) =>
          `• [Message](https://discord.com/channels/${guild.id}/${r.channel_id}/${r.message_id}) dans <#${r.channel_id}>`
        ).join('\n'));
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // --- Supprimer (avec confirmation) ---
    if (sub === 'supprimer') {
      const count = await prisma.button_role_panels.count({ where: { guild_id: guild.id } });
      if (!count) {
        return interaction.reply({
          content: 'ℹ️ Aucun panneau de rôles à supprimer.',
          flags: MessageFlags.Ephemeral
        });
      }
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('rolepanel:confirm-delete')
          .setLabel('Supprimer').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('rolepanel:cancel-delete')
          .setLabel('Annuler').setStyle(ButtonStyle.Secondary)
      );
      return interaction.reply({
        content: `⚠️ Confirmer la suppression des **${count}** panneau(x) de rôles ? ` +
          'Les messages seront effacés. Cette action est irréversible.',
        components: [row],
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
