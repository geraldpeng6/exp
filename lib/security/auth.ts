const AUTH_SECRET = process.env.AUTH_SECRET || 'change-me-secret';

function base64urlFromBytes(bytes: Uint8Array) {
  const binStr = String.fromCharCode(...bytes);
  const b64 = btoa(binStr);
  return b64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlFromString(str: string) {
  return base64urlFromBytes(new TextEncoder().encode(str));
}

async function hmacSha256(key: string, data: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  return base64urlFromBytes(new Uint8Array(sig));
}

export interface SessionPayload {
  sub: string; // subject (用户名)
  role: 'admin' | 'viewer';
  exp: number; // 过期时间（秒）
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encHeader = base64urlFromString(JSON.stringify(header));
  const encPayload = base64urlFromString(JSON.stringify(payload));
  const data = `${encHeader}.${encPayload}`;
  const sig = await hmacSha256(AUTH_SECRET, data);
  return `${data}.${sig}`;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const [encHeader, encPayload, sig] = token.split('.');
    if (!encHeader || !encPayload || !sig) return null;
    const data = `${encHeader}.${encPayload}`;
    const expected = await hmacSha256(AUTH_SECRET, data);
    // 常量时间比较
    if (expected.length !== sig.length) return null;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
    if (diff !== 0) return null;
    const json = atob(encPayload.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as SessionPayload;
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

