import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/security/auth';
import { getRequestId } from '@/lib/telemetry/logger';

function isLan(ip: string | null | undefined) {
  if (!ip) return false;
  // IPv4: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8
  return /^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip) || /^127\./.test(ip) || ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd');
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
        const url = req.nextUrl.clone();
        url.pathname = '/console/login';
        url.searchParams.set('from', pathname);
        const r = NextResponse.redirect(url);
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

