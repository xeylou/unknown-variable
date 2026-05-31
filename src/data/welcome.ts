/**
 * 2ᵉ embed envoyé en message privé au membre lorsqu'il obtient le rôle membre
 * (après le captcha + l'acceptation du règlement), EN PLUS de la carte de
 * bienvenue. Sert à l'orienter : salons importants, premières étapes, liens…
 *
 * Modifie librement les textes ci-dessous — ils sont repris tels quels.
 *   • Laisse `description` vide ('') pour NE PAS envoyer ce 2ᵉ embed.
 *   • Placeholders disponibles : {user} {username} {server} {count}
 *   • Pour lier un salon : <#IDENTIFIANT> (clic droit sur le salon → Copier l'identifiant).
 *   • Pour mentionner un rôle (cliquable, sans ping) : <@&IDENTIFIANT_DU_RÔLE>
 */
export default {
  // Titre de l'embed ('' = aucun titre).
  title: '🧭 Par où commencer ?',

  // Corps du message. Vide ('') = le 2ᵉ embed n'est pas envoyé.
  description:
    'Bienvenue **{username}** sur **{server}** ! br br br :\n\n' +
    '• 🎫 tickets : <#REMPLACE_PAR_ID_TICKETS>\n\n' +
    'On est ravis de t\'avoir parmi nous. 🎉',

  // Champs additionnels facultatifs. Laisse [] si inutile.
  // Exemple : { name: '📜 Règlement', value: 'Relis-le à tout moment dans <#ID>.' }
  fields: [] as { name: string; value: string; inline?: boolean }[],

  // Pied de page facultatif ('' = aucun).
  footer: ''
};
