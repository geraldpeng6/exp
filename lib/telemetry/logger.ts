import { NextRequest } from 'next/server';

export function genRequestId(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getRequestId(req: NextRequest | Request): string {
  const h: Headers | undefined = (req as NextRequest).headers || (req as Request).headers;
  const rid = h?.get('x-request-id') || '';
  return rid || genRequestId();
}

type LogLevel = 'info' | 'warn' | 'error';

function jsonLog(level: LogLevel, msg: string, meta: Record<string, unknown> = {}) {
  const line = {
    // 统一日志时间为 UTC 秒整数，前端显示再本地化
    t: Math.floor(Date.now() / 1000),
    level,
    msg,
    ...meta,
  };
  // 输出一行 JSON，便于后续收集
  console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](JSON.stringify(line));
}

export function createLogger(reqId?: string, extra: Record<string, unknown> = {}) {
  const base = { reqId, ...extra };
  return {
    info: (msg: string, meta: Record<string, unknown> = {}) => jsonLog('info', msg, { ...base, ...meta }),
    warn: (msg: string, meta: Record<string, unknown> = {}) => jsonLog('warn', msg, { ...base, ...meta }),
    error: (msg: string, meta: Record<string, unknown> = {}) => jsonLog('error', msg, { ...base, ...meta }),
  };
}

