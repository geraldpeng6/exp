import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMIT_CONFIGS, getClientIp } from '@/lib/security/rate-limit';
import { z } from 'zod';
import { listArticles, readArticle, saveArticle, deleteArticle } from '@/lib/services/articles-admin';

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

const articleSchema = z.object({
  slug: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  date: z.string().min(1).max(50),
  summary: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).optional(),
  content: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  // 移除内网/IP 限制，仅保留管理员权限
  if (!(await validateAdmin(request))) return NextResponse.json({ error: '需要管理员权限' }, { status: 401 });

  const rl = checkRateLimit(`${ip}:admin-articles`, RATE_LIMIT_CONFIGS.API_GENERAL);
  if (!rl.allowed) return NextResponse.json({ error: '请求过于频繁' }, { status: 429 });

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  if (slug) {
    const a = readArticle(slug);
    if (!a) return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    return NextResponse.json({ success: true, data: a });
  }
  return NextResponse.json({ success: true, data: listArticles() });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  // 移除内网/IP 限制，仅保留管理员权限
  if (!(await validateAdmin(request))) return NextResponse.json({ error: '需要管理员权限' }, { status: 401 });

  const rl = checkRateLimit(`${ip}:admin-articles-modify`, RATE_LIMIT_CONFIGS.USER_ACTION);
  if (!rl.allowed) return NextResponse.json({ error: '操作过于频繁' }, { status: 429 });

  const body = await request.json();
  const parsed = articleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: '数据验证失败' }, { status: 400 });

  saveArticle(parsed.data);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const ip = getClientIp(request);
  // 移除内网/IP 限制，仅保留管理员权限
  if (!(await validateAdmin(request))) return NextResponse.json({ error: '需要管理员权限' }, { status: 401 });

  const rl = checkRateLimit(`${ip}:admin-articles-delete`, RATE_LIMIT_CONFIGS.USER_ACTION);
  if (!rl.allowed) return NextResponse.json({ error: '操作过于频繁' }, { status: 429 });

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: '缺少 slug' }, { status: 400 });

  const ok = deleteArticle(slug);
  if (!ok) return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

