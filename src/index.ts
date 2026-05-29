import { Client, GatewayIntentBits, Partials } from 'discord.js';
import config from './config';
import { prisma } from './database';
import { createLogger } from './utils/logger';
import { closeAll as closeRcon } from './features/mcrcon';
import { closeWorker as closeWelcomeCard } from './features/welcomecard';
import { close as closeGithub } from './features/github';

const log = createLogger('main');

import { loadCommands } from './handlers/commandHandler';
import { loadComponents } from './handlers/componentHandler';
import { loadEvents } from './handlers/eventHandler';

// --- Création du client ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildExpressions,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessageReactions
  ],
  // `Reaction` est indispensable pour recevoir les events de réaction sur des
  // messages absents du cache (messages plus anciens que le démarrage du bot).
  partials: [
    Partials.Channel, Partials.Message, Partials.GuildMember,
    Partials.User, Partials.Reaction
  ]
});

// --- Chargement des modules ---
loadCommands(client);
loadComponents(client);
loadEvents(client);

// --- Filets de sécurité globaux ---
process.on('unhandledRejection', (err) => log.error('unhandledRejection', err));
process.on('uncaughtException', (err) => log.error('uncaughtException', err));

// --- Arrêt propre : ferme le client Discord et déconnecte Prisma. ---
let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info(`Signal ${signal} reçu, arrêt en cours…`);
  try {
    await client.destroy();
  } catch (e) {
    log.warn('client.destroy failed', e);
  }
  try {
    await closeRcon();
  } catch (e) {
    log.warn('rcon close failed', e);
  }
  try {
    await closeWelcomeCard();
  } catch (e) {
    log.warn('welcome worker close failed', e);
  }
  try {
    await closeGithub();
  } catch (e) {
    log.warn('github close failed', e);
  }
  try {
    await prisma.$disconnect();
  } catch (e) {
    log.warn('prisma.$disconnect failed', e);
  }
  // Laisse 500 ms pour que les éventuelles écritures Discord en cours partent
  setTimeout(() => process.exit(0), 500).unref();
}
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

client.login(config.token);
