/**
 * 事件数据校验与归一化（服务端）
 * - 职责：对客户端上报的埋点数据进行严格类型检查、长度限制、格式规范
 * - 目标：
 *   1) 防止异常/恶意数据污染数据库
 *   2) 保持字段一致性，便于后续聚合分析
 *   3) 降低大字段（payload/ref/utm）对存储与查询的影响
 */

export type RawEvent = {
  ts?: unknown;
  fp?: unknown;
  path?: unknown;
  ref?: unknown;
  utm?: unknown;
  type?: unknown;
  payload?: unknown;
};

export type SanitizedEvent = {
  ts: number;              // 秒级 UTC 时间戳
  fp: string | null;       // 浏览器指纹（可空）
  path: string | null;     // 路径（/foo），可空
  ref: string | null;      // 来源 URL（或上一个 pathname），可空
  utm: string | null;      // 查询参数（"?a=b" 形式），可空
  type: 'pv' | 'click' | 'stay' | 'scroll' | 'custom';
  payload: string;         // 统一字符串（JSON 字符串或原始短文本）
};

// 通用限制（生产可按需调整）
const MAX_PATH = 256;
const MAX_REF = 512;
const MAX_UTM = 512;
const MAX_PAYLOAD = 1024;

function asString(x: unknown): string | null {
  if (typeof x === 'string') return x;
  return null;
}

function clampLen(s: string | null, max: number): string | null {
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

function normPath(p: string | null): string | null {
  if (!p) return null;
  const s = p.trim();
  if (!s) return null;
  // 仅允许以 / 开头的站内路径
  if (!s.startsWith('/')) return null;
  // 去除 hash 片段
  const noHash = s.split('#')[0];
  return clampLen(noHash, MAX_PATH);
}

function normRef(r: string | null): string | null {
  if (!r) return null;
  const s = r.trim();
  if (!s) return null;
  return clampLen(s, MAX_REF);
}

function normUtm(u: string | null): string | null {
  if (!u) return null;
  const s = u.trim();
  if (!s) return null;
  // 允许形如 "?a=b" 或 "a=b" 的查询串
  return clampLen(s, MAX_UTM);
}

function normPayload(x: unknown): string {
  if (typeof x === 'string') return clampLen(x, MAX_PAYLOAD) || '';
  try {
    const j = JSON.stringify(x ?? {});
    return clampLen(j, MAX_PAYLOAD) || '';
  } catch {
    return '';
  }
}

function normTs(x: unknown): number {
  // 接收毫秒/秒，统一为秒
  const n = Number(x);
  if (!Number.isFinite(n) || n <= 0) return Math.floor(Date.now() / 1000);
  return n > 1_000_000_000_000 ? Math.floor(n / 1000) : Math.floor(n);
}

function normType(x: unknown): SanitizedEvent['type'] | null {
  const s = asString(x)?.toLowerCase();
  switch (s) {
    case 'pv':
    case 'click':
    case 'stay':
    case 'scroll':
    case 'custom':
      return s;
    default:
      return null;
  }
}

/**
 * 将原始事件转换为规范化事件；若非法则返回 null
 */
export function sanitizeEvent(raw: RawEvent): SanitizedEvent | null {
  const type = normType(raw.type);
  if (!type) return null;

  const ts = normTs(raw.ts);
  const fp = clampLen(asString(raw.fp), 128);
  const path = normPath(asString(raw.path));
  const ref = normRef(asString(raw.ref));
  const utm = normUtm(asString(raw.utm));
  const payload = normPayload(raw.payload);

  return { ts, fp: fp || null, path, ref, utm, type, payload };
}

