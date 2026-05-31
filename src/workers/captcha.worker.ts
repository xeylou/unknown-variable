import { parentPort } from 'node:worker_threads';
import { createCanvas } from '@napi-rs/canvas';
import { randomInt } from 'node:crypto';

if (!parentPort) {
  throw new Error('captcha worker doit être démarré via Worker, pas standalone');
}

const W = 380;
const H = 150;

async function render(text: string): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Fond gradient sombre
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#1a1a2e');
  grad.addColorStop(1, '#16213e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Bruit de fond : ~400 points colorés semi-transparents
  for (let i = 0; i < 400; i++) {
    const x = randomInt(0, W);
    const y = randomInt(0, H);
    const size = randomInt(1, 3);
    ctx.fillStyle = `rgba(${randomInt(100, 255)},${randomInt(100, 255)},${randomInt(100, 255)},${(randomInt(10, 40)) / 100})`;
    ctx.fillRect(x, y, size, size);
  }

  // Lignes d'interférence : courbes de Bézier traversant l'image
  const lineColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7'];
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(0, randomInt(15, H - 15));
    ctx.bezierCurveTo(
      W / 3, randomInt(5, H - 5),
      (2 * W) / 3, randomInt(5, H - 5),
      W, randomInt(15, H - 15)
    );
    ctx.strokeStyle = lineColors[i % lineColors.length];
    ctx.lineWidth = randomInt(1, 4);
    ctx.stroke();
    ctx.restore();
  }

  // Caractères : police monospace bold, rotation individuelle, couleur par teinte
  ctx.font = 'bold 52px monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  const startX = 38;
  const charSpacing = 52;

  for (let i = 0; i < text.length; i++) {
    const x = startX + i * charSpacing + (randomInt(0, 9) - 4);
    const y = H / 2 + (randomInt(0, 17) - 8);
    const angle = (randomInt(0, 31) - 15) * (Math.PI / 180);
    const hue = (i * 52) % 360;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = `hsl(${hue}, 90%, 70%)`;
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }

  return Buffer.from(await canvas.encode('png'));
}

parentPort.on('message', async (msg: { id: number; text: string }) => {
  try {
    const buffer = await render(msg.text);
    parentPort!.postMessage({ id: msg.id, ok: true, buffer }, [buffer.buffer as ArrayBuffer]);
  } catch (e) {
    parentPort!.postMessage({ id: msg.id, ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});
