import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMIT_CONFIGS, getClientIp } from '@/lib/security/rate-limit';
import { getSummaryAdmin, createOrGetSummary } from '@/lib/services/summary-service';
import { getArticle } from '@/lib/articles';

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

  const rl = checkRateLimit(`${ip}:admin-summary`, RATE_LIMIT_CONFIGS.API_GENERAL);
  if (!rl.allowed) return NextResponse.json({ error: '请求过于频繁' }, { status: 429 });

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') || '';
  if (!slug) return NextResponse.json({ error: '缺少 slug' }, { status: 400 });

  const data = getSummaryAdmin(slug);
  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { isLan } = await import('@/lib/security/ip');
  if (!isLan(ip)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!(await validateAdmin(request))) return NextResponse.json({ error: '需要管理员权限' }, { status: 401 });

  const rl = checkRateLimit(`${ip}:admin-summary-regenerate`, RATE_LIMIT_CONFIGS.STRICT);
  if (!rl.allowed) return NextResponse.json({ error: '操作过于频繁' }, { status: 429 });

  // 全站日限流（UTC）：AI 相关接口统一限制
  const { checkAndConsumeDailyAiQuota } = await import('@/lib/security/daily-ai-limit');
  const quota = checkAndConsumeDailyAiQuota();
  if (!quota.allowed) return NextResponse.json({ error: '今日该网站AI使用过多，网站作者已穷，请明天再来吧' }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const slug = typeof body.slug === 'string' ? body.slug : '';
  const systemPrompt = typeof body.systemPrompt === 'string' ? body.systemPrompt : undefined;
  if (!slug) return NextResponse.json({ error: '缺少 slug' }, { status: 400 });

  // 加载文章内容
  const article = getArticle(slug);
  const content = article?.content || '';
  if (!content) return NextResponse.json({ error: '文章不存在或内容为空' }, { status: 404 });

  // 强制重生成，并可带上新的 systemPrompt
  const summary = await createOrGetSummary(slug, content, { force: true, systemPrompt });
  return NextResponse.json({ success: true, data: { summary } });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

