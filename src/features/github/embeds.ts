import { EmbedBuilder } from 'discord.js';
import {
  shortSha, commitTitle, truncate, runIcon, conclusionLabel, prIcon, prActionLabel
} from './format';
import type {
  GithubEventData, PushData, PullRequestData, WorkflowRunData,
  ReleaseData, IssuesData, ReviewData
} from './types';

/** Résout un login GitHub en mention/affichage Discord. */
export type MentionResolver = (login?: string) => string;

// Palette inspirée des couleurs GitHub.
const COLORS = {
  commit: 0x6e5494,
  prOpen: 0x2da44e,
  prMerged: 0x8957e5,
  prClosed: 0xcf222e,
  ciSuccess: 0x2da44e,
  ciFailure: 0xcf222e,
  ciOther: 0xdbab09,
  release: 0x1f6feb,
  issueOpen: 0x2da44e,
  issueClosed: 0x8250df,
  review: 0x2da44e
} as const;

const MAX_COMMITS_SHOWN = 10;

function repoUrl(owner: string, repo: string): string {
  return `https://github.com/${owner}/${repo}`;
}

/** Affichage d'un auteur : mention Discord si liée, sinon `@login`, sinon nom. */
function who(resolve: MentionResolver, login: string | undefined, fallbackName?: string): string {
  const m = resolve(login);
  if (m) return m;
  if (login) return `\`@${login}\``;
  return fallbackName ?? 'inconnu';
}

function pushEmbed(owner: string, repo: string, d: PushData, resolve: MentionResolver): EmbedBuilder {
  const shown = d.commits.slice(0, MAX_COMMITS_SHOWN);
  const lines = shown.map((c) =>
    `[\`${shortSha(c.sha)}\`](${c.url}) ${truncate(commitTitle(c.message), 72)} — ${who(resolve, c.authorLogin, c.authorName)}`
  );
  const extra = d.commits.length - shown.length;
  if (extra > 0) lines.push(`…et ${extra} commit(s) de plus`);

  const e = new EmbedBuilder()
    .setColor(COLORS.commit)
    .setAuthor({ name: `${owner}/${repo}`, url: repoUrl(owner, repo) })
    .setTitle(`📦 ${d.commits.length} commit(s) sur \`${d.branch}\``)
    .setDescription(truncate(lines.join('\n'), 4000))
    .setTimestamp(new Date());
  if (d.compareUrl) e.setURL(d.compareUrl);
  e.setFooter({ text: `poussé par ${d.pusher}` });
  return e;
}

function prEmbed(owner: string, repo: string, d: PullRequestData, resolve: MentionResolver): EmbedBuilder {
  const color = d.action === 'merged' ? COLORS.prMerged
    : d.action === 'closed' ? COLORS.prClosed
      : COLORS.prOpen;
  const e = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `${owner}/${repo}`, url: repoUrl(owner, repo) })
    .setTitle(`${prIcon(d.action)} PR #${d.number} ${prActionLabel(d.action)}`)
    .setURL(d.url)
    .setDescription(truncate(d.title, 256))
    .setTimestamp(new Date());
  if (d.branchFrom && d.branchTo) {
    e.addFields({ name: 'Branche', value: `\`${d.branchFrom}\` → \`${d.branchTo}\``, inline: true });
  }
  e.addFields({ name: 'Auteur', value: who(resolve, d.authorLogin), inline: true });
  return e;
}

function runEmbed(owner: string, repo: string, d: WorkflowRunData, resolve: MentionResolver): EmbedBuilder {
  const color = d.conclusion === 'success' ? COLORS.ciSuccess
    : (d.conclusion === 'failure' || d.conclusion === 'timed_out') ? COLORS.ciFailure
      : COLORS.ciOther;
  const e = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `${owner}/${repo}`, url: repoUrl(owner, repo) })
    .setTitle(`${runIcon(d.status, d.conclusion)} Pipeline « ${truncate(d.name, 200)} » — ${conclusionLabel(d.status, d.conclusion)}`)
    .setURL(d.url)
    .setTimestamp(new Date());
  const desc = [
    `Branche \`${d.branch}\` · commit [\`${shortSha(d.headSha)}\`](https://github.com/${owner}/${repo}/commit/${d.headSha})`,
    d.headCommitMessage ? truncate(commitTitle(d.headCommitMessage), 100) : null
  ].filter(Boolean).join('\n');
  e.setDescription(desc);
  if (d.durationMs) e.addFields({ name: 'Durée', value: `${Math.round(d.durationMs / 1000)} s`, inline: true });
  e.addFields({ name: 'Déclenché par', value: who(resolve, d.actorLogin), inline: true });
  return e;
}

function releaseEmbed(owner: string, repo: string, d: ReleaseData, resolve: MentionResolver): EmbedBuilder {
  const e = new EmbedBuilder()
    .setColor(COLORS.release)
    .setAuthor({ name: `${owner}/${repo}`, url: repoUrl(owner, repo) })
    .setTitle(`🚀 Release ${d.tag}${d.prerelease ? ' (pré-release)' : ''}${d.name ? ` — ${truncate(d.name, 120)}` : ''}`)
    .setURL(d.url)
    .setTimestamp(new Date());
  if (d.body) e.setDescription(truncate(d.body, 1500));
  e.addFields({ name: 'Publiée par', value: who(resolve, d.authorLogin), inline: true });
  return e;
}

function issuesEmbed(owner: string, repo: string, d: IssuesData, resolve: MentionResolver): EmbedBuilder {
  const color = d.action === 'closed' ? COLORS.issueClosed : COLORS.issueOpen;
  const icon = d.action === 'closed' ? '🔒' : d.action === 'reopened' ? '🔓' : '🐛';
  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `${owner}/${repo}`, url: repoUrl(owner, repo) })
    .setTitle(`${icon} Issue #${d.number} ${d.action === 'closed' ? 'fermée' : d.action === 'reopened' ? 'rouverte' : 'ouverte'}`)
    .setURL(d.url)
    .setDescription(truncate(d.title, 256))
    .addFields({ name: 'Auteur', value: who(resolve, d.authorLogin), inline: true })
    .setTimestamp(new Date());
}

function reviewEmbed(owner: string, repo: string, d: ReviewData, resolve: MentionResolver): EmbedBuilder {
  const icon = d.state === 'approved' ? '✅' : d.state === 'changes_requested' ? '✋' : '💬';
  const label = d.state === 'approved' ? 'approuvée'
    : d.state === 'changes_requested' ? 'changements demandés'
      : 'commentée';
  return new EmbedBuilder()
    .setColor(COLORS.review)
    .setAuthor({ name: `${owner}/${repo}`, url: repoUrl(owner, repo) })
    .setTitle(`${icon} Review ${label} · PR #${d.prNumber}`)
    .setURL(d.url)
    .setDescription(truncate(d.prTitle, 256))
    .addFields({ name: 'Relecteur', value: who(resolve, d.reviewerLogin), inline: true })
    .setTimestamp(new Date());
}

/** Construit l'embed correspondant à un event normalisé. */
export function renderEvent(
  owner: string,
  repo: string,
  data: GithubEventData,
  resolve: MentionResolver
): EmbedBuilder {
  switch (data.kind) {
    case 'push': return pushEmbed(owner, repo, data, resolve);
    case 'pull_request': return prEmbed(owner, repo, data, resolve);
    case 'workflow_run': return runEmbed(owner, repo, data, resolve);
    case 'release': return releaseEmbed(owner, repo, data, resolve);
    case 'issues': return issuesEmbed(owner, repo, data, resolve);
    case 'review': return reviewEmbed(owner, repo, data, resolve);
  }
}

/**
 * Embed « statut pipeline » live, édité en place (façon mcwatch). Reflète le
 * dernier run de CI connu pour le dépôt.
 */
export function pipelineStatusEmbed(owner: string, repo: string, d: WorkflowRunData): EmbedBuilder {
  const color = d.conclusion === 'success' ? COLORS.ciSuccess
    : (d.conclusion === 'failure' || d.conclusion === 'timed_out') ? COLORS.ciFailure
      : COLORS.ciOther;
  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `${owner}/${repo}`, url: repoUrl(owner, repo) })
    .setTitle(`${runIcon(d.status, d.conclusion)} État de la pipeline`)
    .setURL(d.url)
    .setDescription([
      `**${truncate(d.name, 200)}** — ${conclusionLabel(d.status, d.conclusion)}`,
      `Branche \`${d.branch}\` · commit \`${shortSha(d.headSha)}\``,
      d.durationMs ? `Durée : ${Math.round(d.durationMs / 1000)} s` : null
    ].filter(Boolean).join('\n'))
    .setFooter({ text: 'Mis à jour automatiquement à chaque run' })
    .setTimestamp(new Date());
}
