import { parentPort } from 'node:worker_threads';
import { createCanvas, loadImage } from '@napi-rs/canvas';

/**
 * Worker dédié à la génération des cartes de bienvenue. Empêche que le rendu
 * Canvas (décodage avatar + encodage PNG) ne bloque le thread principal du bot
 * — important en cas d'arrivée massive (raid, événement promo).
 *
 * Protocole : on reçoit `{ id, params }`, on répond `{ id, ok, buffer? , error? }`.
 * Le thread principal (`features/welcomecard.ts`) tient une Map id → resolver.
 */

if (!parentPort) {
  throw new Error('welcomecard worker doit être démarré via Worker, pas standalone');
}

const WIDTH = 800;
const HEIGHT = 250;
const AVATAR_SIZE = 160;

type RenderParams = {
  username: string;
  avatarURL: string;
  memberCount: number;
  guildName: string;
  /** URL d'image de fond optionnelle. Si fournie, écrase le dégradé par défaut. */
  backgroundURL?: string | null;
};

async function render(params: RenderParams): Promise<Buffer> {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Fond : dégradé bleu sombre → indigo Discord. Toujours dessiné en couche
  // de base — sert de fallback si l'image custom échoue, et de couleur sous
  // les images transparentes (PNG avec alpha).
  const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  grad.addColorStop(0, '#1e2747');
  grad.addColorStop(1, '#5865f2');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Image de fond personnalisée (cover : remplit en conservant le ratio).
  // En cas d'échec on garde le dégradé sans bloquer le rendu.
  if (params.backgroundURL) {
    try {
      const bg = await loadImage(params.backgroundURL);
      const ratio = Math.max(WIDTH / bg.width, HEIGHT / bg.height);
      const w = bg.width * ratio;
      const h = bg.height * ratio;
      ctx.drawImage(bg, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);
      // Voile sombre pour garantir la lisibilité du texte blanc, quelle que
      // soit l'image (claire, chargée, multicolore).
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
    // Avatar inaccessible : on dessine un cercle vide à la place, le rendu continue.
    ctx.beginPath();
    ctx.arc(avatarX + AVATAR_SIZE / 2, avatarY + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fill();
  }

  // Texte
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'top';

  ctx.font = 'bold 38px sans-serif';
  ctx.fillText('Bienvenue !', 250, 50);

  ctx.font = 'bold 32px sans-serif';
  const usernameDisplay = params.username.length > 22 ? `${params.username.slice(0, 22)}…` : params.username;
  ctx.fillText(usernameDisplay, 250, 100);

  ctx.font = '22px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(`Tu es le ${params.memberCount}ᵉ membre de ${params.guildName}`, 250, 160);

  // `encode` est asynchrone (offload natif vers le pool napi-rs) — au lieu
  // de `toBuffer` qui est synchrone et bloque l'event loop du worker.
  return Buffer.from(await canvas.encode('png'));
}

parentPort.on('message', async (msg: { id: number; params: RenderParams }) => {
  try {
    const buffer = await render(msg.params);
    parentPort!.postMessage({ id: msg.id, ok: true, buffer }, [buffer.buffer as ArrayBuffer]);
  } catch (e) {
    parentPort!.postMessage({ id: msg.id, ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});
