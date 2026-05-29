import crypto from 'node:crypto';

/**
 * Vérifie la signature HMAC-SHA256 d'une livraison webhook GitHub.
 *
 * GitHub envoie l'en-tête `X-Hub-Signature-256: sha256=<hex>` calculé sur le
 * corps BRUT de la requête avec le secret partagé. On recalcule et on compare
 * en temps constant (`timingSafeEqual`) pour éviter les attaques temporelles.
 *
 * Fonction pure (aucune dépendance hors `node:crypto`) → testable directement.
 *
 * @param secret  Secret partagé (= `GITHUB_WEBHOOK_SECRET`).
 * @param rawBody Corps brut de la requête (avant tout `JSON.parse`).
 * @param header  Valeur de l'en-tête `X-Hub-Signature-256` (peut être absente).
 */
export function verifySignature(
  secret: string,
  rawBody: string | Buffer,
  header: string | undefined | null
): boolean {
  if (!secret || !header) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  // `timingSafeEqual` exige des buffers de même longueur — sinon, signature invalide.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
