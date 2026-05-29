/**
 * Types de l'intégration GitHub.
 *
 * Le cœur de l'archi est l'`CanonicalEvent` : webhook (temps réel) ET polling
 * (secours) produisent la MÊME forme normalisée, avec des clés de dédup
 * identiques. Tout converge ensuite vers un point d'annonce unique
 * (`announce.ts`) qui déduplique via la table `github_seen`.
 */

/** Type d'événement annonçable. */
export type GithubEventKind =
  | 'push'
  | 'pull_request'
  | 'workflow_run'
  | 'release'
  | 'issues'
  | 'review';

/** Un commit déjà mis en forme pour l'affichage. */
export interface CommitInfo {
  sha: string;
  message: string;
  url: string;
  authorLogin?: string;
  authorName: string;
}

export interface PushData {
  kind: 'push';
  branch: string;
  commits: CommitInfo[];
  compareUrl?: string;
  pusher: string;
}

export interface PullRequestData {
  kind: 'pull_request';
  /** Action canonique : opened | merged | closed | reopened | ready. */
  action: string;
  number: number;
  title: string;
  url: string;
  authorLogin?: string;
  branchFrom?: string;
  branchTo?: string;
  merged?: boolean;
}

export interface WorkflowRunData {
  kind: 'workflow_run';
  name: string;
  status: string; // queued | in_progress | completed
  conclusion: string | null; // success | failure | cancelled | timed_out | ...
  branch: string;
  url: string;
  actorLogin?: string;
  headSha: string;
  headCommitMessage?: string;
  runAttempt: number;
  runId: number;
  durationMs?: number;
}

export interface ReleaseData {
  kind: 'release';
  id: number;
  tag: string;
  name?: string;
  url: string;
  authorLogin?: string;
  body?: string;
  prerelease?: boolean;
}

export interface IssuesData {
  kind: 'issues';
  action: string; // opened | closed | reopened
  number: number;
  title: string;
  url: string;
  authorLogin?: string;
}

export interface ReviewData {
  kind: 'review';
  state: string; // approved | changes_requested | commented
  prNumber: number;
  prTitle: string;
  url: string;
  reviewerLogin?: string;
}

export type GithubEventData =
  | PushData
  | PullRequestData
  | WorkflowRunData
  | ReleaseData
  | IssuesData
  | ReviewData;

/**
 * Événement normalisé, indépendant du transport. `keys` contient TOUTES les
 * clés de dédup couvertes par cet event (une seule en général, plusieurs pour
 * un push — une par commit). L'annonce n'a lieu que si au moins une clé est neuve.
 */
export interface CanonicalEvent {
  data: GithubEventData;
  keys: string[];
  /** Si vrai, pinguer le rôle configuré (échec CI…). */
  important?: boolean;
}

/** État de polling sérialisé en JSON dans `github_repos.state`. */
export interface RepoState {
  /** Faux/absent = premier passage : on enregistre les curseurs sans annoncer. */
  primed?: boolean;
  /** Branche par défaut du dépôt (récupérée au priming, sert au polling commits). */
  defaultBranch?: string;
  lastCommitSha?: string;
  commitEtag?: string;
  runsCursor?: number; // max run id vu
  runsEtag?: string;
  pullsCursor?: number; // max updated_at (ms epoch) vu
  pullsEtag?: string;
  releasesCursor?: number; // max release id vu
  releasesEtag?: string;
  issuesCursor?: number; // max updated_at (ms epoch) vu
  issuesEtag?: string;
}
