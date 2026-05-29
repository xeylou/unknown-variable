import { MessageFlags, type ButtonInteraction, type Client } from 'discord.js';

export default {
  prefix: 'selfrole',

  async execute(interaction: ButtonInteraction<'cached'>, _client: Client<true>, args: string[]) {
    const roleId = args[0];
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) {
      return interaction.reply({ content: '❌ Ce rôle n\'existe plus.', flags: MessageFlags.Ephemeral });
    }

    const member = interaction.member;
    try {
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(role, 'Rôle auto-attribuable');
        return interaction.reply({ content: `➖ Rôle ${role} retiré.`, flags: MessageFlags.Ephemeral });
      }
      await member.roles.add(role, 'Rôle auto-attribuable');
      return interaction.reply({ content: `➕ Rôle ${role} ajouté.`, flags: MessageFlags.Ephemeral });
    } catch {
      return interaction.reply({
        content: '❌ Impossible de modifier ce rôle (mon rôle est-il assez haut ?).',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
