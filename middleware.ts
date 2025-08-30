import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/security/auth';
import { getRequestId } from '@/lib/telemetry/logger';

// 已移除 IP 限制逻辑

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
    // 移除 IP/内网限制，仅保留管理员会话校验
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

