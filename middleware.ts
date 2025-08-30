import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/security/auth';
import { getRequestId } from '@/lib/telemetry/logger';

// 允许通过环境变量配置控制台白名单 IP（逗号分隔）
// 构建时注入（Next 会内联 env）；更新需重新构建
function readEnv(name: string): string {
  const env = (typeof process !== 'undefined' ? (process as unknown as { env?: Record<string, string | undefined> }).env : undefined);
  return env?.[name] ?? '';
}
const DEFAULT_ALLOWED_IPS = ['100.126.240.87', '100.119.115.128'];
const ENV_ALLOWED_IPS = (readEnv('CONSOLE_ALLOW_IPS') || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const ALLOWED_IPS = new Set<string>([...DEFAULT_ALLOWED_IPS, ...ENV_ALLOWED_IPS]);

function isLan(ip: string | null | undefined) {
  if (!ip) return false;
  if (ALLOWED_IPS.has(ip)) return true; // 明确白名单优先放行
  // IPv4: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 100.64.0.0/10 (Tailscale CGNAT)
  return /^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip) || /^127\./.test(ip) || /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip) || ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd');
}

export async function middleware(req: NextRequest) {
  const reqId = getRequestId(req);
  const { pathname } = req.nextUrl;

  // 仅控制 /console 下的访问；/admin 直接隐藏为 404
  if (pathname.startsWith('/admin')) {
    const r = NextResponse.rewrite(new URL('/_not-found', req.url), { status: 404 });
    r.headers.set('x-request-id', reqId);
    return r;
  }

  if (pathname.startsWith('/console')) {
    const xf = req.headers.get('x-forwarded-for') || '';
    const real = req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || '';
    const ip = (xf.split(',')[0] || real || '').trim();
    if (!isLan(ip)) {
      const r = NextResponse.rewrite(new URL('/_not-found', req.url), { status: 404 });
      r.headers.set('x-request-id', reqId);
      return r;
    }

    if (!pathname.startsWith('/console/login')) {
      const token = req.cookies.get('session')?.value || '';
      const payload = token ? await verifySession(token) : null;
      if (!payload || payload.role !== 'admin') {
        const loginUrl = new URL(`/console/login?from=${encodeURIComponent(pathname)}`, req.url);
        const r = NextResponse.redirect(loginUrl);
        r.headers.set('x-request-id', reqId);
        return r;
      }
    }
  }

  const r = NextResponse.next();
  r.headers.set('x-request-id', reqId);
  return r;
}

export const config = {
  matcher: ['/admin/:path*', '/console/:path*'],
};

