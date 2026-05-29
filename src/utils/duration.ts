const UNITS: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, j: 86_400_000 };

/**
 * Convertit une durée texte (« 10m », « 2h », « 1d ») en millisecondes.
 * @returns ms, ou null si le format est invalide.
 */
function parseDuration(input: string | null | undefined): number | null {
  if (!input) return null;
  const m = String(input).trim().match(/^(\d+)\s*(s|m|h|d|j)$/i);
  if (!m) return null;
  return Number(m[1]) * UNITS[m[2].toLowerCase()];
}

/** Formatte une durée en millisecondes de façon lisible (« 1j 2h 30min »). */
function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms < 1000) return '0s';
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const min = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return [d && `${d}j`, h && `${h}h`, min && `${min}min`, s && `${s}s`]
    .filter(Boolean).join(' ') || '0s';
}

export { parseDuration, formatDuration }
