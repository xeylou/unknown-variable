import type {
  ChatInputCommandInteraction, ButtonInteraction, ModalSubmitInteraction,
  AnySelectMenuInteraction, Client, Collection, SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder, SlashCommandOptionsOnlyBuilder,
  ClientEvents
} from 'discord.js';

/**
 * Type d'une commande slash. Le `data` peut être un SlashCommandBuilder à
 * n'importe quelle étape de configuration ; on accepte tous les variants.
 */
export interface CommandModule {
  data:
    | SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | SlashCommandOptionsOnlyBuilder
    | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
  cooldown?: number;
  execute(interaction: ChatInputCommandInteraction<'cached'>, client: Client<true>): unknown;
}

/** Interactions de composant gérées par `prefix:action:args…`. */
export type ComponentInteraction =
  | ButtonInteraction<'cached'>
  | AnySelectMenuInteraction<'cached'>
  | ModalSubmitInteraction<'cached'>;

export interface ComponentModule {
  prefix: string;
  /**
   * Si `true`, ce composant peut être déclenché depuis un DM (l'interaction
   * n'a alors pas de guilde en cache). Le handler doit s'auto-protéger en
   * n'utilisant pas `interaction.guild` / `interaction.member` directement.
   * Par défaut `false` — l'event router refuse les interactions hors-guilde.
   */
  dmFriendly?: boolean;
  execute(interaction: ComponentInteraction, client: Client<true>, args: string[]): unknown;
}

/**
 * Module d'événement Discord.js. Le type des arguments est dérivé du nom
 * de l'event via `ClientEvents`, mais on accepte aussi un fourre-tout pour
 * les events au schéma libre (notre logique d'enregistrement passe le client
 * en dernier argument).
 */
export interface EventModule<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute(...args: [...ClientEvents[K], Client<true>] | [...ClientEvents[K]]): unknown;
}

/**
 * On augmente le type Client pour exposer les collections de commandes et
 * composants (initialisées par les handlers). Ainsi `client.commands.get(...)`
 * est typé partout sans cast.
 */
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, CommandModule>;
    components: Collection<string, ComponentModule>;
  }
}
