import {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import config from '../../config';

export default {
  data: (() => {
    const b = new SlashCommandBuilder()
      .setName('setup-roles')
      .setDescription('Déployer un panneau de rôles auto-attribuables (boutons)')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addRoleOption((o) => o.setName('role1').setDescription('Rôle 1').setRequired(true))
      .addStringOption((o) => o.setName('titre').setDescription('Titre du panneau'))
      .addStringOption((o) => o.setName('description').setDescription('Texte du panneau'));
    for (let i = 2; i <= 5; i++) {
      b.addRoleOption((o) => o.setName(`role${i}`).setDescription(`Rôle ${i}`));
    }
    return b;
  })(),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const roles = [];
    for (let i = 1; i <= 5; i++) {
      const role = interaction.options.getRole(`role${i}`);
      if (role) roles.push(role);
    }

    // Le bot doit pouvoir attribuer chaque rôle
    const channel = interaction.channel;
    if (!channel || !channel.isTextBased() || !('send' in channel) || !('permissionsFor' in channel)) {
      return interaction.reply({ content: '❌ Cette commande doit être lancée dans un salon texte.', flags: MessageFlags.Ephemeral });
    }
    const me = interaction.guild.members.me;
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

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(interaction.options.getString('titre') || '🎭 Choisis tes rôles')
      .setDescription(
        (interaction.options.getString('description') ||
          'Clique sur un bouton pour obtenir ou retirer le rôle correspondant.') +
        '\n\n' + roles.map((r) => `• ${r}`).join('\n')
      );

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
    return interaction.reply({ content: '✅ Panneau de rôles déployé.', flags: MessageFlags.Ephemeral });
  }
};
