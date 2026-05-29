import { Events, MessageFlags, Collection, type Interaction, type Client } from 'discord.js';
import { createLogger } from '../utils/logger';
import { logBotAction } from '../features/botactions';

const log = createLogger('events:interaction');

/**
 * Cooldowns par commande puis par utilisateur. Plutôt que de planifier un
 * `setTimeout` par entrée (gros nombre de timers actifs sur serveur actif),
 * on stocke un timestamp et on purge périodiquement les entrées expirées.
 */
const cooldowns = new Collection<string, Collection<string, number>>();

const PURGE_INTERVAL_MS = 5 * 60_000;
setInterval(() => {
  const now = Date.now();
  for (const [, timestamps] of cooldowns) {
    for (const [userId, expiresAt] of timestamps) {
      if (expiresAt <= now) timestamps.delete(userId);
    }
  }
}, PURGE_INTERVAL_MS).unref();

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction, client: Client<true>) {
    // Suit le résultat de l'exécution pour la journalisation `botactions`.
    let success = true;
    let error: unknown;
    const startedAt = Date.now();

    try {
      // --- Commandes slash ---
      if (interaction.isChatInputCommand()) {
        if (!interaction.inCachedGuild()) return; // toutes nos commandes attendent une guild en cache
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        // --- Cooldowns ---
        if (!cooldowns.has(command.data.name)) {
          cooldowns.set(command.data.name, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(command.data.name)!;
        const defaultCooldownDuration = 3; // 3 secondes par défaut
        const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

        const expirationTime = timestamps.get(interaction.user.id);
        if (expirationTime && expirationTime > now) {
          const expiredTimestamp = Math.round(expirationTime / 1000);
          await interaction.reply({
            content: `⏳ Attends un peu. Tu pourras réutiliser \`/${command.data.name}\` <t:${expiredTimestamp}:R>.`,
            flags: MessageFlags.Ephemeral
          });
          // On ne journalise PAS un rejet pour cooldown — bruit inutile.
          return;
        }

        timestamps.set(interaction.user.id, now + cooldownAmount);
        await command.execute(interaction, client);
        return;
      }

      // --- Composants : boutons, menus déroulants, modales ---
      if (interaction.isButton() || interaction.isAnySelectMenu() || interaction.isModalSubmit()) {
        // customId au format « prefix:action:arg1:arg2... »
        const [prefix, ...args] = interaction.customId.split(':');
        const handler = client.components.get(prefix);

        // Composant inconnu (ex. panneau créé par une ancienne version du bot).
        if (!handler) {
          await interaction.reply({
            content: '⚠️ Ce composant est obsolète — le bot a été mis à jour. ' +
                     'Un administrateur doit régénérer le panneau (`/setup-tickets`).',
            flags: MessageFlags.Ephemeral
          }).catch(() => {});
          return;
        }

        // En DM, seuls les composants ayant déclaré `dmFriendly: true` sont
        // routés. Les autres répondent un message explicite plutôt que de
        // bailer silencieusement (qui produisait « This operation failed »).
        if (!interaction.inCachedGuild() && !handler.dmFriendly) {
          await interaction.reply({
            content: '⚠️ Cette action ne peut être effectuée que depuis un serveur.',
            flags: MessageFlags.Ephemeral
          }).catch(() => {});
          return;
        }

        // Les handlers déclarent `ComponentInteraction` (= variant `'cached'`).
        // En DM la guilde n'est pas en cache, mais les handlers `dmFriendly`
        // doivent s'auto-protéger contre l'absence de `interaction.guild`.
        await handler.execute(interaction as any, client, args);
        return;
      }

      // Autres types d'interactions (autocomplete…) → on ne journalise pas.
      return;
    } catch (err) {
      success = false;
      error = err;
      log.error('interaction handler threw', err);
      if (!interaction.isRepliable()) return;
      const content = '❌ Une erreur est survenue. Réessaie ; si le problème persiste, préviens un administrateur.';
      if (interaction.deferred || interaction.replied) {
        interaction.followUp({ content, flags: MessageFlags.Ephemeral }).catch(() => {});
      } else {
        interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    } finally {
      // Journalise l'action (best-effort : si le log échoue, on continue).
      const elapsed = Date.now() - startedAt;
      logBotAction(interaction, elapsed, success, error).catch((e) =>
        log.warn('logBotAction failed', e)
      );
    }
  }
};
