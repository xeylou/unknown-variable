import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import config from '../../config';

const categoryChoices = config.tickets.categories.map((c) => ({ name: c.label, value: c.value }));

export default {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Gestion avancée du ticket courant')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((s) => s.setName('move')
      .setDescription('Changer la catégorie de ce ticket')
      .addStringOption((o) => o.setName('categorie')
        .setDescription('Nouvelle catégorie').setRequired(true).addChoices(...categoryChoices))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'move') return move(interaction);
  }
};

/** Change la catégorie d'un ticket : préfixe du nom de salon + topic + DB. */
async function move(interaction: ChatInputCommandInteraction<'cached'>) {
  const channel = interaction.channel as import('discord.js').TextChannel | null;
  if (!channel) return interaction.reply({ content: '❌ Salon introuvable.', flags: MessageFlags.Ephemeral });
  const ticket = await prisma.tickets.findUnique({ where: { channel_id: channel.id } });
  if (!ticket) {
    return interaction.reply({ content: '❌ Cette commande doit être lancée dans un ticket.', flags: MessageFlags.Ephemeral });
  }
  const targetValue = interaction.options.getString('categorie');
  const category = config.tickets.categories.find((c) => c.value === targetValue);
  if (!category) {
    return interaction.reply({ content: '❌ Catégorie inconnue.', flags: MessageFlags.Ephemeral });
  }
  if (ticket.category === targetValue) {
    return interaction.reply({ content: 'ℹ️ Le ticket est déjà dans cette catégorie.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply();

  // Récupère le pseudo d'origine depuis le nom de salon actuel (format
  // « <ancienne>-<pseudo>-<numero> ») pour préserver la convention de nommage.
  const parts = channel.name.split('-');
  const userPart = parts.length >= 3 ? parts.slice(1, -1).join('-') : interaction.user.username;
  const numberPart = ticket.number ?? parts[parts.length - 1];
  const newName = `${category.value}-${userPart}-${numberPart}`;

  await channel.setName(newName).catch(() => {});
  await channel.setTopic(
    `Ticket #${ticket.number} | Catégorie : ${category.label}`
  ).catch(() => {});

  await prisma.tickets.update({
    where: { channel_id: channel.id },
    data: { category: targetValue }
  });

  return interaction.editReply(`✅ Ticket déplacé vers **${category.label}**.`);
}
