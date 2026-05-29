import { Events, type Client } from 'discord.js';
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
    const activities = [
      () => 'void process active',
      () => `self-aware system anomaly`,
      () => 'fatal exception occurred',
    ];
    let activityIndex = 0;
    const rotateActivity = () => {
      client.user?.setActivity(activities[activityIndex % activities.length]());
      activityIndex++;
    };
    rotateActivity();
    setInterval(rotateActivity, 60_000).unref();
  }
};
