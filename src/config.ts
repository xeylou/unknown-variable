import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  CLIENT_ID: z.string().min(1, 'CLIENT_ID is required'),
  // Optionnel : sert au déploiement instantané des commandes en dev
  // (`npm run deploy:guild`) et de « serveur principal » pour les défauts .env
  // (STAFF_ROLE_ID, ADMIN_ROLE_ID, TICKET_*). Inutile pour un bot multi-serveur.
  GUILD_ID: z.string().optional(),
  STAFF_ROLE_ID: z.string().optional(),
  ADMIN_ROLE_ID: z.string().optional(),
  // Nom du bot — sert au branding (logs, User-Agent, statut, nom du fichier BDD).
  // Le nom AFFICHÉ dans Discord vient lui de l'application (client.user.username).
  BOT_NAME: z.string().default('_unknown_variable'),
  // Statuts tournants, séparés par « | ». Placeholders : {name} {count}.
  BOT_STATUS: z.string().optional(),
  // Si absent, dérivé de BOT_NAME : ./data/<slug>.db
  DATABASE_PATH: z.string().optional(),
  TWITCH_CLIENT_ID: z.string().optional(),
  TWITCH_CLIENT_SECRET: z.string().optional(),
  TICKET_CATEGORY_ID: z.string().optional(),
  LOGS_CHANNEL_ID: z.string().optional(),
  LAVALINK_HOST: z.string().default('localhost'),
  LAVALINK_PORT: z.coerce.number().default(2333),
  LAVALINK_PASSWORD: z.string().optional(),
  LAVALINK_SECURE: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  GITHUB_WEBHOOK_PORT: z.coerce.number().default(3000),
  GITHUB_WEBHOOK_HOST: z.string().default('0.0.0.0'),
  GITHUB_WEBHOOK_PATH: z.string().default('/github/webhook'),
  // Sonde de santé HTTP (GET /health). 0 = désactivée. Sert au HEALTHCHECK
  // Docker et au monitoring d'uptime externe.
  HEALTH_PORT: z.coerce.number().default(3001),
  // Récepteur HTTP du miroir de chat Minecraft (POST /mc-chat). 0 = désactivé.
  // Le pont côté serveur MC y envoie le chat ; auth par secret PAR SERVEUR (BDD).
  MC_CHAT_PORT: z.coerce.number().default(0),
  MC_CHAT_HOST: z.string().default('0.0.0.0')
});

const envParsed = envSchema.safeParse(process.env);

if (!envParsed.success) {
  console.error('❌ Erreur de configuration dans le fichier .env :');
  envParsed.error.issues.forEach((err) => console.error(`   - ${err.path.join('.')}: ${err.message}`));
  process.exit(1);
}

const env = envParsed.data;

// Nom du bot + slug sûr pour fichiers / User-Agent (« _unknown_variable » →
// « unknown_variable », « My Cool Bot ! » → « my_cool_bot »).
const botName = env.BOT_NAME;
const botSlug =
  botName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'bot';

// Chemin BDD : explicite via DATABASE_PATH, sinon dérivé du nom du bot.
// ⚠️ Changer BOT_NAME change le fichier par défaut — fixe DATABASE_PATH si tu
// veux conserver une base existante.
const databasePath = env.DATABASE_PATH ?? `./data/${botSlug}.db`;

// Liste de statuts tournants (optionnelle), parsée depuis BOT_STATUS.
const botStatus = env.BOT_STATUS
  ? env.BOT_STATUS.split('|').map((s) => s.trim()).filter(Boolean)
  : null;

// Crée le dossier de la DB SQLite si nécessaire — better-sqlite3 ne le crée
// pas tout seul et le bot crashe sinon au premier accès.
const dbDir = path.dirname(path.resolve(databasePath));
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

/**
 * Configuration centrale du bot.
 * Les valeurs sensibles viennent du fichier .env, le reste est éditable ici.
 */
export default {
  // --- Identité du bot ---
  // `botName` : nom de marque (logs, statut, footers techniques). Le nom vu
  // dans Discord reste `client.user.username` (fixé au Developer Portal).
  // `botSlug` : version sûre pour fichiers / User-Agent.
  botName,
  botSlug,
  botStatus, // string[] | null — statuts tournants personnalisés

  // --- Identifiants Discord (.env) ---
  token: env.DISCORD_TOKEN,
  clientId: env.CLIENT_ID,
  // Optionnel (string | undefined) : serveur principal pour le deploy de dev et
  // les défauts .env. Le bot fonctionne sur n'importe quel serveur sans lui.
  guildId: env.GUILD_ID,
  staffRoleId: env.STAFF_ROLE_ID,
  adminRoleId: env.ADMIN_ROLE_ID,

  // --- Base de données ---
  database: {
    path: databasePath
  },

  // --- Sonde de santé HTTP (GET /health) ---
  // Port d'écoute ; 0 = désactivée. Indépendante du serveur webhook GitHub.
  healthPort: env.HEALTH_PORT,

  // --- Miroir du chat Minecraft (optionnel — récepteur HTTP, désactivé si port 0) ---
  // Un pont côté serveur MC POST le chat sur `POST /mc-chat` ; le bot le relaie
  // dans le salon défini par `/config minecraft-chat`. L'authentification se fait
  // par un secret PAR SERVEUR stocké en BDD (`mc_chat_secret`), pas via .env.
  mcChat: {
    port: env.MC_CHAT_PORT,
    host: env.MC_CHAT_HOST
  },

  // --- Notifications Twitch (optionnel — laisser vide désactive Twitch) ---
  twitch: {
    clientId: env.TWITCH_CLIENT_ID || null,
    clientSecret: env.TWITCH_CLIENT_SECRET || null
  },

  // --- Serveur Lavalink (musique — optionnel : sans mot de passe, la musique est désactivée) ---
  lavalink: {
    host: env.LAVALINK_HOST,
    port: env.LAVALINK_PORT,
    password: env.LAVALINK_PASSWORD || null,
    secure: env.LAVALINK_SECURE === 'true'
  },

  // --- Intégration GitHub (optionnel — désactivée si ni token ni secret webhook) ---
  // Hybride : webhooks (temps réel) si `webhookSecret`, polling (secours/primaire)
  // si `token`. Voir features/github/. Au moins l'un des deux active le module.
  github: {
    token: env.GITHUB_TOKEN || null,
    webhookSecret: env.GITHUB_WEBHOOK_SECRET || null,
    webhookPort: env.GITHUB_WEBHOOK_PORT,
    webhookHost: env.GITHUB_WEBHOOK_HOST,
    webhookPath: env.GITHUB_WEBHOOK_PATH
  },

  // --- Couleurs réutilisables dans les embeds ---
  colors: {
    primary: 0x5865f2,
    neutral: 0x2b2d31,
    success: 0x57f287,
    danger: 0xed4245,
    warning: 0xfee75c
  },

  // --- Système de tickets ---
  tickets: {
    categoryId: env.TICKET_CATEGORY_ID || null, // catégorie Discord où ranger les tickets
    logsChannelId: env.LOGS_CHANNEL_ID || null, // salon où envoyer les transcripts
    // Catalogue des catégories du menu déroulant (structure/branding partagés
    // par tous les serveurs). Le RÔLE responsable de chaque catégorie se
    // définit PAR SERVEUR avec `/config ticket-role` — c'est ce qui rend le
    // bot multi-serveur. Le champ `staffRoleId` ci-dessous n'est qu'un défaut
    // global optionnel (laisser vide en usage normal) ; une catégorie sans
    // rôle (ni par serveur ni ici) refuse la création de tickets.
    categories: [
      { value: 'support', label: 'Support général',  description: 'Question ou aide',           emoji: '🛠️', staffRoleId: '' },
      { value: 'bug',     label: 'Signaler un bug',  description: 'Rapporter un problème',      emoji: '🐛', staffRoleId: '' },
      { value: 'build',   label: 'Demande de build', description: 'Commander une construction', emoji: '🏗️', staffRoleId: '' },
      { value: 'staff',   label: 'Contact staff',    description: 'Demande privée au staff',    emoji: '👤', staffRoleId: '' },
      { value: 'other',   label: 'Autre',            description: 'Autre demande',              emoji: '❓', staffRoleId: '' }
    ] as Array<{
      value: string;
      label: string;
      description: string;
      emoji: string;
      /**
       * Défaut global optionnel pour le rôle responsable de cette catégorie.
       * Normalement vide : le rôle se configure par serveur via
       * `/config ticket-role`. S'il est renseigné ici, il s'applique à TOUS les
       * serveurs comme dernier recours (déconseillé en multi-serveur).
       */
      staffRoleId: string;
    }>
  }
};
