/**
 * Contenu du règlement affiché par /setup-reglement.
 * Modifie librement les textes ci-dessous — ils sont repris tels quels.
 */
export default {
  header: {
    title: '📜 RÈGLEMENT OFFICIEL DU SERVEUR',
    intro:
      'Bienvenue parmi nous. Afin de garantir à chaque membre un environnement **sain, ' +
      'respectueux et agréable**, la lecture et le respect du présent règlement sont **obligatoires**.\n\n' +
      "Ce document constitue un engagement : en validant votre accès, vous acceptez l'ensemble " +
      'des dispositions qui suivent. Prendre le temps de tout lire attentivement.'
  },

  // Texte affiché au-dessus du bouton d'acceptation
  acceptation:
    "**ACCEPTATION DU RÈGLEMENT**\n" +
    "En cliquant sur le bouton **« ✅ J'accepte le règlement »** ci-dessous, vous certifiez avoir " +
    "**lu, compris et accepté l'intégralité** du présent règlement, ainsi que les Conditions " +
    "d'utilisation de Discord. Cette validation déverrouille l'accès complet au serveur.\n\n" +
    "*Tout manquement ultérieur pourra être sanctionné conformément à l'Article 11.*",

  footer: 'Règlement susceptible d\'évoluer • Dernière mise à jour gérée par l\'équipe',

  articles: [
    {
      emoji: '🤝',
      titre: 'Respect & savoir-vivre',
      contenu:
        'Le respect mutuel est la règle fondamentale. Toute forme de harcèlement, ' +
        "d'intimidation, de discrimination (racisme, sexisme, homophobie, validisme, etc.), " +
        "de menace ou d'incitation à la haine est strictement interdite et sanctionnée " +
        'immédiatement. Les désaccords doivent rester courtois et constructifs.'
    },
    {
      emoji: '🗣️',
      titre: 'Langage & ton',
      contenu:
        'Les insultes gratuites, la vulgarité excessive, les provocations et le « troll » ' +
        'sont proscrits. La langue principale du serveur est le **français**. ' +
        'La critique est permise, le mépris ne l\'est pas : privilégier toujours un ton posé.'
    },
    {
      emoji: '🔞',
      titre: 'Contenu interdit',
      contenu:
        'Sont formellement interdits tout contenu à caractère **sexuel, pornographique, ' +
        'gore, violent ou choquant**, ainsi que tout contenu **illégal** (piratage, ' +
        'substances illicites, etc.). Garder vos publications appropriées à un public large.'
    },
    {
      emoji: '📢',
      titre: 'Publicité & promotion',
      contenu:
        "La publicité non sollicitée (autres serveurs, chaînes, réseaux sociaux, services) " +
        'est interdite, en salon **comme en messages privés**. Le partage de vos créations ' +
        "n'est autorisé que dans les salons explicitement prévus à cet effet."
    },
    {
      emoji: '🔁',
      titre: 'Spam, flood & détournement',
      contenu:
        'Le flood (messages répétés), le spam d\'émojis, de mentions ou de majuscules, ' +
        'ainsi que le détournement de salon sont interdits. Une seule demande par sujet. ' +
        "L'auto-modération applique ces règles automatiquement."
    },
    {
      emoji: '🪪',
      titre: 'Pseudonymes, avatars & statuts',
      contenu:
        'Votre pseudonyme doit rester **lisible, mentionnable** et dépourvu de caractère ' +
        'offensant. Avatars, bannières et statuts ne doivent comporter aucun contenu ' +
        'choquant, haineux ou publicitaire. Le staff peut exiger une modification.'
    },
    {
      emoji: '🧵',
      titre: 'Bon usage des salons',
      contenu:
        'Respecter la thématique de chaque salon et lire sa description avant de publier. ' +
        'Utiliser le **système de tickets** pour toute demande d\'aide ou de build. ' +
        'Les discussions hors-sujet disposent de leurs propres salons.'
    },
    {
      emoji: '🔊',
      titre: 'Salons vocaux',
      contenu:
        'En vocal : pas de cris, de bruits parasites, de soundboard abusif ni ' +
        "d'enregistrement sans le consentement des participants. Le squat de salon et le " +
        'micro ouvert nuisible peuvent entraîner une exclusion vocale.'
    },
    {
      emoji: '🔐',
      titre: 'Sécurité & arnaques',
      contenu:
        'Ne jamais cliquer sur des liens suspects. **L\'équipe ne vous demandera jamais ' +
        'votre mot de passe ni votre token.** Tout lien de phishing, arnaque ou logiciel ' +
        'malveillant entraîne un **bannissement définitif** et un signalement.'
    },
    {
      emoji: '🛡️',
      titre: 'Données personnelles & vie privée',
      contenu:
        "Ne pas divulguer vos informations personnelles ni celles d'autrui (adresse, " +
        'identité réelle, etc.). Le **doxxing** est puni d\'un bannissement immédiat et ' +
        'signalé à Discord. Respectez la vie privée de chacun en toutes circonstances.'
    },
    {
      emoji: '⚖️',
      titre: 'Sanctions & application',
      contenu:
        'Selon la gravité, un manquement entraîne : **avertissement**, **exclusion ' +
        'temporaire**, **expulsion** ou **bannissement**. L\'équipe de modération apprécie ' +
        'chaque situation et ses décisions font foi. Toute contestation se fait via un ticket, calmement.'
    },
    {
      emoji: '📄',
      titre: 'Conditions Discord & dispositions finales',
      contenu:
        'Vous devez respecter les Conditions d\'utilisation et les Règles de la communauté ' +
        'Discord (https://discord.com/terms). Le présent règlement peut évoluer ; les ' +
        "membres seront informés. L'ignorance du règlement n'exonère pas de son application."
    }
  ]
};
