import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction, type Client
} from 'discord.js';
import { base, frLoc, resolveLang, t } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription(base('ping.cmd.desc'))
    .setDescriptionLocalizations(frLoc('ping.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction: ChatInputCommandInteraction<'cached'>, client: Client<true>) {
    const lang = resolveLang(interaction.locale);
    await interaction.reply({ content: t(lang, 'ping.measuring'), flags: MessageFlags.Ephemeral });
    const reply = await interaction.fetchReply();
    const rtt = reply.createdTimestamp - interaction.createdTimestamp;
    return interaction.editReply(
      t(lang, 'ping.result', { rtt, ws: Math.round(client.ws.ping) })
    );
  }
};
