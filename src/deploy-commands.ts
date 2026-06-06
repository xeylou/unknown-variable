import { REST, Routes } from 'discord.js';
import config from './config';
import path from 'node:path';
import { walk, shouldSkip } from './utils/commandFiles';

const commands: any[] = [];

const commandsPath = path.join(__dirname, 'commands');

for (const file of walk(commandsPath)) {
  if (shouldSkip(file)) continue;
  const cmd = require(file).default;
  if (cmd?.data && cmd?.execute) {
    commands.push(cmd.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log(`⏳ Début du rafraîchissement de ${commands.length} commandes d'application (/)`);
    const args = process.argv.slice(2);

    let data: any[];
    // Par défaut : déploiement GLOBAL — le bon mode pour un bot multi-serveur
    // (propagation Discord jusqu'à ~1 h). `--guild` force un déploiement sur le
    // seul GUILD_ID, instantané : pratique en développement.
    if (args.includes('--guild')) {
      if (!config.guildId) {
        console.error('❌ `--guild` nécessite GUILD_ID dans le .env (serveur de test). Sans GUILD_ID, lance `npm run deploy` (global).');
        process.exit(1);
      }
      data = await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      ) as any[];
      console.log(`✅ ${data.length} commandes enregistrées pour la guilde ${config.guildId} (instantané)`);
    } else {
      data = await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands }
      ) as any[];
      console.log(`✅ ${data.length} commandes enregistrées GLOBALEMENT (propagation jusqu'à ~1 h)`);
    }
  } catch (error) {
    console.error(error);
  }
})();
