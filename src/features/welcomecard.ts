import { createCanvas, loadImage } from '@napi-rs/canvas';
import { createLogger } from '../utils/logger';

const log = createLogger('welcomecard');

/**
 * Génération des cartes membre (bienvenue / départ). Le rendu Canvas est fait directement dans
 * le thread principal : le dessin est négligeable et `canvas.encode('png')` est
 * asynchrone (offload natif napi-rs), donc l'event loop n'est pas bloqué.
 *
 * On n'utilise PAS de worker thread : tsx n'enregistre pas son loader TypeScript
 * dans les workers (`module.register()` est local au thread), ce qui faisait
 * planter le worker avec ERR_UNKNOWN_FILE_EXTENSION sur le fichier .ts.
 */

type RenderParams = {
  username: string;
  avatarURL: string;
  memberCount: number;
  guildName: string;
  /** URL d'image de fond optionnelle (config `welcome_card_background`). */
  backgroundURL?: string | null;
  /** 'welcome' (défaut, arrivée) ou 'goodbye' (départ) — change titre/teinte/texte. */
  variant?: 'welcome' | 'goodbye';
};

/** Habillage (dégradé de fond + titre) selon la variante de la carte. */
const THEME = {
  welcome: { from: '#1e2747', to: '#5865f2', title: 'Bienvenue !' },
  goodbye: { from: '#2b1216', to: '#b3203a', title: 'Au revoir' }
} as const;

const WIDTH = 800;
const HEIGHT = 250;
const AVATAR_SIZE = 160;

/**
 * Génère la carte PNG. Retourne `null` en cas d'échec ; l'appelant doit dégrader
 * gracieusement (envoyer le message de bienvenue sans image).
 */
export async function renderWelcomeCard(params: RenderParams): Promise<Buffer | null> {
  try {
    const theme = THEME[params.variant ?? 'welcome'];

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    // Fond : dégradé sombre → couleur d'accent (bleu pour l'arrivée, rouge pour
    // le départ). Couche de base (fallback si l'image custom échoue, et couleur
    // sous les PNG transparents).
    const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    grad.addColorStop(0, theme.from);
    grad.addColorStop(1, theme.to);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Image de fond personnalisée (cover). En cas d'échec on garde le dégradé.
    if (params.backgroundURL) {
      try {
        const bg = await loadImage(params.backgroundURL);
        const ratio = Math.max(WIDTH / bg.width, HEIGHT / bg.height);
        const w = bg.width * ratio;
        const h = bg.height * ratio;
        ctx.drawImage(bg, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      } catch {
        // Image inaccessible : on garde le dégradé déjà dessiné.
      }
    }

    // Cadre subtil
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, WIDTH - 20, HEIGHT - 20);

    // Avatar circulaire
    const avatarX = 60;
    const avatarY = (HEIGHT - AVATAR_SIZE) / 2;
    try {
      const avatar = await loadImage(params.avatarURL);
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + AVATAR_SIZE / 2, avatarY + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, avatarX, avatarY, AVATAR_SIZE, AVATAR_SIZE);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(avatarX + AVATAR_SIZE / 2, avatarY + AVATAR_SIZE / 2, AVATAR_SIZE / 2 + 3, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.stroke();
    } catch {
      // Avatar inaccessible : cercle vide, le rendu continue.
      ctx.beginPath();
      ctx.arc(avatarX + AVATAR_SIZE / 2, avatarY + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fill();
    }

    // Texte
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';

    ctx.font = 'bold 38px sans-serif';
    ctx.fillText(theme.title, 250, 50);

    ctx.font = 'bold 32px sans-serif';
    const usernameDisplay = params.username.length > 22 ? `${params.username.slice(0, 22)}…` : params.username;
    ctx.fillText(usernameDisplay, 250, 100);

    ctx.font = '22px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    const subtitle = params.variant === 'goodbye'
      ? `${params.memberCount} membre(s) restant(s) sur ${params.guildName}`
      : `Vous êtes le ${params.memberCount}ᵉ membre de ${params.guildName}`;
    ctx.fillText(subtitle, 250, 160);

    return Buffer.from(await canvas.encode('png'));
  } catch (e) {
    log.warn('render failed:', e instanceof Error ? e.message : String(e));
    return null;
  }
}

/**
 * Conservé pour compatibilité avec le shutdown (`index.ts`). Plus de worker à
 * fermer depuis le passage au rendu inline — no-op.
 */
export async function closeWorker(): Promise<void> {
  // no-op
}
