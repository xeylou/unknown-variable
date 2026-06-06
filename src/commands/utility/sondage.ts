import { SlashCommandBuilder, PermissionFlagsBits,
  type ChatInputCommandInteraction
} from 'discord.js';
import { base, frLoc } from '../../i18n';

export default {
  data: (() => {
    const b = new SlashCommandBuilder()
      .setName('sondage')
      .setDescription(base('sondage.cmd.desc'))
      .setDescriptionLocalizations(frLoc('sondage.cmd.desc'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addStringOption((o) => o.setName('question')
        .setDescription(base('sondage.opt.question.desc'))
        .setDescriptionLocalizations(frLoc('sondage.opt.question.desc'))
        .setRequired(true))
      .addStringOption((o) => o.setName('option1')
        .setDescription(base('sondage.opt.option1.desc'))
        .setDescriptionLocalizations(frLoc('sondage.opt.option1.desc'))
        .setRequired(true))
      .addStringOption((o) => o.setName('option2')
        .setDescription(base('sondage.opt.option2.desc'))
        .setDescriptionLocalizations(frLoc('sondage.opt.option2.desc'))
        .setRequired(true));
    for (let i = 3; i <= 5; i++) {
      // Discord autorise max 100 chars pour la description d'option — on garde le libellé court.
      b.addStringOption((o) => o.setName(`option${i}`).setDescription(`Choice ${i} / Choix ${i}`));
    }
    b.addIntegerOption((o) => o.setName('heures')
      .setDescription(base('sondage.opt.heures.desc'))
      .setDescriptionLocalizations(frLoc('sondage.opt.heures.desc'))
      .setMinValue(1).setMaxValue(768));
    b.addBooleanOption((o) => o.setName('choix-multiple')
      .setDescription(base('sondage.opt.multichoix.desc'))
      .setDescriptionLocalizations(frLoc('sondage.opt.multichoix.desc')));
    return b;
  })(),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const answers = [];
    for (let i = 1; i <= 5; i++) {
      const opt = interaction.options.getString(`option${i}`);
      if (opt) answers.push({ text: opt.slice(0, 55) });
    }
    return interaction.reply({
      poll: {
        question: { text: interaction.options.getString('question', true).slice(0, 300) },
        answers,
        duration: interaction.options.getInteger('heures') ?? 24,
        allowMultiselect: interaction.options.getBoolean('choix-multiple') ?? false
      }
    });
  }
};
