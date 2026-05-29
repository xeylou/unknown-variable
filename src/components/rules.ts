import { EmbedBuilder, MessageFlags, type ButtonInteraction, type Client } from 'discord.js';
import { getConfig } from '../utils/configCache';
import { sendLog } from '../features/logger';
import config from '../config';

export default {
  prefix: 'rules',

  async execute(interaction: ButtonInteraction<'cached'>, _client: Client<true>, args: string[]) {
    if (args[0] !== 'accept') return;

    const roleId = await getConfig(interaction.guild.id, 'verified_role');
    if (!roleId) {
      return interaction.reply({
        content: "⚠️ Le rôle de validation n'est pas configuré. Contactez un administrateur.",
        flags: MessageFlags.Ephemeral
      });
    }

    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) {
      return interaction.reply({
        content: '⚠️ Le rôle configuré est introuvable. Contactez un administrateur.',
        flags: MessageFlags.Ephemeral
      });
    }

    const member = interaction.member;
    if (member.roles.cache.has(roleId)) {
      return interaction.reply({
        content: '✅ Vous avez déjà accepté le règlement.',
        flags: MessageFlags.Ephemeral
      });
    }

    await member.roles.add(role, 'Règlement accepté');
    await interaction.reply({
      content: `✅ Merci ${member} ! Vous avez accepté le règlement et obtenu l'accès au serveur.`,
      flags: MessageFlags.Ephemeral
    });

    sendLog(interaction.guild, 'members', new EmbedBuilder()
      .setColor(config.colors.success)
      .setAuthor({ name: 'Règlement accepté' })
      .setDescription(`${member} (\`${member.id}\`) a accepté le règlement.`)
      .setTimestamp());
  }
};
