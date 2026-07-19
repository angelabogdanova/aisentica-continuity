import { createHash, randomBytes } from 'crypto';

const transferTokenPattern = /^[A-Za-z0-9_-]{40,100}$/;

export function generateTransferToken(): string {
  return randomBytes(32).toString('base64url');
}

export function validateTransferToken(token: string): string {
  if (!transferTokenPattern.test(token)) throw new Error('Invalid transfer token.');
  return token;
}

export function hashTransferToken(token: string): string {
  return createHash('sha256').update(validateTransferToken(token)).digest('hex');
}

export function transferExpiresAt(minutes = 15): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}
