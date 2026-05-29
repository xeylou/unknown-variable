import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { verifySignature } from './signature';

const SECRET = 'un-secret-partagé';
function sign(body: string | Buffer, secret = SECRET): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

describe('verifySignature', () => {
  it('accepte une signature valide', () => {
    const body = '{"action":"opened"}';
    expect(verifySignature(SECRET, body, sign(body))).toBe(true);
  });

  it('rejette un corps falsifié', () => {
    const body = '{"action":"opened"}';
    expect(verifySignature(SECRET, '{"action":"closed"}', sign(body))).toBe(false);
  });

  it('rejette un secret incorrect', () => {
    const body = 'payload';
    expect(verifySignature(SECRET, body, sign(body, 'autre-secret'))).toBe(false);
  });

  it('rejette une en-tête absente', () => {
    expect(verifySignature(SECRET, 'x', undefined)).toBe(false);
    expect(verifySignature(SECRET, 'x', null)).toBe(false);
  });

  it('rejette une en-tête malformée sans lever d\'exception', () => {
    expect(verifySignature(SECRET, 'x', 'sha256=tropcourt')).toBe(false);
    expect(verifySignature(SECRET, 'x', 'pas-de-prefixe')).toBe(false);
  });

  it('fonctionne sur un corps Buffer', () => {
    const body = Buffer.from('contenu binaire');
    expect(verifySignature(SECRET, body, sign(body))).toBe(true);
  });

  it('rejette si le secret est vide', () => {
    expect(verifySignature('', 'x', sign('x'))).toBe(false);
  });
});
