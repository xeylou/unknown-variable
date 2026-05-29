// Config du CLI Prisma (db push / generate / studio).
// ⚠️ Le chemin de la BDD doit rester ALIGNÉ avec src/config.ts : même dérivation
// depuis BOT_NAME, et DATABASE_PATH explicite prioritaire. Sinon le CLI et le
// runtime ouvrent deux fichiers différents (« table does not exist » au boot).
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "prisma/config";

const botName = process.env.BOT_NAME || "_unknown_variable";
const botSlug =
  botName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "bot";
const dbPath = process.env.DATABASE_PATH || `./data/${botSlug}.db`;

// Crée le dossier de la BDD si besoin — sinon `prisma db push` échoue sur un
// clone neuf (« unable to open the database file ») : data/ est gitignoré donc
// absent après un git clone. (Le runtime, lui, le crée déjà dans src/config.ts.)
const dbDir = path.dirname(path.resolve(dbPath));
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: `file:${dbPath}`,
  },
});
