import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/connection';
import { checkRateLimit, RATE_LIMIT_CONFIGS, getClientIp } from '@/lib/security/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientIp = getClientIp(request);
    const rl = checkRateLimit(`${clientIp}:article-stats`, RATE_LIMIT_CONFIGS.API_GENERAL);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试', retryAfter: rl.retryAfter },
        { status: 429, headers: { 'Retry-After': rl.retryAfter?.toString() || '60' } }
      );
    }

    const slugsParam = searchParams.get('slugs');
    const slugParam = searchParams.get('slug');
    let slugs: string[] = [];
    if (slugsParam && slugsParam.trim().length > 0) {
      slugs = slugsParam.split(',').map(s => s.trim()).filter(Boolean);
    } else if (slugParam && slugParam.trim().length > 0) {
      slugs = [slugParam.trim()];
    }

    if (slugs.length === 0) {
      return NextResponse.json({ success: false, error: '缺少 slug(s) 参数' }, { status: 400 });
    }

    const db = getDatabase();

    // 初始化结果映射
    const result: Record<string, { pv: number; likes: number; comments: number }> = {};
    for (const s of slugs) result[s] = { pv: 0, likes: 0, comments: 0 };

    // PV: 优先使用 article_views 表（按天聚合），不存在则回退到 events
    try {
      const placeholders = slugs.map(() => '?').join(',');
      const rows = db.prepare(
        `SELECT slug, SUM(views) as v FROM article_views WHERE slug IN (${placeholders}) GROUP BY slug`
      ).all(...slugs) as Array<{ slug: string; v: number }>;
      for (const r of rows) {
        if (result[r.slug]) result[r.slug].pv = r.v || 0;
      }
    } catch {
      // 回退：使用 events 表统计
      try {
        const viewsBySlug = new Map<string, number>();
        for (const s of slugs) {
          const row = db.prepare(
            `SELECT COUNT(1) as c FROM events WHERE type='pv' AND path = ?`
          ).get(`/articles/${s}`) as { c: number };
          viewsBySlug.set(s, row?.c || 0);
        }
        for (const [s, v] of viewsBySlug) result[s].pv = v;
      } catch {}
    }

    // Likes 统计
    try {
      const placeholders = slugs.map(() => '?').join(',');
      const likeRows = db.prepare(
        `SELECT article_id as slug, COUNT(*) as c FROM likes WHERE article_id IN (${placeholders}) GROUP BY article_id`
      ).all(...slugs) as Array<{ slug: string; c: number }>;
      for (const r of likeRows) {
        if (result[r.slug]) result[r.slug].likes = r.c || 0;
      }
    } catch {}

    // Comments 统计
    try {
      const placeholders = slugs.map(() => '?').join(',');
      const cmtRows = db.prepare(
        `SELECT article_id as slug, COUNT(*) as c FROM comments WHERE article_id IN (${placeholders}) GROUP BY article_id`
      ).all(...slugs) as Array<{ slug: string; c: number }>;
      for (const r of cmtRows) {
        if (result[r.slug]) result[r.slug].comments = r.c || 0;
      }
    } catch {}

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('获取文章统计失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取文章统计失败' },
      { status: 500 }
    );
  }
}

