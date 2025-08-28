import { NextRequest, NextResponse } from 'next/server';
import { RATE_LIMIT_CONFIGS, checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { checkAndConsumeDailyAiQuota } from '@/lib/security/daily-ai-limit';
import { createOrGetSummary } from '@/lib/services/summary-service';
import { getArticle } from '@/lib/articles';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`${ip}:summarize`, RATE_LIMIT_CONFIGS.STRICT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试', retryAfter: rl.retryAfter },
        { status: 429, headers: { 'Retry-After': rl.retryAfter?.toString() || '60' } }
      );
    }

    // 全站日限流：超过 100 次/天（UTC）则拒绝
    const quota = checkAndConsumeDailyAiQuota();
    if (!quota.allowed) {
      return NextResponse.json(
        { error: '今日该网站AI使用过多，网站作者已穷，请明天再来吧' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const slug = typeof body.slug === 'string' ? body.slug : undefined;
    const contentFromBody = typeof body.content === 'string' ? body.content : undefined;
    const force = false; // 普通用户禁用强制重生成

    let content = contentFromBody;
    if (!content) {
      if (!slug) {
        return NextResponse.json({ error: '缺少 slug 或 content' }, { status: 400 });
      }
      try {
        const a = getArticle(slug);
        content = a.content;
      } catch {
        return NextResponse.json({ error: '文章不存在' }, { status: 404 });
      }
    }

    const effectiveSlug = slug || `inline-${Date.now()}`;
    const summary = await createOrGetSummary(effectiveSlug, content!, { force });

    return NextResponse.json({ success: true, data: { slug: effectiveSlug, summary } }, { status: 200 });
  } catch (error) {
    console.error('生成摘要失败:', error);
    const msg = error instanceof Error ? error.message : '生成摘要失败';
    const status = (error as unknown as { status?: number })?.status || 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
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

