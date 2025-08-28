/**
 * 分析埋点配置（保留期、清理策略等）
 */

// 事件数据保留天数（默认 180 天）
export const EVENTS_RETENTION_DAYS = Number(process.env.ANALYTICS_EVENTS_RETENTION_DAYS || 180);

// 文章日聚合 PV 保留天数（默认 365 天）
export const VIEWS_RETENTION_DAYS = Number(process.env.ANALYTICS_VIEWS_RETENTION_DAYS || 365);

// 采集端点触发清理的采样概率（0-1），默认 2%
export const CLEANUP_SAMPLING = Math.max(0, Math.min(1, Number(process.env.ANALYTICS_CLEANUP_SAMPLING ?? 0.02)));

