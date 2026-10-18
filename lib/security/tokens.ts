import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
export function credentials() {
  return {
    shareId: randomBytes(24).toString('base64url'),
    editToken: randomBytes(32).toString('base64url'),
  };
}
export function hashToken(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
export function validToken(value: string, hash: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(value) || !/^[a-f0-9]{64}$/.test(hash)) return false;
  return timingSafeEqual(Buffer.from(hashToken(value), 'hex'), Buffer.from(hash, 'hex'));
}
