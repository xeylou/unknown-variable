/**
 * Logger structuré minimal — pas de dépendance externe.
 * Niveaux : debug / info / warn / error. Pilotable par LOG_LEVEL.
 * Format : « 2026-05-23T13:42:01.123Z [INFO ] [scope] message ».
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVELS;

const threshold: number =
  LEVELS[(process.env.LOG_LEVEL?.toLowerCase() as Level) ?? 'info'] ?? LEVELS.info;

function fmt(level: Level, scope: string, args: unknown[]): unknown[] {
  const stamp = new Date().toISOString();
  const pad = level.toUpperCase().padEnd(5, ' ');
  return [`${stamp} [${pad}] [${scope}]`, ...args];
}

function emit(level: Level, scope: string, args: unknown[]) {
  if (LEVELS[level] < threshold) return;
  const out = level === 'error' || level === 'warn' ? console.error : console.log;
  out(...fmt(level, scope, args));
}

export interface Logger {
  debug: (...args: unknown[]) => void;
  info:  (...args: unknown[]) => void;
  warn:  (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  child: (sub: string) => Logger;
}

/** Construit un logger pour un module donné (« scope » affiché en préfixe). */
export function createLogger(scope: string): Logger {
  return {
    debug: (...a) => emit('debug', scope, a),
    info:  (...a) => emit('info',  scope, a),
    warn:  (...a) => emit('warn',  scope, a),
    error: (...a) => emit('error', scope, a),
    child: (sub) => createLogger(`${scope}:${sub}`)
  };
}

/** Logger racine pour les modules sans scope spécifique. */
export const logger = createLogger('app');
