/**
 * AI 接口全站级日配额控制（基于 UTC 自然日）
 * - 将每日用量存储在 SQLite 表 ai_usage(day_start_utc, count)
 * - 在每次请求前调用 checkAndConsumeDailyAiQuota()，超过阈值则拒绝
 */

import { withTransaction, getDatabase } from '@/lib/database/connection';

// 默认全站每日 AI 请求上限（可通过环境变量覆盖）
export const DAILY_AI_LIMIT = Number(process.env.DAILY_AI_LIMIT || 100);

/**
 * 获取当前 UTC 自然日的起始秒级时间戳
 */
export function getUtcDayStart(nowSec?: number): number {
  const s = typeof nowSec === 'number' ? nowSec : Math.floor(Date.now() / 1000);
  return s - (s % 86400);
}

/**
 * 检查并消耗 1 次 AI 配额（原子性）
 * 成功返回 { allowed: true, remaining }；超限返回 { allowed: false, remaining: 0 }
 */
export function checkAndConsumeDailyAiQuota(limit = DAILY_AI_LIMIT): { allowed: boolean; remaining: number } {
  const day = getUtcDayStart();
  return withTransaction((db) => {
    // 确保表存在（容错，正常应由迁移创建）
    try {
      db.exec(`CREATE TABLE IF NOT EXISTS ai_usage (day_start_utc INTEGER PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0);`);
    } catch {}

    const row = db.prepare(`SELECT count FROM ai_usage WHERE day_start_utc = ?`).get(day) as { count?: number } | undefined;
    const cur = Number(row?.count || 0);
    if (cur >= limit) {
      return { allowed: false, remaining: 0 };
    }
    const next = cur + 1;
    if (row) {
      db.prepare(`UPDATE ai_usage SET count = ? WHERE day_start_utc = ?`).run(next, day);
    } else {
      db.prepare(`INSERT INTO ai_usage (day_start_utc, count) VALUES (?, ?)`).run(day, 1);
    }
    return { allowed: true, remaining: Math.max(0, limit - next) };
  });
}

/**
 * 获取今日用量（便于调试/展示）
 */
export function getTodayAiUsage(): { day_start_utc: number; count: number } {
  const db = getDatabase();
  const day = getUtcDayStart();
  const row = db.prepare(`SELECT count FROM ai_usage WHERE day_start_utc = ?`).get(day) as { count?: number } | undefined;
  return { day_start_utc: day, count: Number(row?.count || 0) };
}

