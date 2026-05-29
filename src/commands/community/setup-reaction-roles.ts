import {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import { emojiKey } from '../../features/reactionroles';
import config from '../../config';

/**
 * Crée un panneau « reaction roles » : un message embed avec une liste de
 * paires emoji → rôle. Le bot pose les réactions, et tout clic ajoute /
 * retire le rôle correspondant chez l'utilisateur.
 *
 * Format attendu pour `paires` : « <emoji1> <@&roleId1>, <emoji2> <@&roleId2>, … »
 * (jusqu'à 10 paires, on supporte emojis Unicode et custom serveur).
 */
export default {
  data: new SlashCommandBuilder()
    .setName('setup-reaction-roles')
    .setDescription('Déployer un panneau emoji → rôle (style classique)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption((o) => o.setName('titre').setDescription('Titre du panneau').setRequired(true))
    .addStringOption((o) => o.setName('description').setDescription('Description du panneau').setRequired(true))
    .addStringOption((o) => o.setName('paires')
      .setDescription("Paires emoji rôle, séparées par des virgules — ex. « 🟦 @Bleu, 🔴 @Rouge »").setRequired(true))
    .addBooleanOption((o) => o.setName('exclusif')
      .setDescription('Un seul rôle parmi la liste à la fois (défaut : non)')),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const titre = interaction.options.getString('titre', true);
    const description = interaction.options.getString('description', true);
    const pairesRaw = interaction.options.getString('paires', true);
    const exclusive = interaction.options.getBoolean('exclusif') ?? false;

    // Parse les paires : chaque paire = emoji + mention de rôle (`<@&id>`)
    const parsed: { emoji: string; emojiDisplay: string; roleId: string; roleName: string }[] = [];
    for (const chunk of pairesRaw.split(',')) {
      const m = chunk.trim().match(/^(\S+)\s+<@&(\d+)>$/);
      if (!m) {
        return interaction.reply({
          content: `❌ Format de paire invalide : \`${chunk.trim()}\`. Attendu : « emoji @Rôle ».`,
          flags: MessageFlags.Ephemeral
        });
      }
      const emojiRaw = m[1];
      const roleId = m[2];
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) {
        return interaction.reply({
          content: `❌ Rôle introuvable : ${emojiRaw}.`,
          flags: MessageFlags.Ephemeral
        });
      }
      // Custom emoji discord : `<:name:id>` ou `<a:name:id>`
      const customMatch = emojiRaw.match(/^<a?:([A-Za-z0-9_]+):(\d+)>$/);
      const emoji = customMatch ? { name: customMatch[1], id: customMatch[2] } : { name: emojiRaw, id: null };
      const me = interaction.guild.members.me;
      if (!me || role.managed || role.position >= me.roles.highest.position) {
        return interaction.reply({
          content: `❌ Je ne peux pas attribuer ${role} (rôle géré ou plus haut que le mien).`,
          flags: MessageFlags.Ephemeral
        });
      }
      parsed.push({
        emoji: emojiKey(emoji),
        emojiDisplay: emojiRaw,
        roleId,
        roleName: role.name
      });
    }

    if (parsed.length === 0 || parsed.length > 10) {
      return interaction.reply({ content: '❌ Donne entre 1 et 10 paires.', flags: MessageFlags.Ephemeral });
    }

    const channel = interaction.channel;
    if (!channel || !channel.isTextBased() || !('send' in channel) || !('permissionsFor' in channel)) {
      return interaction.reply({ content: '❌ Cette commande doit être lancée dans un salon texte.', flags: MessageFlags.Ephemeral });
    }
    const me = interaction.guild.members.me;
    if (!me || !channel.permissionsFor(me)?.has(['SendMessages', 'EmbedLinks', 'AddReactions'])) {
      return interaction.reply({
        content: `❌ Il me manque les permissions **Envoyer**, **Embeds** ou **Réactions** dans ${channel}.`,
        flags: MessageFlags.Ephemeral
      });
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(titre)
      .setDescription(
        description + '\n\n' +
        parsed.map((p) => `${p.emojiDisplay} — **${p.roleName}**`).join('\n') +
        (exclusive ? '\n\n*Mode exclusif : un seul rôle parmi la liste à la fois.*' : '')
      );

    const sent = await channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => null);
    if (!sent) {
      return interaction.reply({ content: "❌ Échec de l'envoi du panneau.", flags: MessageFlags.Ephemeral });
    }

    // Enregistre le panneau + ses entrées
    await prisma.reaction_role_panels.create({
      data: {
        message_id: sent.id,
        guild_id: interaction.guild.id,
        channel_id: sent.channelId,
        exclusive: exclusive ? 1 : 0,
        created_at: Date.now()
      }
    });
    for (const p of parsed) {
      await prisma.reaction_role_entries.create({
        data: { message_id: sent.id, emoji: p.emoji, role_id: p.roleId }
      });
      // Pose la réaction initiale (Discord accepte `<name:id>` ou unicode brut)
      await sent.react(p.emojiDisplay).catch(() => {});
    }

    return interaction.reply({
      content: `✅ Panneau reaction-roles déployé (${parsed.length} rôle(s)).`,
      flags: MessageFlags.Ephemeral
    });
  }
};
