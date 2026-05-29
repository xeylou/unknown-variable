import type { GuildMember } from 'discord.js';

/**
 * Remplace les variables d'un texte de bienvenue / au revoir.
 *   {user}     → mention du membre
 *   {username} → pseudo du membre
 *   {server}   → nom du serveur
 *   {count}    → nombre de membres
 */
function applyPlaceholders(text: string, member: GuildMember): string {
  return String(text)
    .replaceAll('{user}', member.toString())
    .replaceAll('{username}', member.user.username)
    .replaceAll('{server}', member.guild.name)
    .replaceAll('{count}', String(member.guild.memberCount));
}

export { applyPlaceholders }
