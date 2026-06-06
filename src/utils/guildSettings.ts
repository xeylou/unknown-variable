import config from '../config';
import { prisma } from '../database';

/**
 * Cache SYNCHRONE des réglages « rôles & salons » par serveur.
 *
 * La couche permissions (`isStaff` / `isAdmin` / `isTicketStaff`) et la création
 * de tickets ont besoin de ces identifiants de façon synchrone et très
 * fréquente (à chaque interaction, parfois à chaque message). Plutôt que de
 * rendre toute la couche asynchrone, on maintient ce cache en mémoire :
 *  - chargé en bloc au démarrage via `init()` ;
 *  - tenu à jour à chaque écriture de `guild_config` via `onConfigWrite()`
 *    (appelé par `configCache.setConfig`).
 *
 * Les valeurs du `.env` (`STAFF_ROLE_ID`, `ADMIN_ROLE_ID`, `TICKET_CATEGORY_ID`,
 * `LOGS_CHANNEL_ID`) ne servent plus que de DÉFAUT pour le serveur principal
 * (`config.guildId`). Elles ne s'appliquent JAMAIS aux autres serveurs — c'est
 * ce qui évite qu'un ticket du serveur B utilise la catégorie ou le salon de
 * logs du serveur A (fuite inter-serveurs).
 */

type GuildSettings = {
  staffRole: string | null;
  adminRole: string | null;
  ticketCategory: string | null;
  ticketLogsChannel: string | null;
  /** categoryValue → roleId du rôle responsable de cette catégorie de ticket. */
  ticketRoles: Map<string, string>;
};

const TICKET_ROLE_PREFIX = 'ticket_role:';

/** Clés `guild_config` gérées par ce cache (lecture synchrone). */
export const MANAGED_KEYS = ['staff_role', 'admin_role', 'ticket_category', 'ticket_logs_channel'] as const;

const store = new Map<string, GuildSettings>();

function blank(): GuildSettings {
  return {
    staffRole: null,
    adminRole: null,
    ticketCategory: null,
    ticketLogsChannel: null,
    ticketRoles: new Map()
  };
}

function ensure(guildId: string): GuildSettings {
  let s = store.get(guildId);
  if (!s) {
    s = blank();
    store.set(guildId, s);
  }
  return s;
}

/** Applique une paire clé/valeur au cache (partagé par `init` et `onConfigWrite`). */
function apply(guildId: string, key: string, value: string | null): void {
  const s = ensure(guildId);
  if (key === 'staff_role') s.staffRole = value;
  else if (key === 'admin_role') s.adminRole = value;
  else if (key === 'ticket_category') s.ticketCategory = value;
  else if (key === 'ticket_logs_channel') s.ticketLogsChannel = value;
  else if (key.startsWith(TICKET_ROLE_PREFIX)) {
    const cat = key.slice(TICKET_ROLE_PREFIX.length);
    if (value) s.ticketRoles.set(cat, value);
    else s.ticketRoles.delete(cat);
  }
}

/** Charge tous les réglages depuis la base. À appeler une fois au démarrage. */
export async function init(): Promise<void> {
  const rows = await prisma.guild_config.findMany({
    where: {
      OR: [
        { key: 'staff_role' },
        { key: 'admin_role' },
        { key: 'ticket_category' },
        { key: 'ticket_logs_channel' },
        { key: { startsWith: TICKET_ROLE_PREFIX } }
      ]
    }
  });
  store.clear();
  for (const r of rows) apply(r.guild_id, r.key, r.value);
}

/**
 * Notifie le cache d'une écriture de config. Appelé par `configCache.setConfig`
 * pour que les lectures synchrones restent cohérentes sans relire la base.
 */
export function onConfigWrite(guildId: string, key: string, value: string | null): void {
  if (
    key === 'staff_role' ||
    key === 'admin_role' ||
    key === 'ticket_category' ||
    key === 'ticket_logs_channel' ||
    key.startsWith(TICKET_ROLE_PREFIX)
  ) {
    apply(guildId, key, value);
  }
}

/** Vide le cache (tests). */
export function _resetForTests(): void {
  store.clear();
}

// --- Lecture synchrone (valeur par serveur, puis défaut `.env` du serveur principal) ---

/** Vrai si `guildId` est le serveur principal défini par `GUILD_ID`. */
function isHome(guildId: string): boolean {
  return !!config.guildId && guildId === config.guildId;
}

export function getStaffRole(guildId: string): string | null {
  return store.get(guildId)?.staffRole ?? (isHome(guildId) ? config.staffRoleId ?? null : null);
}

export function getAdminRole(guildId: string): string | null {
  return store.get(guildId)?.adminRole ?? (isHome(guildId) ? config.adminRoleId ?? null : null);
}

export function getTicketCategory(guildId: string): string | null {
  return store.get(guildId)?.ticketCategory ?? (isHome(guildId) ? config.tickets.categoryId ?? null : null);
}

export function getTicketLogsChannel(guildId: string): string | null {
  return store.get(guildId)?.ticketLogsChannel ?? (isHome(guildId) ? config.tickets.logsChannelId ?? null : null);
}

/**
 * Rôle responsable d'une catégorie de ticket : valeur par serveur si définie,
 * sinon le défaut codé dans le catalogue (`config.tickets.categories`, vide par
 * défaut). `null` = catégorie désactivée (aucun rôle → création refusée).
 */
export function getTicketRole(guildId: string, categoryValue: string): string | null {
  const perGuild = store.get(guildId)?.ticketRoles.get(categoryValue);
  if (perGuild) return perGuild;
  const cat = config.tickets.categories.find((c) => c.value === categoryValue);
  const fallback = cat?.staffRoleId?.trim();
  return fallback ? fallback : null;
}

/** Liste dédupliquée des rôles responsables de catégories pour un serveur donné. */
export function ticketStaffRoleIds(guildId: string): string[] {
  const ids = new Set<string>();
  for (const c of config.tickets.categories) {
    const rid = getTicketRole(guildId, c.value);
    if (rid) ids.add(rid);
  }
  return [...ids];
}
