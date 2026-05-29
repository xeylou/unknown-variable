import { type Client } from 'discord.js';
import config from '../../config';
import { createLogger } from '../../utils/logger';
import * as webhook from './webhook';
import * as poller from './poller';
import * as digest from './digest';
import { prisma } from '../../database';

const log = createLogger('github');

/** Purge périodique du ledger de dédup (entrées > 7 jours). */
function startSeenCleanup(): void {
  const prune = async () => {
    const cutoff = Date.now() - 7 * 24 * 3_600_000;
    await prisma.github_seen.deleteMany({ where: { seen_at: { lt: cutoff } } }).catch(() => {});
  };
  setInterval(() => { prune().catch(() => {}); }, 6 * 3_600_000).unref();
}

/**
 * Initialise l'intégration GitHub. Mode hybride :
 *  - webhooks (temps réel) si `GITHUB_WEBHOOK_SECRET`,
 *  - polling (secours/primaire) si `GITHUB_TOKEN`,
 *  - digest périodique si `GITHUB_TOKEN`.
 * Sans aucune des deux variables, le module reste inerte.
 */
export function init(client: Client<true>): void {
  if (!config.github.token && !config.github.webhookSecret) return;
  webhook.start(client);
  poller.start(client);
  digest.start(client);
  startSeenCleanup();
  log.info(
    `intégration GitHub active (webhooks: ${config.github.webhookSecret ? 'oui' : 'non'}, ` +
    `polling: ${config.github.token ? 'oui' : 'non'})`
  );
}

/** Arrêt propre : ferme le serveur webhook et stoppe les boucles. */
export async function close(): Promise<void> {
  poller.stop();
  digest.stop();
  await webhook.close();
}
