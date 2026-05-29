import { formatDuration } from '../../utils/duration';

/**
 * Helpers de formatage purs pour l'intégration GitHub (aucun import Discord /
 * config → testables directement). Contient surtout la génération des clés de
 * déduplication : webhook et polling DOIVENT produire exactement les mêmes
 * clés pour ne pas annoncer deux fois le même event.
 */

/** Slug « owner/repo ». */
export function slug(owner: string, repo: string): string {
  return `${owner}/${repo}`;
}

/** Clé de dédup « owner/repo:type:partie:… ». */
export function dedupKey(repoSlug: string, ...parts: (string | number)[]): string {
  return `${repoSlug}:${parts.join(':')}`;
}

/**
 * Parse une référence de dépôt fournie par l'utilisateur : « owner/repo » ou une
 * URL GitHub (https://github.com/owner/repo[.git][/...]).
 */
export function parseRepoSlug(input: string): { owner: string; repo: string } | null {
  const cleaned = input.trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '');
  const m = cleaned.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

/** Nom court de branche depuis une `ref` git (« refs/heads/main » → « main »). */
export function branchFromRef(ref: string | undefined | null): string {
  if (!ref) return '';
  return ref.replace(/^refs\/heads\//, '').replace(/^refs\/tags\//, '');
}

/** Première ligne d'un message de commit (le « titre »). */
export function commitTitle(message: string): string {
  return (message || '').split('\n')[0].trim();
}

/** Tronque une chaîne en ajoutant « … » si elle dépasse `max`. */
export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
}

/** Sha court (7 caractères, comme l'UI GitHub). */
export function shortSha(sha: string): string {
  return (sha || '').slice(0, 7);
}

/** Icône d'état d'un run de workflow (CI/CD). */
export function runIcon(status: string, conclusion: string | null): string {
  if (status !== 'completed') return '🟡'; // queued / in_progress
  switch (conclusion) {
    case 'success': return '✅';
    case 'failure': return '❌';
    case 'timed_out': return '⏱️';
    case 'cancelled': return '⚪';
    case 'skipped': return '⏭️';
    case 'action_required': return '⚠️';
    default: return '🔸';
  }
}

/** Vrai si la conclusion d'un run doit déclencher un ping (échec « dur »). */
export function isFailureConclusion(conclusion: string | null): boolean {
  return conclusion === 'failure' || conclusion === 'timed_out';
}

/** Libellé FR lisible d'une conclusion de run. */
export function conclusionLabel(status: string, conclusion: string | null): string {
  if (status !== 'completed') return status === 'in_progress' ? 'en cours' : 'en file';
  switch (conclusion) {
    case 'success': return 'réussie';
    case 'failure': return 'échouée';
    case 'timed_out': return 'expirée';
    case 'cancelled': return 'annulée';
    case 'skipped': return 'ignorée';
    default: return conclusion ?? 'terminée';
  }
}

/** Icône d'une action de pull request. */
export function prIcon(action: string): string {
  switch (action) {
    case 'merged': return '🟣';
    case 'opened': return '🟢';
    case 'reopened': return '🔄';
    case 'closed': return '🔴';
    case 'ready': return '📣';
    default: return '🔧';
  }
}

/** Libellé FR d'une action de pull request. */
export function prActionLabel(action: string): string {
  switch (action) {
    case 'merged': return 'fusionnée';
    case 'opened': return 'ouverte';
    case 'reopened': return 'rouverte';
    case 'closed': return 'fermée';
    case 'ready': return 'prête pour relecture';
    default: return action;
  }
}

/** Durée d'un run en texte lisible à partir de deux timestamps ISO. */
export function runDuration(startedAt?: string | null, endedAt?: string | null): string | undefined {
  if (!startedAt || !endedAt) return undefined;
  const ms = Date.parse(endedAt) - Date.parse(startedAt);
  if (!Number.isFinite(ms) || ms <= 0) return undefined;
  return formatDuration(ms);
}

/**
 * Action canonique d'une PR à partir de l'état brut GitHub. Webhook (`action` +
 * `merged`) et polling (`state` + `merged_at`) convergent ici → mêmes clés.
 */
export function canonicalPrAction(opts: {
  webhookAction?: string;
  state?: string;
  merged?: boolean;
}): string | null {
  const { webhookAction, state, merged } = opts;
  if (merged) return 'merged';
  if (webhookAction === 'opened') return 'opened';
  if (webhookAction === 'reopened') return 'reopened';
  if (webhookAction === 'ready_for_review') return 'ready';
  if (webhookAction === 'closed') return 'closed';
  // Polling : pas d'« action », on déduit de l'état terminal.
  if (webhookAction === undefined) {
    if (state === 'closed') return 'closed';
    if (state === 'open') return 'opened';
  }
  return null; // edited / synchronize / labeled… → on n'annonce pas
}
