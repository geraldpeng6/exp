import { NextRequest, NextResponse } from 'next/server';
import { signSession, timingSafeEqualStr } from '@/lib/security/auth';
import { RATE_LIMIT_CONFIGS, checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

function isStrong(value: string) {
  // 至少 10 位，包含大小写、数字与符号中的任意两类
  const lengthOk = value.length >= 12;
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].reduce((acc, re) => acc + (re.test(value) ? 1 : 0), 0);
  return lengthOk && classes >= 3;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`${ip}:login`, RATE_LIMIT_CONFIGS.STRICT);
  if (!rl.allowed) {
    return NextResponse.json({ error: '请求过于频繁', retryAfter: rl.retryAfter }, { status: 429, headers: { 'Retry-After': rl.retryAfter?.toString() || '60' } });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<{ username: string; password: string }>;
  const username = process.env.ADMIN_USERNAME || '';
  const password = process.env.ADMIN_PASSWORD || '';

  // 强制要求设置强口令后才允许登录
  if (!isStrong(username) || !isStrong(password)) {
    return NextResponse.json({ error: '管理员账号未正确设置。请配置 ADMIN_USERNAME/ADMIN_PASSWORD 为高强度值（≥12位，含大小写/数字/符号至少3类）。' }, { status: 503 });
  }

  const ok = timingSafeEqualStr(body.username || '', username) && timingSafeEqualStr(body.password || '', password);
  if (!ok) return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });

  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 天
  const token = await signSession({ sub: username, role: 'admin', exp });

  const res = NextResponse.json({ success: true }, { status: 200 });
  res.cookies.set('session', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 7 });
  return res;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

