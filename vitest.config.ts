import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Les tests d'utilitaires purs n'ont pas besoin d'environnement Discord —
    // par défaut Node, sans setup global.
    environment: 'node',
    // Le code charge `config.ts` au boot (qui exige DISCORD_TOKEN). Les tests
    // d'utilitaires purs ne devraient pas l'importer, mais on injecte une
    // valeur fictive pour ne pas bloquer un import transitif accidentel.
    env: {
      DISCORD_TOKEN: 'test_token',
      CLIENT_ID: '0',
      GUILD_ID: '0'
    }
  }
});
