import { REST, Routes } from 'discord.js';
import config from './config';
import fs from 'node:fs';
import path from 'node:path';

const commands: any[] = [];

// Fonction pour récupérer les commandes de façon récursive
/** Filtre identique au commandHandler — accepte `.ts` ou `.js`, ignore `.d.ts`. */
function isModuleFile(name: string) {
  if (name.endsWith('.d.ts')) return false;
  return name.endsWith('.ts') || name.endsWith('.js');
}

function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (isModuleFile(entry.name)) yield full;
  }
}

/** Aligné avec commandHandler.shouldSkip — ne déploie pas les cmds dont le module est désactivé. */
function shouldSkip(file: string): boolean {
  const normalized = file.replace(/\\/g, '/');
  if (normalized.includes('/commands/music/') && !config.lavalink.password) return true;
  if (normalized.includes('/commands/git/') && !config.github.token && !config.github.webhookSecret) return true;
  return false;
}

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
    
    let data;
    // Si --global est passé, on déploie en global (prend du temps à s'actualiser sur Discord)
    if (args.includes('--global')) {
      data = await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands }
      ) as any[];
      console.log(`✅ ${data.length} commandes enregistrées GLOBALEMENT`);
    } else {
      // Sinon, par défaut sur le serveur de test (immédiat)
      data = await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      ) as any[];
      console.log(`✅ ${data.length} commandes enregistrées pour la guilde ${config.guildId}`);
    }
  } catch (error) {
    console.error(error);
  }
})();
