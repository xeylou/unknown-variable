# 🤝 Contribuer

> 🇬🇧 **English version → [CONTRIBUTING_en.md](CONTRIBUTING_en.md)**

Merci de l'intérêt porté au projet ! Ce guide couvre l'environnement de dev, les conventions, et comment ajouter une commande, un composant ou une traduction.

---

## Environnement de développement

```bash
git clone https://github.com/xeylou/unknown-variable.git
cd unknown-variable
npm install
cp .env.example .env        # un bot de TEST : DISCORD_TOKEN + CLIENT_ID + GUILD_ID
npx prisma db push
npm run deploy:guild        # déploiement instantané sur GUILD_ID (dev)
npm run dev                 # tsx watch — recharge à chaque sauvegarde
```

> Utilise **toujours** une application Discord et un serveur **de test** dédiés. `GUILD_ID` permet le déploiement instantané (`deploy:guild`), contrairement au déploiement global (`deploy`, propagation ~1 h).

### Scripts utiles

| Script | Effet |
|---|---|
| `npm run dev` | Lance le bot en watch (rechargement auto). |
| `npm run typecheck` | `tsc --noEmit` (TypeScript strict). |
| `npm run lint` / `lint:fix` | ESLint. |
| `npm test` / `test:watch` | Vitest. |
| `npm run check` | **typecheck + lint + test** — à passer **avant chaque PR**. |
| `npm run deploy:guild` | Déploie les commandes sur `GUILD_ID` (instantané). |

La CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) exécute `npm run check` sur chaque push / PR.

---

## Structure du projet

```
src/
├── index.ts              Point d'entrée (client, intents, chargement, login, shutdown)
├── config.ts             Configuration centrale (couleurs, catégories tickets, .env via Zod)
├── database.ts           Prisma + helpers guild_config
├── deploy-commands.ts    Déploie les slash-commands (guild ou global)
├── types.ts              Contrats : CommandModule, ComponentModule, EventModule
├── handlers/             Chargeurs auto : commandes, composants, événements
├── events/               Événements Discord (interactionCreate, ready, guildCreate…)
├── commands/             Slash-commands, rangées par module (1 fichier = 1 commande)
├── components/           Boutons / menus / modales (routage par préfixe de customId)
├── features/             Logique métier & pollers (automod, giveaways, github/, health…)
├── utils/                Helpers (permissions, durations, autocomplete, embeds, logger…)
├── i18n/                 Traductions FR/EN (messages.ts) + helpers (t, base, frLoc)
└── data/                 Contenus éditables (reglement.ts, help.ts, welcome.ts)
```

Le chargement est **automatique par fichier** : dépose un fichier au bon endroit, il est découvert au boot. Pas de registre central à éditer.

---

## Conventions

- **TypeScript strict** : pas de `any` implicite, `strictNullChecks`. Type tes signatures.
- **Style** : ESLint + Prettier (`.prettierrc`). Lance `npm run lint:fix`.
- **Commentaires** : en français, expliquant le *pourquoi* (intention, pièges), pas le *quoi*. Suis la densité du code environnant.
- **Embeds** : utilise les factories de [`utils/embeds.ts`](src/utils/embeds.ts) (`embeds.success(...)`, etc.) plutôt que `new EmbedBuilder().setColor(...)`.
- **Permissions** : protège les commandes sensibles avec `requireStaff` / `requireAdmin` ([`utils/permissions.ts`](src/utils/permissions.ts)) et/ou `.setDefaultMemberPermissions(...)`.
- **Réponses** : éphémères (`MessageFlags.Ephemeral`) pour les retours d'action/erreur ; préfixe explicite (`✅`, `❌`, `⛔`, `⏳`).
- **Multi-serveur** : ne lis jamais un défaut `.env` sauf pour le serveur principal — toute config par serveur passe par `guild_config` (voir [`utils/guildSettings.ts`](src/utils/guildSettings.ts)).

---

## Ajouter une commande slash

Crée `src/commands/<module>/<nom>.ts` exportant `{ data, execute }` (+ `autocomplete?` / `cooldown?` optionnels). Contrat dans [`types.ts`](src/types.ts).

```ts
import { SlashCommandBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { base, frLoc } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('exemple')
    .setDescription(base('exemple.cmd.desc'))
    .setDescriptionLocalizations(frLoc('exemple.cmd.desc')),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    await interaction.reply({ content: '✅ Fait.', flags: MessageFlags.Ephemeral });
  }
};
```

Puis `npm run deploy:guild` (les commandes ne se déploient **pas** au boot).

### Autocomplétion

Déclare l'option avec `.setAutocomplete(true)`, ajoute une méthode `autocomplete` et utilise le helper [`utils/autocomplete.respondChoices`](src/utils/autocomplete.ts) (filtre + tronque + plafonne à 25) :

```ts
import { respondChoices } from '../../utils/autocomplete';
import type { AutocompleteInteraction } from 'discord.js';

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.guildId) return;
    const rows = await prisma.tags.findMany({ where: { guild_id: interaction.guildId }, take: 100 });
    await respondChoices(interaction, rows.map((t) => ({ name: t.name, value: t.name })));
  },
```

Le routeur d'interactions appelle `autocomplete` automatiquement. Réponds en **< 3 s** et **≤ 25 choix**.

### Composants (boutons / menus / modales)

Crée `src/components/<prefix>.ts` exportant `{ prefix, execute }`. Le routage se fait sur la 1ʳᵉ partie du `customId` (`prefix:action:arg1:arg2`). Pour autoriser le DM, ajoute `dmFriendly: true` et auto-protège-toi de l'absence de `interaction.guild`.

---

## i18n

Le bot est **bilingue** ; l'**anglais est canonique**. Pour traduire une commande :

1. Ajoute les clés dans [`src/i18n/messages.ts`](src/i18n/messages.ts) (`{ en, fr }`).
2. Côté `data` : `.setDescription(base(key))` + `.setDescriptionLocalizations(frLoc(key))`.
3. Côté réponse : `const lang = resolveLang(interaction.locale)` puis `t(lang, key, vars)`.

**Ne localise pas les noms** de commandes/options — uniquement descriptions et réponses. `/avatar` sert de référence.

---

## Tests

Tests **Vitest**, co-localisés (`*.test.ts`). Teste en priorité la logique pure (parsing, normalisation, signatures) — voir [`utils/duration.test.ts`](src/utils/duration.test.ts), [`features/github/`](src/features/github/). Ajoute un test pour tout helper non trivial.

---

## Pull requests

1. Crée une branche depuis `main`.
2. `npm run check` **vert** (typecheck + lint + test).
3. Si tu touches `prisma/schema.prisma` : `npx prisma db push` et documente l'impact dans la PR (voir [Base de données](docs/DATABASE.md)).
4. Messages de commit clairs (`feat:`, `fix:`, `docs:`, `refactor:`…). Une PR = un sujet.
5. Décris le **quoi** et le **pourquoi**, et comment tu as testé (serveur de test).

Merci pour ta contribution ! 🙌
