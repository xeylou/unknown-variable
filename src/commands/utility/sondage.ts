import { SlashCommandBuilder, PermissionFlagsBits,
  type ChatInputCommandInteraction
} from 'discord.js';

export default {
  data: (() => {
    const b = new SlashCommandBuilder()
      .setName('sondage')
      .setDescription('Créer un sondage (vote natif Discord)')
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addStringOption((o) => o.setName('question').setDescription('La question posée').setRequired(true))
      .addStringOption((o) => o.setName('option1').setDescription('Choix 1').setRequired(true))
      .addStringOption((o) => o.setName('option2').setDescription('Choix 2').setRequired(true));
    for (let i = 3; i <= 5; i++) {
      b.addStringOption((o) => o.setName(`option${i}`).setDescription(`Choix ${i}`));
    }
    b.addIntegerOption((o) => o.setName('heures')
      .setDescription('Durée du sondage en heures (défaut 24)').setMinValue(1).setMaxValue(768));
    b.addBooleanOption((o) => o.setName('choix-multiple')
      .setDescription('Autoriser plusieurs réponses ?'));
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
