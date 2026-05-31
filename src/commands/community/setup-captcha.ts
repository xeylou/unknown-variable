import {
  SlashCommandBuilder, PermissionFlagsBits,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getConfig } from '../../utils/configCache';
import { requireAdmin } from '../../utils/permissions';
import * as embeds from '../../utils/embeds';

export default {
  data: new SlashCommandBuilder()
    .setName('setup-captcha')
    .setDescription('Déployer le message de vérification anti-robot (bouton)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    if (!await requireAdmin(interaction)) return;

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

    const embed = embeds.primary()
      .setTitle('🛡️ Vérification anti-robot')
      .setDescription(
        'Pour accéder au serveur, clique sur le bouton ci-dessous.\n\n' +
        'Un défi visuel **visible de toi seul** s\'affichera : recopie les caractères ' +
        'de l\'image pour prouver que tu es humain.'
      );

    const button = new ButtonBuilder()
      .setCustomId(`captcha:start:${interaction.guild.id}`)
      .setLabel('Vérifier')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success);

    const sent = await channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)],
      allowedMentions: { parse: [] }
    }).catch(() => null);
    if (!sent) {
      return interaction.reply({ content: "❌ Échec de l'envoi du message de vérification.", flags: MessageFlags.Ephemeral });
    }

    // Avertit si le CAPTCHA n'est pas (encore) configuré : sans rôle non-vérifié,
    // le bouton fonctionne mais ne protège rien.
    const enabled = (await getConfig(interaction.guild.id, 'captcha_enabled', '0')) === '1';
    const unverified = await getConfig(interaction.guild.id, 'captcha_unverified_role');
    const warnings: string[] = [];
    if (!enabled) warnings.push('le CAPTCHA est **désactivé** (`/config captcha actif:true`)');
    if (!unverified) warnings.push('aucun **rôle non-vérifié** n\'est défini (`/config captcha … role-non-verifie:@rôle`)');
    const warn = warnings.length ? `\n⚠️ Attention : ${warnings.join(' ; ')}.` : '';

    return interaction.reply({
      content: `✅ Message de vérification déployé dans ${channel}.${warn}`,
      flags: MessageFlags.Ephemeral
    });
  }
};
