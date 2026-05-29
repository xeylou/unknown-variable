# 📋 Améliorations possibles — système de journalisation

Revue du système de logs (`features/serverlog.ts`, `features/logger.ts`, commande
`/logs`). Chaque point : **quoi**, **pourquoi**, **où**, effort 🟢 facile · 🟡 moyen · 🔴 conséquent.

---

## 1. Fiabilité de l'attribution (journal d'audit)

### 1. Lire l'audit log avec un court délai 🟢
`fetchAudit` ([serverlog.ts](src/features/serverlog.ts)) interroge l'Audit Log
**immédiatement** quand l'événement gateway arrive. Or l'entrée d'audit n'est
souvent pas encore disponible à cet instant → l'auteur n'est pas trouvé.
Attendre ~1,5 s avant le `fetchAuditLogs` augmenterait nettement le taux de
réussite de l'attribution.

### 2. Attribution des suppressions de messages peu fiable 🟡
Discord ne crée **pas** une entrée d'audit par message supprimé : pour
`MessageDelete`, il regroupe les suppressions et n'incrémente qu'un compteur, et
n'enregistre que les suppressions du message **d'autrui**. Conséquence :
`onMessageDelete` attribue souvent le mauvais auteur, ou aucun. À documenter, et
n'afficher l'auteur que lorsque l'entrée vient réellement d'être créée.

### 3. Cache court des résultats d'audit 🟡
Pendant un `/clear` ou un raid, chaque événement déclenche un `fetchAuditLogs` →
risque de rate-limit sur l'endpoint d'audit. Mettre en cache le résultat ~5 s par
couple (serveur, type d'audit) éviterait les appels répétés.

---

## 2. Couverture — événements encore non journalisés

### 4. Fils de discussion (threads) 🟢
`threadCreate`, `threadDelete`, `threadUpdate` ne sont pas couverts. À ajouter à
la catégorie **channels**.

### 5. Modifications de permissions de salon 🟡
`onChannelUpdate` compare le nom, le sujet, le NSFW et la catégorie — mais **pas
les permissions** (`permissionOverwrites`). Or un changement de permissions est
l'une des modifications les plus sensibles à auditer.

### 6. Renommage d'émojis et de stickers 🟢
Seuls `create` et `delete` sont journalisés. `emojiUpdate` / `stickerUpdate`
(renommage) manquent.

### 7. Boost de serveur 🟢
Quand un membre boost le serveur (`premiumSinceTimestamp` dans
`guildMemberUpdate`), rien n'est journalisé. « X a boosté le serveur » est un
événement notable, à ajouter à la catégorie **members** ou **server**.

### 8. Webhooks, événements programmés, automod natif 🟡
Non couverts : `webhooksUpdate`, `guildScheduledEventCreate/Update/Delete`,
`autoModerationActionExecution` (automod natif de Discord).

### 9. Invitation utilisée à l'arrivée d'un membre 🔴
Aujourd'hui on journalise la création/suppression d'invitations, mais pas
**quelle invitation** un nouveau membre a utilisée. En gardant en cache le
compteur d'utilisations de chaque invitation et en le comparant à chaque
arrivée, on pourrait afficher « X a rejoint via l'invitation de Y ».

### 10. Messages épinglés / désépinglés 🟢
`channelPinsUpdate` (ou le diff `pinned` dans `messageUpdate`) n'est pas suivi.

---

## 3. Contenu des logs

### 11. Pièces jointes des messages supprimés 🟢
`onMessageDelete` ne journalise que le **texte**. Si un message contenait une
image ou un fichier, il disparaît sans trace. Journaliser les URLs de
`message.attachments` (en notant que les liens CDN expirent).

### 12. Transcript des suppressions groupées 🟡
`onMessageBulkDelete` n'indique que le **nombre** de messages. Joindre un
transcript `.txt` des messages supprimés (le code des tickets fait déjà ça).

### 13. Cache de messages pour les anciens messages 🔴
Un message supprimé/modifié affiche « non disponible » s'il n'était pas dans le
cache de discord.js (messages anciens ou postés avant le démarrage du bot).
Augmenter la taille du cache, ou stocker les messages récents en base, comblerait
ce trou.

---

## 4. Robustesse

### 14. Protection anti-flood 🔴
En cas de raid (centaines d'arrivées) ou de gros `/clear`, `serverlog` envoie un
embed par événement → rate-limit de Discord et salon de logs illisible. Une file
d'attente avec regroupement (ex. « 120 arrivées en 30 s » en un seul embed)
fiabiliserait le tout.

### 15. Salon de logs supprimé 🟡
Si le salon configuré pour une catégorie est supprimé, `sendLog` échoue en
silence indéfiniment. Détecter ce cas (via `channelDelete`) et prévenir un
administrateur, ou réinitialiser la clé de config concernée.

### 16. Échecs d'envoi silencieux 🟢
`logger.ts` fait `channel.send(...).catch(() => {})` : toute erreur est perdue.
Au minimum logger l'erreur en console pour faciliter le diagnostic.

---

## 5. Configuration & confort

### 17. `/logs setup` — création automatique des salons 🟡
Configurer 7 catégories à la main est fastidieux. Une sous-commande qui crée une
catégorie « 📋 Logs » + 7 salons et renseigne toute la config en une fois serait
un gain de confort majeur.

### 18. `/logs test` — embed de vérification 🟢
Une sous-commande qui envoie un embed d'exemple dans une catégorie pour vérifier
en un coup d'œil que le salon et les permissions sont bons.

### 19. Liste d'exclusion de salons 🟡
Pouvoir exclure certains salons des logs de messages (ex. un salon de spam, un
salon de commandes) éviterait du bruit inutile.

### 20. `/logs voir` — vérifier la permission d'audit 🟢
Le pied de page rappelle qu'il faut la permission « Voir les logs d'audit » ;
mieux vaudrait **tester** réellement la permission et afficher ✅ / ❌.

---

## 6. Technique

### 21. Typage de `serverlog.ts` 🔴
Tous les gestionnaires utilisent des paramètres `any` (cohérent avec le reste du
projet, mais sans sécurité de typage). À traiter avec la migration globale vers
le mode `strict` de TypeScript.

---

## Ordre de traitement suggéré

1. **#1, #16, #20** — correctifs rapides à fort impact.
2. **#4, #6, #7, #10, #11** — compléter la couverture (faciles).
3. **#17, #5, #12, #15** — confort et robustesse.
4. **#9, #13, #14** — chantiers plus lourds, selon le besoin réel.
