import { NextRequest } from 'next/server';
import { RATE_LIMIT_CONFIGS, checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { getDatabase } from '@/lib/database/connection';
import { createLogger, getRequestId } from '@/lib/telemetry/logger';
import { jsonError, jsonOk } from '@/lib/telemetry/response';
import { getTodayAiUsage, DAILY_AI_LIMIT } from '@/lib/security/daily-ai-limit';

export async function GET(req: NextRequest) {
  const reqId = getRequestId(req);
  const log = createLogger(reqId, { route: 'analytics/aggregate' });

  const ip = getClientIp(req);
  const rl = checkRateLimit(`${ip}:analytics-agg`, RATE_LIMIT_CONFIGS.API_GENERAL);
  if (!rl.allowed) {
    log.warn('rate_limit_block', { ip, retryAfter: rl.retryAfter });
    return jsonError('Too Many Requests', 429, { retryAfter: rl.retryAfter });
  }

  const url = new URL(req.url);
  const range = url.searchParams.get('range') || '7d';
  const format = (url.searchParams.get('format') || '').toLowerCase();
  const dataset = (url.searchParams.get('dataset') || '').toLowerCase();
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');

  function parseTs(val: string | null): number | null {
    if (!val) return null;
    const n = Number(val);
    if (!Number.isNaN(n) && n > 0) {
      // 支持毫秒/秒时间戳
      return n > 1_000_000_000_000 ? Math.floor(n / 1000) : Math.floor(n);
    }
    const t = Date.parse(val);
    if (!Number.isNaN(t)) return Math.floor(t / 1000);
    return null;
  }

  const db = getDatabase();
  const days = range === '30d' ? 30 : range === '1d' ? 1 : 7;
  let since = Math.floor(Date.now() / 1000) - days * 86400;
  let until: number | null = null;
  const startTs = parseTs(startParam);
  const endTs = parseTs(endParam);
  if (startTs) since = startTs;
  if (endTs) until = endTs;
  const untilEff = until ?? Math.floor(Date.now() / 1000);

  // 概览：总 PV、UV、按日 PV、Top Articles
  const totalPv = db.prepare(`SELECT COUNT(1) as c FROM events WHERE type='pv' AND ts>=?${until ? ' AND ts<=?' : ''}`).get(...(until ? [since, until] : [since])) as { c: number } | undefined;
  const totalUv = db.prepare(`SELECT COUNT(DISTINCT fp) as c FROM events WHERE type='pv' AND ts>=?${until ? ' AND ts<=?' : ''} AND fp IS NOT NULL`).get(...(until ? [since, until] : [since])) as { c: number } | undefined;
  const byDayRows = db.prepare(`SELECT strftime('%s', datetime(ts, 'unixepoch', 'start of day')) as d, COUNT(1) as c FROM events WHERE type='pv' AND ts>=?${until ? ' AND ts<=?' : ''} GROUP BY d ORDER BY d`).all(...(until ? [since, until] : [since])) as Array<{ d: string; c: number }>;
  const byDay = byDayRows.map(r => ({ d: Number(r.d), c: r.c }));
  const byDayUvRows = db.prepare(`SELECT strftime('%s', datetime(ts, 'unixepoch', 'start of day')) as d, COUNT(DISTINCT fp) as c FROM events WHERE type='pv' AND ts>=?${until ? ' AND ts<=?' : ''} AND fp IS NOT NULL GROUP BY d ORDER BY d`).all(...(until ? [since, until] : [since])) as Array<{ d: string; c: number }>;
  const byDayUv = byDayUvRows.map(r => ({ d: Number(r.d), c: r.c }));

  // 统一：topArticles 仅使用 day_start_utc（全数值秒化）
  const sinceDayStart = Math.floor(since / 86400) * 86400;
  let topArticles: Array<{ slug: string; v: number }> = [];
  try {
    topArticles = db.prepare(
      `SELECT slug, SUM(views) as v
       FROM article_views
       WHERE day_start_utc >= ?
       GROUP BY slug
       ORDER BY v DESC
       LIMIT 10`
    ).all(sinceDayStart) as Array<{ slug: string; v: number }>;
  } catch {
    // 兼容旧库（无 day_start_utc 或无 article_views）：从 events 回退计算
    try {
      topArticles = db.prepare(
        `SELECT substr(path, length('/articles/')+1) as slug, COUNT(1) as v
         FROM events
         WHERE type='pv' AND ts>=? AND path LIKE '/articles/%'
         GROUP BY slug
         ORDER BY v DESC
         LIMIT 10`
      ).all(since) as Array<{ slug: string; v: number }>;
    } catch {}
  }

  // 来源聚合：主域名、utm_source、按日来源趋势（Top N）
  function mainDomain(url: string | null): string {
    if (!url) return 'direct';
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '');
    } catch {
      return 'direct';
    }
  }

  function parseSearch(str: string | null): Record<string, string> {
    if (!str) return {};
    try {
      const u = new URL(str, 'http://dummy');
      const out: Record<string, string> = {};
      u.searchParams.forEach((v, k) => out[k] = v);
      return out;
    } catch {
      // 可能直接传的是 "?a=b" 这类
      const sp = new URLSearchParams(str.startsWith('?') ? str : `?${str}`);
      const out: Record<string, string> = {};
      sp.forEach((v, k) => out[k] = v);
      return out;
    }
  }

  const refRows = db.prepare(`SELECT ref FROM events WHERE type='pv' AND ts>=?${until ? ' AND ts<=?' : ''}`).all(...(until ? [since, until] : [since])) as Array<{ ref: string | null }>;
  const utmRows = db.prepare(`SELECT utm FROM events WHERE type='pv' AND ts>=?${until ? ' AND ts<=?' : ''}`).all(...(until ? [since, until] : [since])) as Array<{ utm: string | null }>;
  const refCount: Record<string, number> = {};
  for (const r of refRows) {
    const host = mainDomain(r.ref || null);
    refCount[host] = (refCount[host] || 0) + 1;
  }
  const utmCount: Record<string, number> = {};
  for (const r of utmRows) {
    const q = parseSearch(r.utm || null);
    const src = q['utm_source'] || 'unknown';
    utmCount[src] = (utmCount[src] || 0) + 1;
  }
  const topReferrers = Object.entries(refCount).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([ref, v]) => ({ ref, v }));
  const topUtmSource = Object.entries(utmCount).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([src, v]) => ({ src, v }));

  // 按日+来源趋势（仅取 topReferrers 的 host 做聚合）
  const hosts = topReferrers.map(x=>x.ref);
  const byReferrerDay: Array<{ d: number; ref: string; c: number }> = [];
  for (const host of hosts) {
    const rows = db.prepare(`SELECT strftime('%s', datetime(ts, 'unixepoch', 'start of day')) as d, COUNT(1) as c FROM events WHERE type='pv' AND ts>=?${until ? ' AND ts<=?' : ''} AND (CASE WHEN ref IS NULL OR ref='' THEN 'direct' ELSE replace(replace(replace(substr(ref, instr(ref, '://')+3), 'www.', ''), '/', ''), ':', '') END) LIKE ? GROUP BY d ORDER BY d`).all(...(until ? [since, until, `${host}%`] : [since, `${host}%`])) as Array<{ d: string; c: number }>;
    for (const row of rows) byReferrerDay.push({ d: Number(row.d), ref: host, c: row.c });
  }

  // 行为分析：停留时长分布、热门点击、滚动深度分布
  const stayRows = db.prepare(`SELECT payload FROM events WHERE type='stay' AND ts>=?${until ? ' AND ts<=?' : ''}`).all(...(until ? [since, until] : [since])) as Array<{ payload: string | null }>;
  const buckets = [5, 15, 60, 180, 600]; // 秒阈值：0-5,5-15,15-60,1-3m,3-10m,10m+
  const stayBuckets = [0,0,0,0,0,0];
  for (const r of stayRows) {
    try {
      const p = JSON.parse(r.payload || '{}');
      const ms = Number(p.ms) || 0;
      const s = Math.floor(ms / 1000);
      let idx = buckets.findIndex(b => s < b);
      if (idx === -1) idx = buckets.length; // 10m+
      stayBuckets[idx]++;
    } catch {}
  }

  const clickRows = db.prepare(`SELECT payload FROM events WHERE type='click' AND ts>=?${until ? ' AND ts<=?' : ''}`).all(...(until ? [since, until] : [since])) as Array<{ payload: string | null }>;
  const clickCount: Record<string, number> = {};
  for (const r of clickRows) {
    try {
      const p = JSON.parse(r.payload || '{}');
      const key = p.name ? `${p.sel || ''}|${p.name}` : (p.sel || 'unknown');
      clickCount[key] = (clickCount[key] || 0) + 1;
    } catch {}
  }
  const topClicks = Object.entries(clickCount).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v]) => {
    const [sel, name] = k.split('|');
    return { sel, name: name || null, v };
  });

  const scrollRows = db.prepare(`SELECT payload FROM events WHERE type='scroll' AND ts>=?${until ? ' AND ts<=?' : ''}`).all(...(until ? [since, until] : [since])) as Array<{ payload: string | null }>;
  const sdBuckets = [25, 50, 75, 100];
  const scrollDist = [0,0,0,0];
  for (const r of scrollRows) {
    try {
      const p = JSON.parse(r.payload || '{}');
      const d = Math.max(0, Math.min(100, Number(p.depth) || 0));
      let idx = sdBuckets.findIndex(b => d <= b);
      if (idx === -1) idx = sdBuckets.length - 1;
      scrollDist[idx]++;
    } catch {}
  }

  // 新老访客：依据浏览器指纹（fp）在“历史上的首次出现时间 first”划分
  // - new: first ∈ [since, until]
  // - returning: 当期 UV - new
  const pvRows = db.prepare(`SELECT ts, fp FROM events WHERE type='pv' AND ts>=? AND ts<=? AND fp IS NOT NULL`).all(since, untilEff) as Array<{ ts: number; fp: string | null }>;
  const uvInWindow = new Set(pvRows.map(r => (r.fp || '').trim()).filter(Boolean));
  const seenRows = db.prepare(`SELECT fp, MIN(ts) as first FROM events WHERE type='pv' AND fp IS NOT NULL AND ts<=? GROUP BY fp`).all(untilEff) as Array<{ fp: string | null; first: number }>;
  let newVisitors = 0;
  for (const row of seenRows) {
    const fp = (row.fp || '').trim();
    if (!fp || !uvInWindow.has(fp)) continue; // 仅统计当期出现在窗口内的访客
    if (row.first >= since && row.first <= untilEff) newVisitors++;
  }
  const returningVisitors = Math.max(0, uvInWindow.size - newVisitors);

  log.info('aggregate_ok', { range, totalPv: totalPv?.c || 0 });

  if (format === 'csv') {
    // 支持 dataset 选择：默认 pv_uv；top_articles；referrers；utm
    if (dataset === 'top_articles') {
      const lines: string[] = ['slug,pv'];
      for (const a of topArticles) lines.push(`${a.slug},${a.v}`);
      return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
    }
    if (dataset === 'referrers') {
      const lines: string[] = ['ref,pv'];
      for (const r of topReferrers) lines.push(`${r.ref},${r.v}`);
      return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
    }
    if (dataset === 'utm') {
      const lines: string[] = ['src,pv'];
      for (const u of topUtmSource) lines.push(`${u.src},${u.v}`);
      return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
    }
    const lines: string[] = [];
    lines.push('date,pv,uv');
    const mapUv = new Map(byDayUv.map((x: { d: number; c: number }) => [x.d, x.c]));
    for (const row of byDay as Array<{ d: number; c: number }>) {
      const ds = new Date(row.d * 1000).toISOString().slice(0, 10);
      const uv = mapUv.get(row.d) || 0;
      lines.push(`${ds},${row.c},${uv}`);
    }
    const csv = lines.join('\n');
    return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
  }

  // 今日 AI 配额用量（独立于 range，基于 UTC 自然日）
  const { count: aiTodayUsed } = getTodayAiUsage();
  const aiDailyLimit = DAILY_AI_LIMIT;
  const aiRemaining = Math.max(0, aiDailyLimit - aiTodayUsed);

  return jsonOk({
    totalPv: totalPv?.c || 0,
    totalUv: totalUv?.c || 0,
    byDay,
    byDayUv,
    topArticles,
    topReferrers,
    topUtmSource,
    byReferrerDay,
    stayBuckets,
    topClicks,
    scrollDist,
    newVisitors,
    returningVisitors,
    aiTodayUsed,
    aiDailyLimit,
    aiRemaining,
  });
}

