import { EmbedBuilder, MessageFlags, type ButtonInteraction } from 'discord.js';
import { grantTo, grantSuccessEmbed, grantAllTicketStaff } from '../commands/moderation/permissions';
import { requireAdmin } from '../utils/permissions';
import config from '../config';

export default {
  prefix: 'permissions',

  /** customId « permissions:grant-all » — accorde staff, admin et tous les ticket-staff. */
  async execute(interaction: ButtonInteraction<'cached'>, _client: unknown, args: string[]) {
    if (args[0] !== 'grant-all') return;
    if (!await requireAdmin(interaction)) return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const reason = `/permissions grant-all par ${interaction.user.tag}`;
    const staffResult = await grantTo(interaction.guild, 'staff', reason);
    const adminResult = await grantTo(interaction.guild, 'admin', reason);
    const ticketResults = await grantAllTicketStaff(interaction.guild, reason);

    const embeds: EmbedBuilder[] = [];
    const summary: string[] = [];

    for (const [label, result] of [
      ['Staff', staffResult],
      ['Admin', adminResult]
    ] as const) {
      if (result.kind === 'ok') {
        embeds.push(grantSuccessEmbed(result.roleName, result.added).setTitle(`✅ ${label} — ${result.roleName}`));
      } else {
        summary.push(`**${label} :** ${result.message}`);
      }
    }

    const ticketOk = ticketResults.filter((r) => r.kind === 'ok');
    const ticketErrors = ticketResults.filter((r) => r.kind === 'error');
    const ticketNoop = ticketResults.filter((r) => r.kind === 'noop');
    if (ticketOk.length) {
      summary.push(`**Ticket-staff :** ${ticketOk.length} rôle(s) mis à jour — ${ticketOk.map((r) => 'roleName' in r ? r.roleName : '').join(', ')}`);
    }
    if (ticketNoop.length) summary.push(`*${ticketNoop.length} rôle(s) ticket-staff déjà à jour.*`);
    for (const err of ticketErrors) summary.push(`**Ticket-staff erreur :** ${'message' in err ? err.message : ''}`);

    const lead = embeds.length
      ? `✨ ${embeds.length + ticketOk.length} rôle(s) mis à jour.${summary.length ? '\n\n' + summary.join('\n') : ''}`
      : summary.length
        ? summary.join('\n')
        : 'Rien à faire — tout est déjà configuré.';

    return interaction.editReply({
      content: lead,
      embeds: embeds.length ? embeds : [new EmbedBuilder().setColor(config.colors.neutral).setDescription('—')]
    });
  }
};
