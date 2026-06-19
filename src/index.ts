import { Client, GatewayIntentBits, Partials } from 'discord.js';
import config from './config';
import { prisma } from './database';
import { createLogger } from './utils/logger';
import { closeAll as closeRcon } from './features/mcrcon';
import { closeWorker as closeWelcomeCard } from './features/welcomecard';
import { close as closeGithub } from './features/github';
import { close as closeHealth } from './features/health';
import { close as closeMcChat } from './features/mcchat';
import { flush as flushMessageStats } from './features/messagestats';

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
// Une promesse rejetée isolée (souvent une interaction) ne doit PAS tuer le bot :
// on logue seulement. En revanche une exception non capturée laisse le process
// dans un état potentiellement corrompu — on tente un arrêt propre puis on quitte
// avec un code d'erreur pour laisser systemd (`Restart=always`) / Docker
// (`restart: unless-stopped`) relancer un process sain.
process.on('unhandledRejection', (err) => log.error('unhandledRejection', err));
process.on('uncaughtException', (err) => {
  log.error('uncaughtException', err);
  shutdown('uncaughtException').then(() => process.exit(1));
});

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
    await closeHealth();
  } catch (e) {
    log.warn('health close failed', e);
  }
  try {
    await closeMcChat();
  } catch (e) {
    log.warn('mcchat close failed', e);
  }
  try {
    // Vide le tampon de compteurs de messages avant de fermer Prisma.
    await flushMessageStats();
  } catch (e) {
    log.warn('messagestats flush failed', e);
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
