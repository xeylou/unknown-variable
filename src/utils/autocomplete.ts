import type { AutocompleteInteraction } from 'discord.js';

export type Choice = { name: string; value: string | number };

/**
 * Répond à une autocomplétion de façon robuste :
 *  - filtre les choix sur la saisie courante (sous-chaîne, insensible à la casse) ;
 *  - tronque chaque libellé à 100 caractères (limite Discord) ;
 *  - plafonne à 25 entrées (limite Discord).
 *
 * Best-effort : si l'interaction a expiré (>3 s) ou a déjà reçu une réponse,
 * l'erreur est avalée — une autocomplétion ratée ne doit jamais casser le flux.
 */
export async function respondChoices(
  interaction: AutocompleteInteraction,
  choices: Choice[]
): Promise<void> {
  const focused = String(interaction.options.getFocused() ?? '').toLowerCase();
  const filtered = focused
    ? choices.filter((c) => c.name.toLowerCase().includes(focused))
    : choices;
  await interaction
    .respond(filtered.slice(0, 25).map((c) => ({ name: c.name.slice(0, 100), value: c.value })))
    .catch(() => {});
}
