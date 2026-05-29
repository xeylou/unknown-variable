import {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import config from '../../config';
import { requireAdmin } from '../../utils/permissions';
import { setConfig } from '../../utils/configCache';
import { parseRepoSlug, slug, shortSha, commitTitle, truncate, runIcon, conclusionLabel } from '../../features/github/format';
import { ghGet } from '../../features/github/api';
import { invalidateLinks } from '../../features/github/announce';
import type {
  ApiCommit, ApiRun, ApiPull
} from '../../features/github/normalize';

const KNOWN_KINDS = ['push', 'pull_request', 'workflow_run', 'release', 'issues', 'review'];

/** Parse une liste séparée par des virgules en tableau JSON (ou null si vide). */
function parseList(input: string | null, allowed?: string[]): string | null {
  if (!input) return null;
  const items = input.split(',').map((s) => s.trim()).filter(Boolean);
  const filtered = allowed ? items.filter((i) => allowed.includes(i)) : items;
  return filtered.length ? JSON.stringify(filtered) : null;
}

export default {
  data: new SlashCommandBuilder()
    .setName('git')
    .setDescription('Suivre l\'activité de dépôts GitHub (commits, PR, CI/CD, releases…)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('suivre').setDescription('Suivre un dépôt GitHub')
      .addStringOption((o) => o.setName('depot').setDescription('owner/repo ou URL GitHub').setRequired(true))
      .addChannelOption((o) => o.setName('salon').setDescription('Salon des annonces')
        .addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption((o) => o.setName('branches').setDescription('Branches suivies (séparées par des virgules ; vide = toutes)'))
      .addRoleOption((o) => o.setName('role').setDescription('Rôle pingué sur échec CI'))
      .addChannelOption((o) => o.setName('salon-statut').setDescription('Salon du message « statut pipeline » live')
        .addChannelTypes(ChannelType.GuildText))
      .addStringOption((o) => o.setName('events')
        .setDescription('Types suivis : push,pull_request,workflow_run,release,issues,review (vide = tous)')))
    .addSubcommand((s) => s.setName('liste').setDescription('Lister les dépôts suivis'))
    .addSubcommand((s) => s.setName('retirer').setDescription('Arrêter de suivre un dépôt')
      .addIntegerOption((o) => o.setName('id').setDescription('ID (voir /git liste)').setRequired(true)))
    .addSubcommand((s) => s.setName('config').setDescription('Modifier un dépôt suivi')
      .addIntegerOption((o) => o.setName('id').setDescription('ID (voir /git liste)').setRequired(true))
      .addChannelOption((o) => o.setName('salon').setDescription('Nouveau salon des annonces')
        .addChannelTypes(ChannelType.GuildText))
      .addRoleOption((o) => o.setName('role').setDescription('Rôle pingué sur échec CI'))
      .addStringOption((o) => o.setName('branches').setDescription('Branches suivies (virgules ; « * » = toutes)'))
      .addChannelOption((o) => o.setName('salon-statut').setDescription('Salon du message « statut pipeline » live')
        .addChannelTypes(ChannelType.GuildText))
      .addStringOption((o) => o.setName('events').setDescription('Types suivis (virgules ; « * » = tous)')))
    .addSubcommand((s) => s.setName('statut').setDescription('État instantané d\'un dépôt (dernier commit, PR, CI)')
      .addStringOption((o) => o.setName('depot').setDescription('owner/repo ou URL GitHub').setRequired(true)))
    .addSubcommand((s) => s.setName('lier-membre').setDescription('Lier un membre à un pseudo GitHub')
      .addUserOption((o) => o.setName('membre').setDescription('Membre Discord').setRequired(true))
      .addStringOption((o) => o.setName('pseudo-github').setDescription('Pseudo GitHub').setRequired(true)))
    .addSubcommand((s) => s.setName('digest').setDescription('Activer un digest périodique de l\'activité')
      .addChannelOption((o) => o.setName('salon').setDescription('Salon du digest')
        .addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption((o) => o.setName('frequence').setDescription('Fréquence')
        .addChoices({ name: 'Quotidien', value: 'daily' }, { name: 'Hebdomadaire (lundi)', value: 'weekly' }))
      .addIntegerOption((o) => o.setName('heure').setDescription('Heure d\'envoi (0-23)').setMinValue(0).setMaxValue(23)))
    .addSubcommand((s) => s.setName('digest-off').setDescription('Désactiver le digest périodique')),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    if (!await requireAdmin(interaction)) return;
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    // ----- suivre -----
    if (sub === 'suivre') {
      const ref = parseRepoSlug(interaction.options.getString('depot', true));
      if (!ref) {
        return interaction.reply({ content: '❌ Dépôt invalide. Attendu : `owner/repo` ou une URL GitHub.', flags: MessageFlags.Ephemeral });
      }
      const channel = interaction.options.getChannel('salon', true);
      const role = interaction.options.getRole('role');
      const statusChannel = interaction.options.getChannel('salon-statut');
      const branches = parseList(interaction.options.getString('branches'));
      const events = parseList(interaction.options.getString('events'), KNOWN_KINDS);

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Vérifie l'accès au dépôt si un token est configuré.
      if (config.github.token) {
        const check = await ghGet(`/repos/${ref.owner}/${ref.repo}`);
        if (check.status === 404 || check.status === 403) {
          return interaction.editReply(
            `⚠️ Dépôt \`${slug(ref.owner, ref.repo)}\` inaccessible avec le token configuré ` +
            `(privé sans droits, ou inexistant). Vérifie les scopes du \`GITHUB_TOKEN\`.`);
        }
      }

      const created = await prisma.github_repos.create({
        data: {
          guild_id: gid, owner: ref.owner, repo: ref.repo,
          discord_channel: channel.id, branches, events,
          role_id: role?.id ?? null, status_channel: statusChannel?.id ?? null,
          created_at: Date.now()
        }
      });
      return interaction.editReply(
        `✅ Dépôt **#${created.id}** \`${slug(ref.owner, ref.repo)}\` suivi → ${channel}.\n` +
        (branches ? `Branches : ${branches}\n` : 'Toutes les branches.\n') +
        (events ? `Events : ${events}\n` : 'Tous les events.\n') +
        (role ? `Ping ${role} sur échec CI.\n` : '') +
        (statusChannel ? `Statut pipeline live dans ${statusChannel}.\n` : '') +
        (config.github.webhookSecret
          ? '*Webhook actif : ajoute aussi l\'URL du webhook dans les Settings du dépôt.*'
          : '*Polling seul : premier état mémorisé sans annonce, les prochains events déclencheront un message.*')
      );
    }

    // ----- liste -----
    if (sub === 'liste') {
      const rows = await prisma.github_repos.findMany({ where: { guild_id: gid } });
      if (!rows.length) {
        return interaction.reply({ content: 'ℹ️ Aucun dépôt suivi. Utilise `/git suivre`.', flags: MessageFlags.Ephemeral });
      }
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🐙 Dépôts GitHub suivis')
        .setDescription(rows.map((r) => {
          const role = r.role_id ? ` · ping <@&${r.role_id}>` : '';
          const st = r.status_channel ? ` · statut <#${r.status_channel}>` : '';
          const br = r.branches ? ` · branches ${r.branches}` : '';
          return `**#${r.id}** • \`${r.owner}/${r.repo}\` → <#${r.discord_channel}>${role}${st}${br}`;
        }).join('\n'));
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // ----- retirer -----
    if (sub === 'retirer') {
      const id = interaction.options.getInteger('id', true);
      const res = await prisma.github_repos.deleteMany({ where: { id, guild_id: gid } });
      return interaction.reply({
        content: res.count ? `🗑️ Dépôt **#${id}** retiré du suivi.` : `❌ Dépôt #${id} introuvable.`,
        flags: MessageFlags.Ephemeral
      });
    }

    // ----- config -----
    if (sub === 'config') {
      const id = interaction.options.getInteger('id', true);
      const row = await prisma.github_repos.findFirst({ where: { id, guild_id: gid } });
      if (!row) return interaction.reply({ content: `❌ Dépôt #${id} introuvable.`, flags: MessageFlags.Ephemeral });

      const channel = interaction.options.getChannel('salon');
      const role = interaction.options.getRole('role');
      const statusChannel = interaction.options.getChannel('salon-statut');
      const branchesRaw = interaction.options.getString('branches');
      const eventsRaw = interaction.options.getString('events');

      const data: Record<string, string | null> = {};
      if (channel) data.discord_channel = channel.id;
      if (role) data.role_id = role.id;
      if (statusChannel) data.status_channel = statusChannel.id;
      if (branchesRaw !== null) data.branches = branchesRaw.trim() === '*' ? null : parseList(branchesRaw);
      if (eventsRaw !== null) data.events = eventsRaw.trim() === '*' ? null : parseList(eventsRaw, KNOWN_KINDS);

      if (!Object.keys(data).length) {
        return interaction.reply({ content: 'ℹ️ Aucune modification fournie.', flags: MessageFlags.Ephemeral });
      }
      await prisma.github_repos.update({ where: { id }, data });
      return interaction.reply({ content: `✅ Dépôt **#${id}** mis à jour.`, flags: MessageFlags.Ephemeral });
    }

    // ----- statut -----
    if (sub === 'statut') {
      if (!config.github.token) {
        return interaction.reply({ content: '⚠️ `/git statut` nécessite un `GITHUB_TOKEN` configuré.', flags: MessageFlags.Ephemeral });
      }
      const ref = parseRepoSlug(interaction.options.getString('depot', true));
      if (!ref) return interaction.reply({ content: '❌ Dépôt invalide.', flags: MessageFlags.Ephemeral });

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const { owner, repo } = ref;

      const meta = await ghGet<{ default_branch?: string; private?: boolean }>(`/repos/${owner}/${repo}`);
      if (!meta.data) return interaction.editReply(`❌ Dépôt \`${slug(owner, repo)}\` inaccessible.`);
      const branch = meta.data.default_branch ?? 'main';

      const commits = await ghGet<ApiCommit[]>(`/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=1`);
      const lastCommit = commits.data?.[0];
      const openPulls = await ghGet<ApiPull[]>(`/repos/${owner}/${repo}/pulls?state=open&per_page=100`);
      const runs = await ghGet<{ workflow_runs?: ApiRun[] }>(`/repos/${owner}/${repo}/actions/runs?per_page=1`);
      const lastRun = runs.data?.workflow_runs?.[0];

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`🐙 ${owner}/${repo}`)
        .setURL(`https://github.com/${owner}/${repo}`)
        .addFields(
          {
            name: 'Dernier commit',
            value: lastCommit
              ? `[\`${shortSha(lastCommit.sha)}\`](${lastCommit.html_url}) ${truncate(commitTitle(lastCommit.commit.message), 80)}`
              : '—'
          },
          { name: 'PR ouvertes', value: String(openPulls.data?.length ?? 0), inline: true },
          {
            name: 'Dernière CI',
            value: lastRun ? `${runIcon(lastRun.status, lastRun.conclusion)} ${conclusionLabel(lastRun.status, lastRun.conclusion)}` : '—',
            inline: true
          }
        )
        .setTimestamp(new Date());
      return interaction.editReply({ embeds: [embed] });
    }

    // ----- lier-membre -----
    if (sub === 'lier-membre') {
      const member = interaction.options.getUser('membre', true);
      const login = interaction.options.getString('pseudo-github', true).trim().replace(/^@/, '');
      if (!/^[A-Za-z0-9-]{1,39}$/.test(login)) {
        return interaction.reply({ content: '❌ Pseudo GitHub invalide.', flags: MessageFlags.Ephemeral });
      }
      await prisma.github_links.upsert({
        where: { guild_id_user_id: { guild_id: gid, user_id: member.id } },
        update: { github_login: login, linked_at: Date.now() },
        create: { guild_id: gid, user_id: member.id, github_login: login, linked_at: Date.now() }
      });
      invalidateLinks(gid);
      return interaction.reply({ content: `✅ ${member} lié au pseudo GitHub **@${login}**.`, flags: MessageFlags.Ephemeral });
    }

    // ----- digest -----
    if (sub === 'digest') {
      const channel = interaction.options.getChannel('salon', true);
      const freq = interaction.options.getString('frequence') ?? 'daily';
      const hour = interaction.options.getInteger('heure') ?? 9;
      await setConfig(gid, 'github_digest_channel', channel.id);
      await setConfig(gid, 'github_digest_freq', freq);
      await setConfig(gid, 'github_digest_hour', hour);
      return interaction.reply({
        content: `✅ Digest **${freq === 'weekly' ? 'hebdomadaire (lundi)' : 'quotidien'}** activé dans ${channel} à **${hour}h**.` +
          (config.github.token ? '' : '\n⚠️ Le digest nécessite un `GITHUB_TOKEN` pour agréger l\'activité.'),
        flags: MessageFlags.Ephemeral
      });
    }

    // ----- digest-off -----
    if (sub === 'digest-off') {
      await setConfig(gid, 'github_digest_channel', null);
      return interaction.reply({ content: '🗑️ Digest désactivé.', flags: MessageFlags.Ephemeral });
    }
  }
};
