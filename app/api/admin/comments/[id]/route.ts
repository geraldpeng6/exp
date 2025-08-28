import { NextRequest, NextResponse } from 'next/server';
import { getClientIp } from '@/lib/security/rate-limit';
import { withTransaction } from '@/lib/database/connection';
import { sanitizeComment } from '@/lib/security/sanitization';

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

export async function PUT(request: NextRequest, context: unknown) {
  const { params } = context as { params: { id: string } };
  const ip = getClientIp(request);
  const { isLan } = await import('@/lib/security/ip');
  if (!isLan(ip)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!(await validateAdmin(request))) return NextResponse.json({ error: '需要管理员权限' }, { status: 401 });

  // 对于局域网内的管理员操作，放宽限制：不对编辑进行频率限制

  const body = (await request.json().catch(() => ({}))) as { content?: unknown };
  const raw = String(body.content || '');
  const content = sanitizeComment(raw);
  if (!content.trim()) return NextResponse.json({ error: '内容不能为空' }, { status: 400 });

  const ok = withTransaction((db) => {
    const now = Math.floor(Date.now() / 1000);
    const result = db.prepare(`
      UPDATE comments SET content = ?, updated_at = ? WHERE id = ?
    `).run(content, now, params.id);
    return result.changes > 0;
  });

  if (!ok) return NextResponse.json({ error: '评论不存在' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, context: unknown) {
  const { params } = context as { params: { id: string } };
  const ip = getClientIp(request);
  const { isLan } = await import('@/lib/security/ip');
  if (!isLan(ip)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!(await validateAdmin(request))) return NextResponse.json({ error: '需要管理员权限' }, { status: 401 });

  // 对于局域网内的管理员操作，放宽限制：不对删除进行频率限制

  const ok = withTransaction((db) => {
    const result = db.prepare(`DELETE FROM comments WHERE id = ?`).run(params.id);
    return result.changes > 0;
  });
  if (!ok) return NextResponse.json({ error: '评论不存在' }, { status: 404 });
  return NextResponse.json({ success: true });
}

