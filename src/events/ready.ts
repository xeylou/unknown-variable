import { Events, type Client } from 'discord.js';
import config from '../config';
import * as giveaways from '../features/giveaways';
import * as github from '../features/github';
import * as health from '../features/health';
import * as invitetracker from '../features/invitetracker';
import * as leaderboards from '../features/leaderboards';
import * as mcchat from '../features/mcchat';
import * as mcingame from '../features/mcingame';
import * as mcstatus from '../features/mcstatus';
import * as mcwatch from '../features/mcwatch';
import * as messagestats from '../features/messagestats';
import * as music from '../features/music';
import * as notifications from '../features/notifications';
import * as phishlist from '../features/phishlist';
import * as polls from '../features/polls';
import * as reminders from '../features/reminders';
import * as serverlog from '../features/serverlog';
import * as statschannels from '../features/statschannels';
import * as temproles from '../features/temproles';
import * as tempvoice from '../features/tempvoice';
import * as guildSettings from '../utils/guildSettings';
import { createLogger } from '../utils/logger';

const log = createLogger('events:ready');

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client<true>) {
    log.info(`Connecté en tant que ${client.user.tag}`);

    // Charge le cache synchrone des rôles/salons par serveur AVANT tout le
    // reste : la couche permissions s'appuie dessus dès la 1ʳᵉ interaction.
    await guildSettings.init();

    // --- Initialisation des modules de fond ---
    giveaways.init(client);
    reminders.init(client);
    notifications.init(client);
    mcstatus.initAutoUpdate(client);
    mcwatch.init(client);
    statschannels.init(client);
    music.init(client);
    serverlog.init(client);
    phishlist.init();
    temproles.init(client);
    polls.init(client);
    mcingame.init(client);
    mcchat.start(client);
    github.init(client);
    messagestats.init();
    invitetracker.init(client);
    leaderboards.init(client);
    health.init();
    tempvoice.cleanup(client).catch((e) => log.warn('tempvoice cleanup failed', e));

    // --- Récapitulatif de configuration (état des modules en un coup d'œil) ---
    const on = (b: boolean) => (b ? '✅' : '⛔');
    const githubModes =
      `${config.github.webhookSecret ? ' webhook' : ''}${config.github.token ? ' polling' : ''}`.trim();
    log.info(
      `Modules : musique ${on(!!config.lavalink.password)} · ` +
      `github ${on(!!(config.github.token || config.github.webhookSecret))}${githubModes ? ` (${githubModes})` : ''} · ` +
      `twitch ${on(!!(config.twitch.clientId && config.twitch.clientSecret))} · ` +
      `santé ${on(!!config.healthPort)}${config.healthPort ? ` (:${config.healthPort})` : ''}`
    );
    log.info(`Présent sur ${client.guilds.cache.size} serveur(s) · ${client.commands.size} commande(s) chargée(s).`);

    // --- Activité tournante ---
    // Personnalisable via BOT_STATUS (séparé par « | », placeholders {name} {count}).
    // Par défaut : basé sur le nom du bot. Ex. pour garder l'ancien thème :
    //   BOT_STATUS=void process active|self-aware system anomaly|fatal exception occurred
    const statusTemplates = config.botStatus ?? ['{name}', '/help', '{count} serveur(s)'];
    const renderStatus = (tpl: string): string =>
      tpl.replace(/\{name\}/g, client.user.username)
        .replace(/\{count\}/g, String(client.guilds.cache.size));
    let activityIndex = 0;
    const rotateActivity = () => {
      client.user?.setActivity(renderStatus(statusTemplates[activityIndex % statusTemplates.length]));
      activityIndex++;
    };
    rotateActivity();
    setInterval(rotateActivity, 60_000).unref();
  }
};
