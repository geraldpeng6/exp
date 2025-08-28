/**
 * 频率限制模块
 * 防止恶意请求和滥用
 * 使用内存存储实现简单的频率限制
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// 内存存储的频率限制数据
const rateLimitStore = new Map<string, RateLimitEntry>();

// 频率限制配置
export interface RateLimitConfig {
  windowMs: number;    // 时间窗口（毫秒）
  maxRequests: number; // 最大请求次数
  keyGenerator?: (identifier: string) => string; // 自定义键生成器
}

// 预定义的频率限制配置
export const RATE_LIMIT_CONFIGS = {
  // 评论频率限制：每分钟最多5条评论
  COMMENT: {
    windowMs: 60 * 1000,
    maxRequests: 5
  },
  
  // 点赞频率限制：每分钟最多20次点赞
  LIKE: {
    windowMs: 60 * 1000,
    maxRequests: 20
  },
  
  // 用户操作频率限制：每分钟最多10次操作
  USER_ACTION: {
    windowMs: 60 * 1000,
    maxRequests: 10
  },
  
  // API 通用频率限制：每分钟最多100次请求
  API_GENERAL: {
    windowMs: 60 * 1000,
    maxRequests: 100
  },
  
  // 严格限制：每小时最多10次操作（用于敏感操作）
  STRICT: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 10
  }
} as const;

/**
 * 检查是否超过频率限制
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
} {
  const now = Date.now();
  const key = config.keyGenerator ? config.keyGenerator(identifier) : identifier;
  
  // 清理过期的条目
  cleanupExpiredEntries(now);
  
  const entry = rateLimitStore.get(key);
  const resetTime = now + config.windowMs;
  
  if (!entry || now >= entry.resetTime) {
    // 新的时间窗口或首次请求
    rateLimitStore.set(key, {
      count: 1,
      resetTime
    });
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime
    };
  }
  
  if (entry.count >= config.maxRequests) {
    // 超过限制
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000)
    };
  }
  
  // 增加计数
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime
  };
}

/**
 * 清理过期的频率限制条目
 */
function cleanupExpiredEntries(now: number): void {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * 重置特定标识符的频率限制
 */
export function resetRateLimit(identifier: string, config?: RateLimitConfig): void {
  const key = config?.keyGenerator ? config.keyGenerator(identifier) : identifier;
  rateLimitStore.delete(key);
}

/**
 * 获取当前频率限制状态
 */
export function getRateLimitStatus(
  identifier: string,
  config: RateLimitConfig
): {
  count: number;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const key = config.keyGenerator ? config.keyGenerator(identifier) : identifier;
  const entry = rateLimitStore.get(key);
  
  if (!entry || now >= entry.resetTime) {
    return {
      count: 0,
      remaining: config.maxRequests,
      resetTime: now + config.windowMs
    };
  }
  
  return {
    count: entry.count,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.resetTime
  };
}

/**
 * 创建基于 IP 地址的频率限制键
 */
export function createIpBasedKey(action: string) {
  return (ip: string) => `ip:${ip}:${action}`;
}

/**
 * 创建基于用户 ID 的频率限制键
 */
export function createUserBasedKey(action: string) {
  return (userId: string) => `user:${userId}:${action}`;
}

/**
 * 创建组合键（IP + 用户 ID）
 */
export function createCombinedKey(action: string) {
  return (identifier: string) => {
    const [ip, userId] = identifier.split('|');
    return `combined:${ip}:${userId}:${action}`;
  };
}

/**
 * 频率限制中间件工厂
 */
export function createRateLimitMiddleware<Req = { headers?: Record<string, string | string[] | undefined> }>(
  config: RateLimitConfig,
  getIdentifier: (req: Req) => string
) {
  return (req: Req) => {
    const identifier = getIdentifier(req);
    const result = checkRateLimit(identifier, config);

    if (!result.allowed) {
      const error = new Error('请求过于频繁，请稍后再试');
      (error as unknown as { statusCode?: number }).statusCode = 429;
      (error as unknown as { retryAfter?: number }).retryAfter = result.retryAfter;
      throw error;
    }

    return result;
  };
}

/**
 * 获取客户端 IP 地址
 */
export type HeadersLike = Headers | Record<string, string | string[] | undefined>;

export function getClientIp(req: { headers?: HeadersLike; connection?: { remoteAddress?: string | null }; socket?: { remoteAddress?: string | null }; ip?: string | null } | { headers?: HeadersLike }): string {
  const headers: HeadersLike | undefined = (req as { headers?: HeadersLike }).headers;

  const getHeader = (name: string): string | undefined => {
    if (!headers) return undefined;
    if (headers instanceof Headers) {
      return headers.get(name) || undefined;
    }
    const v = headers[name.toLowerCase()] ?? headers[name];
    if (Array.isArray(v)) return v[0];
    return v as string | undefined;
  };

  const forwarded = getHeader('x-forwarded-for');
  const realIp = getHeader('x-real-ip');
  const cfConnectingIp = getHeader('cf-connecting-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIp) return realIp;
  if (cfConnectingIp) return cfConnectingIp;

  const fallback = (req as { connection?: { remoteAddress?: string | null }; socket?: { remoteAddress?: string | null }; ip?: string | null });
  return fallback.connection?.remoteAddress || fallback.socket?.remoteAddress || fallback.ip || 'unknown';
}

/**
 * 清理所有频率限制数据
 * 主要用于测试或重置
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * 获取频率限制统计信息
 */
export function getRateLimitStats(): {
  totalEntries: number;
  activeEntries: number;
  expiredEntries: number;
} {
  const now = Date.now();
  let activeEntries = 0;
  let expiredEntries = 0;
  
  for (const entry of rateLimitStore.values()) {
    if (now >= entry.resetTime) {
      expiredEntries++;
    } else {
      activeEntries++;
    }
  }
  
  return {
    totalEntries: rateLimitStore.size,
    activeEntries,
    expiredEntries
  };
}
