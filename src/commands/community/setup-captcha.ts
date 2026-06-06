import {
  SlashCommandBuilder, PermissionFlagsBits,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getConfig } from '../../utils/configCache';
import { requireAdmin } from '../../utils/permissions';
import { recordPanel, countPanels, buildDeleteConfirm } from '../../utils/panels';
import * as embeds from '../../utils/embeds';
import { base, frLoc, resolveLang, t } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('setup-captcha')
    .setDescription(base('setupcaptcha.cmd.desc'))
    .setDescriptionLocalizations(frLoc('setupcaptcha.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('deployer')
      .setDescription(base('setupcaptcha.sub.deployer.desc'))
      .setDescriptionLocalizations(frLoc('setupcaptcha.sub.deployer.desc')))
    .addSubcommand((s) => s.setName('supprimer')
      .setDescription(base('setupcaptcha.sub.supprimer.desc'))
      .setDescriptionLocalizations(frLoc('setupcaptcha.sub.supprimer.desc'))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    if (!await requireAdmin(interaction)) return;
    const lang = resolveLang(interaction.locale);
    const sub = interaction.options.getSubcommand();

    // --- Supprimer (confirmation) ---
    if (sub === 'supprimer') {
      const count = await countPanels(interaction.guild, 'captcha');
      if (!count) {
        return interaction.reply({ content: t(lang, 'setupcaptcha.no_panel'), flags: MessageFlags.Ephemeral });
      }
      return interaction.reply(buildDeleteConfirm('captcha'));
    }

    // --- Déployer ---
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
      return interaction.reply({ content: t(lang, 'setupcaptcha.failed'), flags: MessageFlags.Ephemeral });
    }
    await recordPanel('captcha', sent);

    // Avertit si le CAPTCHA n'est pas (encore) configuré : sans rôle non-vérifié,
    // le bouton fonctionne mais ne protège rien.
    const enabled = (await getConfig(interaction.guild.id, 'captcha_enabled', '0')) === '1';
    const unverified = await getConfig(interaction.guild.id, 'captcha_unverified_role');
    const warnings: string[] = [];
    if (!enabled) warnings.push(t(lang, 'setupcaptcha.warn_disabled'));
    if (!unverified) warnings.push(t(lang, 'setupcaptcha.warn_no_role'));
    const warn = warnings.join(' ; ');
    return interaction.reply({
      content: warn
        ? t(lang, 'setupcaptcha.deployed_warn', { channel: channel.toString(), warnings: warn })
        : t(lang, 'setupcaptcha.deployed', { channel: channel.toString() }),
      flags: MessageFlags.Ephemeral
    });
  }
};
