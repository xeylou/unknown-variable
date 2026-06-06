import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder,
  type ChatInputCommandInteraction
} from 'discord.js';
import config from '../../config';
import { base, frLoc, resolveLang, t } from '../../i18n';

export default {
  // Commande pilote du socle i18n (FR/EN) — voir src/i18n/.
  // Politique retenue : noms inchangés ; seules descriptions + réponses sont bilingues.
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription(base('avatar.cmd.desc'))
    .setDescriptionLocalizations(frLoc('avatar.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o
      .setName('membre')
      .setDescription(base('avatar.opt.member.desc'))
      .setDescriptionLocalizations(frLoc('avatar.opt.member.desc'))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const lang = resolveLang(interaction.locale);
    // `?? interaction.user` : l'option est facultative (corrige l'ancien
    // `getUser('membre', true)` qui levait une erreur quand elle était omise).
    const user = interaction.options.getUser('membre') ?? interaction.user;
    const url = user.displayAvatarURL({ size: 1024 });

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(t(lang, 'avatar.title', { name: user.username }))
      .setURL(url)
      .setImage(url);

    return interaction.reply({ embeds: [embed] });
  }
};
