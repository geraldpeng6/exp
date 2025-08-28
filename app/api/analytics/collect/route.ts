import { NextRequest } from 'next/server';
import { RATE_LIMIT_CONFIGS, checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { getDatabase } from '@/lib/database/connection';
import { createLogger, getRequestId } from '@/lib/telemetry/logger';
import { jsonError, jsonOk } from '@/lib/telemetry/response';
import { isLikelyBot } from '@/lib/analytics/bot';
import { sanitizeEvent, type RawEvent } from '@/lib/analytics/validate';
import { maybeCleanup } from '@/lib/analytics/cleanup';

/**
 * 埋点采集端点（服务端）
 * - 功能：接收客户端匿名埋点，过滤机器人流量，做字段校验与降噪，写入 SQLite
 * - 隐私：尊重 DNT（Do Not Track）请求头；当为 1 时直接丢弃
 * - 安全：启用轻度频控；对入参严格校验，限制长度，防止污染
 */
export async function POST(req: NextRequest) {
  const reqId = getRequestId(req);
  const log = createLogger(reqId, { route: 'analytics/collect' });

  // 频控（面向单个 IP）
  const ip = getClientIp(req);
  const rl = checkRateLimit(`${ip}:analytics`, RATE_LIMIT_CONFIGS.API_GENERAL);
  if (!rl.allowed) {
    log.warn('rate_limit_block', { ip, retryAfter: rl.retryAfter });
    return jsonError('Too Many Requests', 429, { retryAfter: rl.retryAfter });
  }

  // 尊重 DNT；当用户明确拒绝跟踪时，直接返回成功但不落库
  const dnt = (req.headers.get('dnt') || '').trim() === '1';
  if (dnt) {
    log.info('skip_dnt');
    return jsonOk({ ok: true, count: 0 });
  }

  // 过滤明显机器人（UA 启发式）
  const ua = req.headers.get('user-agent');
  if (isLikelyBot(ua)) {
    log.info('skip_bot', { ua });
    return jsonOk({ ok: true, count: 0 });
  }

  // 解析事件数组，做上限保护
  const body = (await req.json().catch(() => ({ events: [] as unknown[] }))) as { events?: unknown[] };
  const rawEvents = Array.isArray(body.events) ? (body.events.slice(0, 100) as RawEvent[]) : [];

  const db = getDatabase();

  // 预编译语句
  const insert = db.prepare(`
    INSERT INTO events (ts, fp, path, ref, utm, type, payload)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertView = db.prepare(`
    INSERT INTO article_views (slug, day_start_utc, views) VALUES (?, ?, 1)
    ON CONFLICT(slug, day_start_utc) DO UPDATE SET views = article_views.views + 1
  `);

  let inserted = 0;

  // 使用事务批量写入，保证一致性与性能
  const run = db.transaction((items: RawEvent[]) => {
    for (const r of items) {
      const e = sanitizeEvent(r);
      if (!e) continue; // 丢弃非法事件
      try {
        insert.run(e.ts, e.fp, e.path, e.ref, e.utm, e.type, e.payload);
        inserted++;
        // 文章 PV 聚合（仅针对 /articles/:slug）
        if (e.type === 'pv' && e.path && e.path.startsWith('/articles/')) {
          const slug = e.path.split('/articles/')[1];
          if (slug) {
            const dayStartUtc = e.ts - (e.ts % 86400);
            insertView.run(slug, dayStartUtc);
          }
        }
      } catch (err: unknown) {
        log.error('insert_event_failed', { err: String(err) });
      }
    }
  });

  run(rawEvents);

  // 随机小概率触发过期数据清理
  maybeCleanup();

  log.info('collect_ok', { count: inserted });
  return jsonOk({ ok: true, count: inserted });
}
