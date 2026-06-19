import {
  MessageFlags, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle,
  type Client
} from 'discord.js';
import { getConfig } from '../utils/configCache';
import { verifyAnswer, buildChallengeReply } from '../features/captcha';
import { applyPlaceholders } from '../utils/placeholders';
import type { ComponentInteraction } from '../types';

/** Message affiché après réussite du CAPTCHA (configurable via `/config captcha-message`). */
const DEFAULT_SUCCESS_MESSAGE =
  '✅ Vérification réussie — bienvenue sur **{server}** ! Penser à accepter le règlement pour finaliser votre accès.';

export default {
  prefix: 'captcha',

  /**
   * Routes :
   *   captcha:start:<guildId>   → génère un défi et l'affiche EN ÉPHÉMÈRE (image + bouton)
   *   captcha:verify:<guildId>  → ouvre la modale de saisie
   *   captcha:submit:<guildId>  → valide la réponse
   *
   * Le défi n'est jamais posté publiquement : il n'apparaît qu'en réponse
   * éphémère au membre qui clique, donc lui seul le voit.
   */
  async execute(interaction: ComponentInteraction, _client: Client<true>, args: string[]) {
    const action = args[0];
    const guildId = args[1];
    if (!guildId) return;

    if (action === 'start') {
      if (!interaction.isButton()) return;
      const payload = await buildChallengeReply(interaction.guild, interaction.user.id);
      return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
    }

    if (action === 'verify') {
      if (!interaction.isButton()) return;
      const modal = new ModalBuilder()
        .setCustomId(`captcha:submit:${guildId}`)
        .setTitle('Vérification anti-robot')
        .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('answer')
            .setLabel('Recopier les caractères de l\'image')
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
        const member = interaction.member;
        const unverified = await getConfig(guildId, 'captcha_unverified_role');
        const verified = await getConfig(guildId, 'captcha_verified_role');
        if (unverified) await member.roles.remove(unverified, 'CAPTCHA réussi').catch(() => {});
        if (verified) await member.roles.add(verified, 'CAPTCHA réussi').catch(() => {});
        const successRaw = (await getConfig(guildId, 'captcha_success_message')) || DEFAULT_SUCCESS_MESSAGE;
        return interaction.reply({
          content: applyPlaceholders(successRaw, member),
          flags: MessageFlags.Ephemeral
        });
      }

      if (res.reason === 'no-pending') {
        return interaction.reply({ content: '❌ Aucune vérification en cours. Recliquer sur **Vérifier** dans le salon de vérification.', flags: MessageFlags.Ephemeral });
      }
      if (res.reason === 'expired') {
        return interaction.reply({ content: '⏰ Le défi a expiré. Recliquer sur **Vérifier** dans le salon de vérification.', flags: MessageFlags.Ephemeral });
      }
      if (res.reason === 'wrong') {
        return interaction.reply({
          content: `❌ Mauvaise réponse. Il vous reste **${res.remaining}** essai(s) — recliquer sur **Je suis humain**.`,
          flags: MessageFlags.Ephemeral
        });
      }
      if (res.reason === 'exhausted') {
        const payload = await buildChallengeReply(interaction.guild, interaction.user.id);
        return interaction.reply({
          content: '❌ Trois mauvaises réponses. Voici un **nouveau défi** — recopier les caractères puis cliquer sur **Je suis humain**.',
          ...payload,
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};
