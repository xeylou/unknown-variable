import {
  MessageFlags, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle,
  EmbedBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder,
  type Client
} from 'discord.js';
import { getConfig } from '../utils/configCache';
import { verifyAnswer, refreshChallenge } from '../features/captcha';
import config from '../config';
import type { ComponentInteraction } from '../types';

export default {
  prefix: 'captcha',

  /**
   * Routes :
   *   captcha:verify:<guildId>      → ouvre la modale
   *   captcha:submit:<guildId>      → valide la réponse
   */
  async execute(interaction: ComponentInteraction, client: Client<true>, args: string[]) {
    const action = args[0];
    const guildId = args[1];
    if (!guildId) return;

    if (action === 'verify') {
      if (!interaction.isButton()) return;
      const modal = new ModalBuilder()
        .setCustomId(`captcha:submit:${guildId}`)
        .setTitle('Vérification anti-robot')
        .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('answer')
            .setLabel('Recopie les caractères de l\'image')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(6)
            .setMaxLength(6)
            .setPlaceholder('Ex: A3MX7K')
        ));
      return interaction.showModal(modal);
    }

    if (action === 'submit') {
      if (!interaction.isModalSubmit()) return;
      const answer = interaction.fields.getTextInputValue('answer');
      const res = await verifyAnswer(guildId, interaction.user.id, answer);

      if (res.ok) {
        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) {
          return interaction.reply({ content: '✅ Vérification réussie, mais le serveur est introuvable.', flags: MessageFlags.Ephemeral });
        }
        const member = await guild.members.fetch(interaction.user.id).catch(() => null);
        if (!member) {
          return interaction.reply({ content: '✅ Vérifié, mais tu n\'es plus sur le serveur ?', flags: MessageFlags.Ephemeral });
        }
        const unverified = await getConfig(guildId, 'captcha_unverified_role');
        const verified = await getConfig(guildId, 'captcha_verified_role');
        if (unverified) await member.roles.remove(unverified, 'CAPTCHA réussi').catch(() => {});
        if (verified) await member.roles.add(verified, 'CAPTCHA réussi').catch(() => {});
        return interaction.reply({
          content: `✅ Bienvenue sur **${guild.name}** ! Tu as accès au serveur.`,
          flags: MessageFlags.Ephemeral
        });
      }

      if (res.reason === 'no-pending') {
        return interaction.reply({ content: '❌ Aucune vérification en cours pour toi. Rejoins le serveur à nouveau.', flags: MessageFlags.Ephemeral });
      }
      if (res.reason === 'expired') {
        return interaction.reply({ content: '⏰ Le challenge a expiré. Un staff peut te le renvoyer manuellement.', flags: MessageFlags.Ephemeral });
      }
      if (res.reason === 'wrong') {
        return interaction.reply({
          content: `❌ Mauvaise réponse. Il te reste **${res.remaining}** essai(s).`,
          flags: MessageFlags.Ephemeral
        });
      }
      if (res.reason === 'exhausted') {
        const { imageBuffer } = await refreshChallenge(guildId, interaction.user.id);

        const baseDesc =
          '❌ Trois mauvaises réponses. Un nouveau défi a été généré — ' +
          '**recopie les caractères affichés dans l\'image** ci-dessous.\n\n' +
          'Reclique sur le bouton **« Je suis humain »** pour réessayer.';

        const embed = new EmbedBuilder()
          .setColor(config.colors.warning)
          .setTitle('🔄 Nouveau défi CAPTCHA')
          .setDescription(imageBuffer ? baseDesc : baseDesc + '\n\n⚠️ L\'image est indisponible, contacte un staff.');

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`captcha:verify:${guildId}`)
            .setLabel('Je suis humain')
            .setEmoji('🤖')
            .setStyle(ButtonStyle.Primary)
        );

        const files: AttachmentBuilder[] = [];
        if (imageBuffer) {
          files.push(new AttachmentBuilder(imageBuffer, { name: 'captcha.png' }));
          embed.setImage('attachment://captcha.png');
        }

        return interaction.reply({ embeds: [embed], components: [row], files, flags: MessageFlags.Ephemeral });
      }
    }
  }
};
