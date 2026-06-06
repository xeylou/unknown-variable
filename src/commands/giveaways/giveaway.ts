import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags,
  type ChatInputCommandInteraction, type AutocompleteInteraction
} from 'discord.js';
import { prisma } from '../../database';
import { parseDuration, formatDuration } from '../../utils/duration';
import * as giveaways from '../../features/giveaways';
import { respondChoices } from '../../utils/autocomplete';
import config from '../../config';
import { base, frLoc } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription(base('giveaway.cmd.desc'))
      .setDescriptionLocalizations(frLoc('giveaway.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('lancer').setDescription(base('giveaway.sub.lancer.desc'))
      .setDescriptionLocalizations(frLoc('giveaway.sub.lancer.desc'))
      .addStringOption((o) => o.setName('lot').setDescription(base('giveaway.opt.lot.desc'))
      .setDescriptionLocalizations(frLoc('giveaway.opt.lot.desc')).setRequired(true))
      .addStringOption((o) => o.setName('duree').setDescription('Ex : 30m, 6h, 2d').setRequired(true))
      .addIntegerOption((o) => o.setName('gagnants').setDescription(base('giveaway.opt.gagnants.desc'))
      .setDescriptionLocalizations(frLoc('giveaway.opt.gagnants.desc'))
        .setMinValue(1).setMaxValue(20))
      .addIntegerOption((o) => o.setName('age-min')
        .setDescription(base('giveaway.opt.age.desc'))
      .setDescriptionLocalizations(frLoc('giveaway.opt.age.desc')).setMinValue(0).setMaxValue(365))
      .addRoleOption((o) => o.setName('role-requis').setDescription(base('giveaway.opt.role_requis.desc'))
      .setDescriptionLocalizations(frLoc('giveaway.opt.role_requis.desc')))
      .addRoleOption((o) => o.setName('role-bonus').setDescription(base('giveaway.opt.role_bonus.desc'))
      .setDescriptionLocalizations(frLoc('giveaway.opt.role_bonus.desc')))
      .addIntegerOption((o) => o.setName('multiplicateur').setDescription(base('giveaway.opt.mult.desc'))
      .setDescriptionLocalizations(frLoc('giveaway.opt.mult.desc'))
        .setMinValue(1).setMaxValue(10)))
    .addSubcommand((s) => s.setName('terminer').setDescription(base('giveaway.sub.terminer.desc'))
      .setDescriptionLocalizations(frLoc('giveaway.sub.terminer.desc'))
      .addStringOption((o) => o.setName('message-id').setDescription('ID du message du giveaway').setRequired(true).setAutocomplete(true)))
    .addSubcommand((s) => s.setName('relancer').setDescription(base('giveaway.sub.relancer.desc'))
      .setDescriptionLocalizations(frLoc('giveaway.sub.relancer.desc'))
      .addStringOption((o) => o.setName('message-id').setDescription('ID du message du giveaway').setRequired(true).setAutocomplete(true)))
    .addSubcommand((s) => s.setName('pause').setDescription(base('giveaway.sub.pause.desc'))
      .setDescriptionLocalizations(frLoc('giveaway.sub.pause.desc'))
      .addStringOption((o) => o.setName('message-id').setDescription('ID du message').setRequired(true).setAutocomplete(true)))
    .addSubcommand((s) => s.setName('reprendre').setDescription(base('giveaway.sub.reprendre.desc'))
      .setDescriptionLocalizations(frLoc('giveaway.sub.reprendre.desc'))
      .addStringOption((o) => o.setName('message-id').setDescription('ID du message').setRequired(true).setAutocomplete(true)))
    .addSubcommand((s) => s.setName('edit').setDescription(base('giveaway.sub.edit.desc'))
      .setDescriptionLocalizations(frLoc('giveaway.sub.edit.desc'))
      .addStringOption((o) => o.setName('message-id').setDescription('ID du message').setRequired(true).setAutocomplete(true))
      .addStringOption((o) => o.setName('lot').setDescription(base('giveaway.opt.new_lot.desc'))
      .setDescriptionLocalizations(frLoc('giveaway.opt.new_lot.desc')))
      .addStringOption((o) => o.setName('duree').setDescription('Nouvelle durée — recalcule la fin'))
      .addIntegerOption((o) => o.setName('gagnants').setDescription(base('giveaway.opt.new_winners.desc'))
      .setDescriptionLocalizations(frLoc('giveaway.opt.new_winners.desc')).setMinValue(1).setMaxValue(20)))
    .addSubcommand((s) => s.setName('liste').setDescription(base('giveaway.sub.liste.desc'))
      .setDescriptionLocalizations(frLoc('giveaway.sub.liste.desc')))
    .addSubcommand((s) => s.setName('info').setDescription(base('giveaway.sub.info.desc'))
      .setDescriptionLocalizations(frLoc('giveaway.sub.info.desc'))
      .addStringOption((o) => o.setName('message-id').setDescription('ID du message').setRequired(true).setAutocomplete(true))),

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.guildId) return;
    const rows = await prisma.giveaways.findMany({
      where: { guild_id: interaction.guildId, ended: 0 },
      orderBy: { ends_at: 'asc' },
      take: 25
    });
    await respondChoices(interaction, rows.map((g) => ({
      name: `🎉 ${g.prize} (${g.winners} gagnant${g.winners > 1 ? 's' : ''})`,
      value: g.message_id
    })));
  },

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const sub = interaction.options.getSubcommand();
    const channel = interaction.channel;
    if (!channel || !channel.isTextBased() || !('send' in channel)) {
      return interaction.reply({ content: '❌ Salon non texte.', flags: MessageFlags.Ephemeral });
    }

    // --- lancer ---
    if (sub === 'lancer') {
      const prize = interaction.options.getString('lot', true);
      const winners = interaction.options.getInteger('gagnants') ?? 1;
      const ms = parseDuration(interaction.options.getString('duree', true));
      if (!ms || ms < 10_000) {
        return interaction.reply({ content: '❌ Durée invalide (minimum 10s). Ex : `30m`, `6h`, `2d`.', flags: MessageFlags.Ephemeral });
      }

      const minAge = interaction.options.getInteger('age-min');
      const requiredRole = interaction.options.getRole('role-requis');
      const bonusRole = interaction.options.getRole('role-bonus');
      const multiplier = interaction.options.getInteger('multiplicateur') ?? 2;

      const requirements: giveaways.Requirements = {};
      if (minAge && minAge > 0) requirements.min_age_days = minAge;
      if (requiredRole) requirements.required_role_ids = [requiredRole.id];

      const bonusRoles: giveaways.BonusRoles = {};
      if (bonusRole) bonusRoles[bonusRole.id] = multiplier;

      const g = {
        prize, winners, host_id: interaction.user.id, ends_at: Date.now() + ms,
        requirements: Object.keys(requirements).length ? JSON.stringify(requirements) : null,
        bonus_roles: Object.keys(bonusRoles).length ? JSON.stringify(bonusRoles) : null,
        paused: 0
      };
      const message = await channel.send({
        embeds: [giveaways.buildEmbed(g, { count: 0 })],
        components: [giveaways.buildRow()],
        allowedMentions: { parse: [] }
      });

      await prisma.giveaways.create({
        data: {
          message_id: message.id,
          channel_id: channel.id,
          guild_id: interaction.guild.id,
          prize,
          winners,
          host_id: g.host_id,
          ends_at: g.ends_at,
          requirements: g.requirements,
          bonus_roles: g.bonus_roles
        }
      });

      giveaways.schedule({ ...g, message_id: message.id });
      return interaction.reply({ content: `✅ Giveaway lancé pour **${formatDuration(ms)}**.`, flags: MessageFlags.Ephemeral });
    }

    // --- terminer ---
    if (sub === 'terminer') {
      const id = interaction.options.getString('message-id', true).trim();
      const g = await prisma.giveaways.findUnique({ where: { message_id: id } });
      if (!g) return interaction.reply({ content: '❌ Giveaway introuvable.', flags: MessageFlags.Ephemeral });
      if (g.ended) return interaction.reply({ content: 'ℹ️ Ce giveaway est déjà terminé.', flags: MessageFlags.Ephemeral });
      await giveaways.endGiveaway(id, true);
      return interaction.reply({ content: '✅ Giveaway terminé.', flags: MessageFlags.Ephemeral });
    }

    // --- relancer ---
    if (sub === 'relancer') {
      const id = interaction.options.getString('message-id', true).trim();
      const result = await giveaways.reroll(id);
      if (!result) return interaction.reply({ content: '❌ Giveaway introuvable.', flags: MessageFlags.Ephemeral });
      if (!result.winners.length) {
        return interaction.reply({ content: '😕 Aucun participant pour ce giveaway.', flags: MessageFlags.Ephemeral });
      }
      await interaction.reply({
        content: `🔄 Nouveau(x) gagnant(s) pour **${result.g.prize}** : ` +
                 result.winners.map((u) => `<@${u}>`).join(', '),
        allowedMentions: { users: result.winners }
      });
      return;
    }

    // --- pause / reprendre ---
    if (sub === 'pause' || sub === 'reprendre') {
      const id = interaction.options.getString('message-id', true).trim();
      const g = await prisma.giveaways.findUnique({ where: { message_id: id } });
      if (!g) return interaction.reply({ content: '❌ Giveaway introuvable.', flags: MessageFlags.Ephemeral });
      if (g.ended) return interaction.reply({ content: '❌ Déjà terminé.', flags: MessageFlags.Ephemeral });

      if (sub === 'pause') {
        if (g.paused) return interaction.reply({ content: 'ℹ️ Déjà en pause.', flags: MessageFlags.Ephemeral });
        await prisma.giveaways.update({
          where: { message_id: id },
          data: { paused: 1, paused_at: Date.now() }
        });
      } else {
        if (!g.paused) return interaction.reply({ content: 'ℹ️ Déjà en cours.', flags: MessageFlags.Ephemeral });
        // Décale ends_at de la durée passée en pause pour préserver la durée restante
        const newEndsAt = g.ends_at + (Date.now() - (g.paused_at ?? Date.now()));
        await prisma.giveaways.update({
          where: { message_id: id },
          data: { paused: 0, paused_at: null, ends_at: newEndsAt }
        });
        // Reprogramme
        giveaways.schedule({ ...g, paused: 0, ends_at: newEndsAt });
      }
      await refreshGiveawayMessage(interaction.client, id);
      return interaction.reply({
        content: sub === 'pause' ? '⏸️ Giveaway mis en pause.' : '▶️ Giveaway repris.',
        flags: MessageFlags.Ephemeral
      });
    }

    // --- edit ---
    if (sub === 'edit') {
      const id = interaction.options.getString('message-id', true).trim();
      const g = await prisma.giveaways.findUnique({ where: { message_id: id } });
      if (!g) return interaction.reply({ content: '❌ Giveaway introuvable.', flags: MessageFlags.Ephemeral });
      if (g.ended) return interaction.reply({ content: '❌ Déjà terminé.', flags: MessageFlags.Ephemeral });

      const prize = interaction.options.getString('lot', true);
      const durationStr = interaction.options.getString('duree', true);
      const winners = interaction.options.getInteger('gagnants');
      const patch: any = {};
      if (prize) patch.prize = prize;
      if (winners) patch.winners = winners;
      if (durationStr) {
        const ms = parseDuration(durationStr);
        if (!ms) return interaction.reply({ content: '❌ Durée invalide.', flags: MessageFlags.Ephemeral });
        patch.ends_at = Date.now() + ms;
      }
      if (!Object.keys(patch).length) {
        return interaction.reply({ content: '❌ Rien à modifier.', flags: MessageFlags.Ephemeral });
      }
      await prisma.giveaways.update({ where: { message_id: id }, data: patch });
      if (patch.ends_at) {
        // Reprogramme la fin avec la nouvelle date
        giveaways.schedule({ ...g, ...patch });
      }
      await refreshGiveawayMessage(interaction.client, id);
      return interaction.reply({ content: '✅ Giveaway modifié.', flags: MessageFlags.Ephemeral });
    }

    // --- liste ---
    if (sub === 'liste') {
      const rows = await prisma.giveaways.findMany({
        where: { guild_id: interaction.guild.id, ended: 0 },
        orderBy: { ends_at: 'asc' },
        take: 20
      });
      if (!rows.length) {
        return interaction.reply({ content: 'ℹ️ Aucun giveaway en cours.', flags: MessageFlags.Ephemeral });
      }
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🎉 Giveaways en cours')
        .setDescription(rows.map((g) =>
          `**${g.prize}** · ${g.winners} gagnant(s) · ` +
          (g.paused ? '⏸️ pause' : `fin <t:${Math.floor(g.ends_at / 1000)}:R>`) + ` · ` +
          `[message](https://discord.com/channels/${g.guild_id}/${g.channel_id}/${g.message_id}) ` +
          `\`${g.message_id}\``
        ).join('\n'));
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // --- info ---
    if (sub === 'info') {
      const id = interaction.options.getString('message-id', true).trim();
      const g = await prisma.giveaways.findUnique({ where: { message_id: id } });
      if (!g) return interaction.reply({ content: '❌ Giveaway introuvable.', flags: MessageFlags.Ephemeral });
      const count = await prisma.giveaway_entries.count({ where: { message_id: id } });
      const req = giveaways.parseRequirements(g.requirements);
      const bonus = giveaways.parseBonusRoles(g.bonus_roles);
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`🎉 ${g.prize}`)
        .addFields(
          { name: 'Statut', value: g.ended ? '🔒 Terminé' : (g.paused ? '⏸️ Pause' : '🟢 En cours'), inline: true },
          { name: 'Gagnants', value: String(g.winners), inline: true },
          { name: 'Participants', value: String(count), inline: true },
          { name: 'Fin', value: `<t:${Math.floor(g.ends_at / 1000)}:F>` },
          { name: 'Hôte', value: `<@${g.host_id}>`, inline: true },
          { name: 'Conditions', value:
              [
                req.min_age_days ? `Ancienneté ≥ ${req.min_age_days} j` : null,
                req.required_role_ids?.length ? `Rôles : ${req.required_role_ids.map((id) => `<@&${id}>`).join(', ')}` : null
              ].filter(Boolean).join('\n') || '—' },
          { name: 'Bonus', value:
              Object.entries(bonus).map(([id, m]) => `<@&${id}> = ×${m}`).join(', ') || '—' }
        );
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  }
};

/** Rafraîchit le message du giveaway sur Discord après une modification. */
async function refreshGiveawayMessage(client: import('discord.js').Client, messageId: string) {
  const g = await prisma.giveaways.findUnique({ where: { message_id: messageId } });
  if (!g) return;
  const channel = await client.channels.fetch(g.channel_id).catch(() => null);
  if (!channel?.isTextBased() || !('messages' in channel)) return;
  const msg = await channel.messages.fetch(messageId).catch(() => null);
  if (!msg) return;
  const count = await prisma.giveaway_entries.count({ where: { message_id: messageId } });
  await msg.edit({
    embeds: [giveaways.buildEmbed(g, { count, paused: !!g.paused })]
  }).catch(() => {});
}
