# 🤝 Contributing

> 🇫🇷 **Version française → [CONTRIBUTING.md](CONTRIBUTING.md)**

Thanks for your interest in the project! This guide covers the dev environment, conventions, and how to add a command, a component, or a translation.

---

## Development environment

```bash
git clone https://github.com/xeylou/unknown-variable.git
cd unknown-variable
npm install
cp .env.example .env        # a TEST bot: DISCORD_TOKEN + CLIENT_ID + GUILD_ID
npx prisma db push
npm run deploy:guild        # instant deploy to GUILD_ID (dev)
npm run dev                 # tsx watch — reloads on save
```

> **Always** use a dedicated **test** Discord application and server. `GUILD_ID` enables instant deployment (`deploy:guild`), unlike global deployment (`deploy`, ~1 h propagation).

### Useful scripts

| Script | Effect |
|---|---|
| `npm run dev` | Runs the bot in watch mode (auto reload). |
| `npm run typecheck` | `tsc --noEmit` (strict TypeScript). |
| `npm run lint` / `lint:fix` | ESLint. |
| `npm test` / `test:watch` | Vitest. |
| `npm run check` | **typecheck + lint + test** — run **before every PR**. |
| `npm run deploy:guild` | Deploys commands to `GUILD_ID` (instant). |

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs `npm run check` on every push / PR.

---

## Project structure

```
src/
├── index.ts              Entry point (client, intents, loading, login, shutdown)
├── config.ts             Central config (colors, ticket categories, .env via Zod)
├── database.ts           Prisma + guild_config helpers
├── deploy-commands.ts    Deploys slash commands (guild or global)
├── types.ts              Contracts: CommandModule, ComponentModule, EventModule
├── handlers/             Auto-loaders: commands, components, events
├── events/               Discord events (interactionCreate, ready, guildCreate…)
├── commands/             Slash commands, grouped by module (1 file = 1 command)
├── components/           Buttons / menus / modals (routed by customId prefix)
├── features/             Business logic & pollers (automod, giveaways, github/, health…)
├── utils/                Helpers (permissions, durations, autocomplete, embeds, logger…)
├── i18n/                 FR/EN translations (messages.ts) + helpers (t, base, frLoc)
└── data/                 Editable content (reglement.ts, help.ts, welcome.ts)
```

Loading is **automatic per file**: drop a file in the right place and it's discovered at boot. No central registry to edit.

---

## Conventions

- **Strict TypeScript**: no implicit `any`, `strictNullChecks`. Type your signatures.
- **Style**: ESLint + Prettier (`.prettierrc`). Run `npm run lint:fix`.
- **Comments**: in French, explaining the *why* (intent, pitfalls), not the *what*. Match the surrounding density.
- **Embeds**: use the factories in [`utils/embeds.ts`](src/utils/embeds.ts) (`embeds.success(...)`, etc.) rather than `new EmbedBuilder().setColor(...)`.
- **Permissions**: guard sensitive commands with `requireStaff` / `requireAdmin` ([`utils/permissions.ts`](src/utils/permissions.ts)) and/or `.setDefaultMemberPermissions(...)`.
- **Replies**: ephemeral (`MessageFlags.Ephemeral`) for action/error feedback; explicit prefix (`✅`, `❌`, `⛔`, `⏳`).
- **Multi-server**: never read an `.env` default except for the main server — all per-server config goes through `guild_config` (see [`utils/guildSettings.ts`](src/utils/guildSettings.ts)).

---

## Adding a slash command

Create `src/commands/<module>/<name>.ts` exporting `{ data, execute }` (+ optional `autocomplete?` / `cooldown?`). Contract in [`types.ts`](src/types.ts).

```ts
import { SlashCommandBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { base, frLoc } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('exemple')
    .setDescription(base('exemple.cmd.desc'))
    .setDescriptionLocalizations(frLoc('exemple.cmd.desc')),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    await interaction.reply({ content: '✅ Done.', flags: MessageFlags.Ephemeral });
  }
};
```

Then `npm run deploy:guild` (commands are **not** deployed at boot).

### Autocomplete

Declare the option with `.setAutocomplete(true)`, add an `autocomplete` method, and use the [`utils/autocomplete.respondChoices`](src/utils/autocomplete.ts) helper (filters + truncates + caps at 25):

```ts
import { respondChoices } from '../../utils/autocomplete';
import type { AutocompleteInteraction } from 'discord.js';

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.guildId) return;
    const rows = await prisma.tags.findMany({ where: { guild_id: interaction.guildId }, take: 100 });
    await respondChoices(interaction, rows.map((t) => ({ name: t.name, value: t.name })));
  },
```

The interaction router calls `autocomplete` automatically. Respond in **< 3 s** and **≤ 25 choices**.

### Components (buttons / menus / modals)

Create `src/components/<prefix>.ts` exporting `{ prefix, execute }`. Routing uses the first part of the `customId` (`prefix:action:arg1:arg2`). To allow DMs, add `dmFriendly: true` and guard against a missing `interaction.guild`.

---

## i18n

The bot is **bilingual**; **English is canonical**. To translate a command:

1. Add keys in [`src/i18n/messages.ts`](src/i18n/messages.ts) (`{ en, fr }`).
2. `data` side: `.setDescription(base(key))` + `.setDescriptionLocalizations(frLoc(key))`.
3. Reply side: `const lang = resolveLang(interaction.locale)` then `t(lang, key, vars)`.

**Don't localize command/option names** — only descriptions and replies. `/avatar` is the reference.

---

## Tests

**Vitest** tests, co-located (`*.test.ts`). Prioritize pure logic (parsing, normalization, signatures) — see [`utils/duration.test.ts`](src/utils/duration.test.ts), [`features/github/`](src/features/github/). Add a test for any non-trivial helper.

---

## Pull requests

1. Branch off `main`.
2. `npm run check` **green** (typecheck + lint + test).
3. If you touch `prisma/schema.prisma`: `npx prisma db push` and document the impact in the PR (see [Database](docs/DATABASE_en.md)).
4. Clear commit messages (`feat:`, `fix:`, `docs:`, `refactor:`…). One PR = one topic.
5. Describe the **what** and the **why**, and how you tested it (test server).

Thanks for contributing! 🙌
