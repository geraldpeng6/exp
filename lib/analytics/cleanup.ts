import { getDatabase } from '@/lib/database/connection';
import { CLEANUP_SAMPLING, EVENTS_RETENTION_DAYS, VIEWS_RETENTION_DAYS } from './config';

/**
 * 轻量清理：随机小概率在采集接口被调用时触发
 * - 删除过期 events
 * - 删除过期 article_views（按 day_start_utc）
 */
export function maybeCleanup() {
  try {
    if (Math.random() > CLEANUP_SAMPLING) return;
    const db = getDatabase();
    const nowSec = Math.floor(Date.now() / 1000);
    const evSince = nowSec - EVENTS_RETENTION_DAYS * 86400;
    const daySince = nowSec - VIEWS_RETENTION_DAYS * 86400;

    db.exec(`DELETE FROM events WHERE ts < ${evSince};`);
    db.exec(`DELETE FROM article_views WHERE day_start_utc < ${Math.floor(daySince / 86400) * 86400};`);
  } catch {
    // 忽略清理错误
  }
}

