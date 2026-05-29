import {
  SlashCommandBuilder, PermissionFlagsBits,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getConfig, setConfig } from '../../utils/configCache';
import { requireAdmin } from '../../utils/permissions';
import reglement from '../../data/reglement';
import * as embeds from '../../utils/embeds';

export default {
  data: new SlashCommandBuilder()
    .setName('setup-reglement')
    .setDescription('Déployer le règlement officiel avec validation par bouton')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    if (!await requireAdmin(interaction)) return;
    // Découpe les articles en deux embeds pour rester sous les limites Discord
    const articles = reglement.articles.map((a, i) => ({
      name: `${a.emoji}  Article ${i + 1} — ${a.titre}`,
      value: a.contenu
    }));
    const half = Math.ceil(articles.length / 2);

    const embed1 = embeds.primary()
      .setTitle(reglement.header.title)
      .setDescription(reglement.header.intro)
      .addFields(articles.slice(0, half));

    const embed2 = embeds.primary()
      .addFields(articles.slice(half))
      .setDescription(reglement.acceptation)
      .setFooter({ text: reglement.footer })
      .setTimestamp();

    const acceptButton = new ButtonBuilder()
      .setCustomId('rules:accept')
      .setLabel("J'accepte le règlement")
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success);

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

    const sent = await channel.send({
      embeds: [embed1, embed2],
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(acceptButton)],
      allowedMentions: { parse: [] }
    }).catch(() => null);
    if (!sent) {
      return interaction.reply({ content: "❌ Échec de l'envoi du règlement.", flags: MessageFlags.Ephemeral });
    }

    // Mémorise l'emplacement pour que les DM de sanction puissent y renvoyer.
    await setConfig(interaction.guild.id, 'rules_channel_id', channel.id).catch(() => {});

    const verifiedRole = await getConfig(interaction.guild.id, 'verified_role');
    const warning = verifiedRole
      ? ''
      : '\n⚠️ Aucun rôle de validation configuré — fais `/config reglement role:<rôle>` ' +
        'sinon le bouton ne donnera aucun accès.';
    return interaction.reply({
      content: `✅ Règlement déployé.${warning}`,
      flags: MessageFlags.Ephemeral
    });
  }
};
