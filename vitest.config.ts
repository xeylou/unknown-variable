import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Pool `forks` (processus enfants) plutôt que `threads` (par défaut Vitest 3) :
    // le pool threads plante par intermittence sous Windows avec le module natif
    // `better-sqlite3`. Vitest 4 utilise déjà `forks` par défaut, mais on
    // l'explicite pour verrouiller le comportement quelle que soit la version.
    pool: 'forks',
    environment: 'node',
    env: {
      DISCORD_TOKEN: 'test_token',
      CLIENT_ID: '0',
      GUILD_ID: '0'
    }
  }
});
