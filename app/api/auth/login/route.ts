export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { signSession, timingSafeEqualStr } from '@/lib/security/auth';
import { RATE_LIMIT_CONFIGS, checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

function isStrong(value: string) {
  // 至少 12 位，包含大小写、数字、符号至少三类
  const lengthOk = value.length >= 12;
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].reduce((acc, re) => acc + (re.test(value) ? 1 : 0), 0);
  return lengthOk && classes >= 3;
}

// 归一化：去除首尾空白与行尾 CR，防止 .env 中的不可见字符导致比较失败
function normalize(s: string): string {
  return (s ?? '').replace(/\r/g, '').trim();
}

// 运行时读取环境变量，避免构建期内联（使用计算属性访问）
function readEnv(name: string): string {
  const env = (globalThis as any)?.process?.env as Record<string, string | undefined> | undefined;
  return env?.[name] ?? '';
}


export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`${ip}:login`, RATE_LIMIT_CONFIGS.STRICT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: '请求过于频繁', retryAfter: rl.retryAfter },
      { status: 429, headers: { 'Retry-After': rl.retryAfter?.toString() || '60' } }
    );
  }

  const body = (await req.json().catch(() => ({}))) as Partial<{ username: string; password: string }>;

  // 从环境读取并归一化（优先使用 RUNTIME 前缀，回退至原键名/兼容键名）
  const rawUsername = readEnv('ADMIN_USERNAME_RUNTIME') || readEnv('ADMIN_USERNAME') || readEnv('CONSOLE_USERNAME') || '';
  const rawPassword = readEnv('ADMIN_PASSWORD_RUNTIME') || readEnv('ADMIN_PASSWORD') || readEnv('CONSOLE_PASSWORD') || '';
  const username = normalize(rawUsername);
  const password = normalize(rawPassword);

  // 要求强口令
  if (!isStrong(username) || !isStrong(password)) {
    return NextResponse.json(
      { error: '管理员账号未正确设置。请配置 ADMIN_USERNAME_RUNTIME/ADMIN_PASSWORD_RUNTIME（或 ADMIN_USERNAME/ADMIN_PASSWORD）为高强度值（≥12位，含大小写/数字/符号至少3类）。' },
      { status: 503 }
    );
  }

  // 对比前也归一化请求体，消除不可见字符/首尾空白差异
  const bu = normalize(body.username || '');
  const bp = normalize(body.password || '');

  const ok = timingSafeEqualStr(bu, username) && timingSafeEqualStr(bp, password);
  if (!ok) {
    const r = NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    // 为排查提供最小化元信息（不泄露明文）
    r.headers.set('x-auth-ul', String(username.length));
    r.headers.set('x-auth-pl', String(password.length));
    r.headers.set('x-auth-bul', String(bu.length));
    r.headers.set('x-auth-bpl', String(bp.length));
    return r;
  }

  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 天
  const token = await signSession({ sub: username, role: 'admin', exp });

  const res = NextResponse.json({ success: true }, { status: 200 });
  res.cookies.set('session', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  // 同样在成功时附带长度元信息（便于确认）
  res.headers.set('x-auth-ul', String(username.length));
  res.headers.set('x-auth-pl', String(password.length));
  res.headers.set('x-auth-bul', String(bu.length));
  res.headers.set('x-auth-bpl', String(bp.length));
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

