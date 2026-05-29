import { Events, type Client } from 'discord.js';
import config from '../config';
import * as giveaways from '../features/giveaways';
import * as github from '../features/github';
import * as mcingame from '../features/mcingame';
import * as mcstatus from '../features/mcstatus';
import * as mcwatch from '../features/mcwatch';
import * as music from '../features/music';
import * as notifications from '../features/notifications';
import * as phishlist from '../features/phishlist';
import * as polls from '../features/polls';
import * as reminders from '../features/reminders';
import * as serverlog from '../features/serverlog';
import * as statschannels from '../features/statschannels';
import * as temproles from '../features/temproles';
import * as tempvoice from '../features/tempvoice';
import { createLogger } from '../utils/logger';

const log = createLogger('events:ready');

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client<true>) {
    log.info(`Connecté en tant que ${client.user.tag}`);

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
    github.init(client);
    tempvoice.cleanup(client).catch((e) => log.warn('tempvoice cleanup failed', e));

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
