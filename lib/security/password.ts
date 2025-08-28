import crypto from 'crypto';

// Strong password hashing with scrypt and constant-time verification
// Format: scrypt$N$r$p$saltBase64$hashBase64

const DEFAULT_SCRYPT_PARAMS = {
  N: 16384, // CPU/memory cost
  r: 8,
  p: 1,
  keylen: 64 as const,
};

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const { N, r, p, keylen } = DEFAULT_SCRYPT_PARAMS;
  const hash = crypto.scryptSync(password, salt, keylen, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${Buffer.from(hash).toString('base64')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = stored.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
    const N = parseInt(parts[1], 10);
    const r = parseInt(parts[2], 10);
    const p = parseInt(parts[3], 10);
    const salt = Buffer.from(parts[4], 'base64');
    const hash = Buffer.from(parts[5], 'base64');
    const derived = crypto.scryptSync(password, salt, hash.length, { N, r, p });
    return crypto.timingSafeEqual(hash, Buffer.from(derived));
  } catch {
    return false;
  }
}

