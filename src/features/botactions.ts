import {
  EmbedBuilder, type Interaction, type ChatInputCommandInteraction,
  type ButtonInteraction, type AnySelectMenuInteraction, type ModalSubmitInteraction,
  type CommandInteractionOption
} from 'discord.js';
import { sendLog } from './logger';
import config from '../config';

const MAX_FIELD_VALUE = 1024;
const MAX_DESCRIPTION = 4096;

function trunc(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

/**
 * Sérialise les options d'une commande slash en chaîne lisible.
 */
function formatSlashOptions(interaction: ChatInputCommandInteraction): string {
  const parts: string[] = [];
  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand(false);
  if (group) parts.push(group);
  if (sub) parts.push(sub);

  const walk = (nodes: readonly CommandInteractionOption[] | undefined) => {
    if (!nodes) return;
    for (const opt of nodes) {
      if (opt.options && opt.options.length) {
        walk(opt.options);
        continue;
      }
      let v: unknown = opt.value;
      if (opt.user) v = `@${opt.user.tag}`;
      else if (opt.channel) v = `#${opt.channel.name}`;
      else if (opt.role) v = `@${opt.role.name}`;
      else if (typeof v === 'string' && /\s/.test(v)) v = `"${v}"`;
      parts.push(`${opt.name}:${v}`);
    }
  };
  walk(interaction.options.data);
  return parts.join(' ');
}

function contextLines(interaction: Interaction, durationMs: number, success: boolean): string {
  const status = success ? '✅ Succès' : '❌ Échec';
  return [
    `**Utilisateur :** ${interaction.user} (\`${interaction.user.id}\`)`,
    `**Salon :** ${interaction.channel ?? '*(DM)*'}`,
    `**Statut :** ${status} en ${durationMs} ms`
  ].join('\n');
}

interface Described {
  title: string;
  body: string;
  fields?: { name: string; value: string }[];
}

function describeInteraction(interaction: Interaction): Described {
  if (interaction.isChatInputCommand()) {
    const args = formatSlashOptions(interaction);
    const sig = `/${interaction.commandName}${args ? ` ${args}` : ''}`;
    return { title: '⌨️ Commande slash', body: `\`${trunc(sig, 256)}\`` };
  }

  if (interaction.isButton()) {
    const b = interaction as ButtonInteraction;
    return {
      title: '🔘 Clic sur bouton',
      body: `\`${b.customId}\``,
      fields: b.message ? [{ name: 'Message', value: `[aller au message](${b.message.url})` }] : undefined
    };
  }

  if (interaction.isAnySelectMenu()) {
    const s = interaction as AnySelectMenuInteraction;
    const values = (s.values ?? []).map((v) => `\`${v}\``).join(', ') || '*(vide)*';
    return {
      title: '📜 Sélection dans un menu',
      body: `\`${s.customId}\``,
      fields: [
        { name: 'Valeur(s) sélectionnée(s)', value: trunc(values, MAX_FIELD_VALUE) },
        ...(s.message ? [{ name: 'Message', value: `[aller au message](${s.message.url})` }] : [])
      ]
    };
  }

  if (interaction.isModalSubmit()) {
    const m = interaction as ModalSubmitInteraction;
    const fields = m.fields.fields.map((f: any) =>
      ({ name: `Champ : ${f.customId}`, value: trunc(f.value || '*(vide)*', MAX_FIELD_VALUE) })
    );
    return { title: '📝 Soumission de modale', body: `\`${m.customId}\``, fields };
  }

  return { title: '❓ Interaction', body: `\`${interaction.type}\`` };
}

/**
 * Journalise une interaction terminée (commande slash, bouton, menu, modale).
 */
export async function logBotAction(
  interaction: Interaction,
  durationMs: number,
  success: boolean,
  error?: unknown
): Promise<void> {
  if (!interaction.guild) return;
  if (interaction.isAutocomplete?.()) return;

  const { title, body, fields } = describeInteraction(interaction);
  const description = trunc(`${body}\n\n${contextLines(interaction, durationMs, success)}`, MAX_DESCRIPTION);

  const embed = new EmbedBuilder()
    .setColor(success ? config.colors.neutral : config.colors.danger)
    .setAuthor({ name: title, iconURL: interaction.user.displayAvatarURL() })
    .setDescription(description)
    .setTimestamp();

  if (fields?.length) embed.addFields(fields.slice(0, 5));

  if (!success && error) {
    const msg = error instanceof Error ? error.message : String(error);
    embed.addFields({ name: 'Erreur', value: trunc(`\`${msg}\``, MAX_FIELD_VALUE) });
  }

  await sendLog(interaction.guild, 'botactions', embed);
}
