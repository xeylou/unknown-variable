import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'node:path';
import config from './config';

// Prisma 7 impose un « driver adapter ». Le schéma ne définit pas d'URL de
// datasource : on la fournit ici, résolue en chemin absolu pour rester
// indépendant du répertoire de travail.
const adapter = new PrismaBetterSqlite3({
  url: `file:${path.resolve(config.database.path)}`
});

export const prisma = new PrismaClient({ adapter });

export async function getConfig(
  guildId: string,
  key: string,
  fallback: string | null = null
): Promise<string | null> {
  const row = await prisma.guild_config.findUnique({
    where: { guild_id_key: { guild_id: guildId, key } }
  });
  return row ? row.value : fallback;
}

export async function setConfig(
  guildId: string,
  key: string,
  value: string | number | null
): Promise<void> {
  if (value === null || value === undefined) {
    await prisma.guild_config.delete({
      where: { guild_id_key: { guild_id: guildId, key } }
    }).catch(() => {});
    return;
  }
  await prisma.guild_config.upsert({
    where: { guild_id_key: { guild_id: guildId, key } },
    update: { value: String(value) },
    create: { guild_id: guildId, key, value: String(value) }
  });
}
