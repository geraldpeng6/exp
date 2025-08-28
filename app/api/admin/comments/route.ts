import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMIT_CONFIGS, getClientIp } from '@/lib/security/rate-limit';
import { getAllComments } from '@/lib/services/comment-service';

async function validateAdmin(request: NextRequest) {
  const sessionCookie = request.cookies.get('session');
  if (!sessionCookie) return false;
  try {
    const { verifySession } = await import('@/lib/security/auth');
    const payload = await verifySession(sessionCookie.value);
    return payload?.role === 'admin';
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const { isLan } = await import('@/lib/security/ip');
  if (!isLan(ip)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!(await validateAdmin(request))) return NextResponse.json({ error: '需要管理员权限' }, { status: 401 });

  const rl = checkRateLimit(`${ip}:admin-comments`, RATE_LIMIT_CONFIGS.API_GENERAL);
  if (!rl.allowed) return NextResponse.json({ error: '请求过于频繁' }, { status: 429 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const result = await getAllComments({ page, limit, orderBy: 'newest' });
  return NextResponse.json({ success: true, data: result });
}

