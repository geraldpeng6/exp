import { getDatabase, withTransaction } from '../database/connection';
import { validateData, likeSchema, userIdSchema, articleIdSchema } from '../security/validation';

/**
 * 点赞服务
 * 处理文章点赞功能
 * 包含防重复点赞和数据统计功能
 */

export interface Like {
  id: number;
  articleId: string;
  userId: string;
  createdAt: number;
}

export interface LikeData {
  articleId: string;
  userId: string;
}

export interface LikeStatus {
  isLiked: boolean;
  totalLikes: number;
}

/**
 * 切换点赞状态
 * 如果用户已点赞则取消点赞，否则添加点赞
 */
export async function toggleLike(data: LikeData): Promise<{
  isLiked: boolean;
  totalLikes: number;
  action: 'liked' | 'unliked';
}> {
  // 验证输入数据
  const validation = validateData(likeSchema, data);
  if (!validation.success) {
    throw new Error(`数据验证失败: ${validation.error}`);
  }
  
  const { articleId, userId } = validation.data;
  
  return withTransaction((db) => {
    // 确保用户存在
    const user = db.prepare(`
      SELECT id FROM users WHERE id = ?
    `).get(userId);
    
    if (!user) {
      throw new Error('用户不存在');
    }
    
    // 确保文章存在（如果不存在则创建）
    const article = db.prepare(`
      SELECT id FROM articles WHERE id = ?
    `).get(articleId);
    
    if (!article) {
      // 自动创建文章记录
      db.prepare(`
        INSERT INTO articles (id, title, slug)
        VALUES (?, ?, ?)
      `).run(articleId, articleId, articleId);
    }
    
    // 检查是否已经点赞
    const existingLike = db.prepare(`
      SELECT id FROM likes 
      WHERE article_id = ? AND user_id = ?
    `).get(articleId, userId);
    
    let action: 'liked' | 'unliked';
    
    if (existingLike) {
      // 取消点赞
      db.prepare(`
        DELETE FROM likes 
        WHERE article_id = ? AND user_id = ?
      `).run(articleId, userId);
      action = 'unliked';
    } else {
      // 添加点赞
      const now = Math.floor(Date.now() / 1000);
      db.prepare(`
        INSERT INTO likes (article_id, user_id, created_at)
        VALUES (?, ?, ?)
      `).run(articleId, userId, now);
      action = 'liked';
    }
    
    // 获取最新的点赞统计
    const likeCount = db.prepare(`
      SELECT COUNT(*) as count FROM likes WHERE article_id = ?
    `).get(articleId) as { count: number };
    
    return {
      isLiked: action === 'liked',
      totalLikes: likeCount.count,
      action
    };
  });
}

/**
 * 获取文章的点赞状态
 */
export async function getLikeStatus(articleId: string, userId?: string): Promise<LikeStatus> {
  // 验证文章ID
  const validation = validateData(articleIdSchema, articleId);
  if (!validation.success) {
    throw new Error(`文章ID验证失败: ${validation.error}`);
  }
  
  const db = getDatabase();
  
  // 获取总点赞数
  const likeCount = db.prepare(`
    SELECT COUNT(*) as count FROM likes WHERE article_id = ?
  `).get(articleId) as { count: number };
  
  let isLiked = false;
  
  // 如果提供了用户ID，检查该用户是否已点赞
  if (userId) {
    const userValidation = validateData(userIdSchema, userId);
    if (userValidation.success) {
      const userLike = db.prepare(`
        SELECT id FROM likes 
        WHERE article_id = ? AND user_id = ?
      `).get(articleId, userId);
      
      isLiked = !!userLike;
    }
  }
  
  return {
    isLiked,
    totalLikes: likeCount.count
  };
}

/**
 * 获取文章的点赞列表
 */
export async function getLikesByArticle(
  articleId: string,
  options: {
    page?: number;
    limit?: number;
    includeUserInfo?: boolean;
  } = {}
): Promise<{
  likes: (Like & { user?: { nickname: string; avatarSeed: string } })[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  // 验证文章ID
  const validation = validateData(articleIdSchema, articleId);
  if (!validation.success) {
    throw new Error(`文章ID验证失败: ${validation.error}`);
  }
  
  const { page = 1, limit = 20, includeUserInfo = false } = options;
  const offset = (page - 1) * limit;
  
  const db = getDatabase();
  
  // 获取总数
  const totalResult = db.prepare(`
    SELECT COUNT(*) as count FROM likes WHERE article_id = ?
  `).get(articleId) as { count: number };
  
  const total = totalResult.count;
  const totalPages = Math.ceil(total / limit);
  
  // 构建查询
  let query = `
    SELECT 
      l.id,
      l.article_id as articleId,
      l.user_id as userId,
      l.created_at as createdAt
  `;
  
  if (includeUserInfo) {
    query += `,
      u.nickname,
      u.avatar_seed as avatarSeed
    FROM likes l
    JOIN users u ON l.user_id = u.id
    `;
  } else {
    query += `
    FROM likes l
    `;
  }
  
  query += `
    WHERE l.article_id = ?
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  type LikeWithUser = Like & { nickname?: string; avatarSeed?: string };
  const likes = db.prepare(query).all(articleId, limit, offset) as LikeWithUser[];
  
  return {
    likes,
    total,
    page,
    limit,
    totalPages
  };
}

/**
 * 获取用户的点赞列表
 */
export async function getLikesByUser(
  userId: string,
  options: {
    page?: number;
    limit?: number;
  } = {}
): Promise<{
  likes: Like[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  // 验证用户ID
  const validation = validateData(userIdSchema, userId);
  if (!validation.success) {
    throw new Error(`用户ID验证失败: ${validation.error}`);
  }
  
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;
  
  const db = getDatabase();
  
  // 获取总数
  const totalResult = db.prepare(`
    SELECT COUNT(*) as count FROM likes WHERE user_id = ?
  `).get(userId) as { count: number };
  
  const total = totalResult.count;
  const totalPages = Math.ceil(total / limit);
  
  // 获取点赞列表
  const likes = db.prepare(`
    SELECT 
      id,
      article_id as articleId,
      user_id as userId,
      created_at as createdAt
    FROM likes
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, limit, offset) as Like[];
  
  return {
    likes,
    total,
    page,
    limit,
    totalPages
  };
}

/**
 * 获取热门文章（按点赞数排序）
 */
export async function getPopularArticles(
  options: {
    limit?: number;
    timeRange?: 'day' | 'week' | 'month' | 'all';
  } = {}
): Promise<{
  articleId: string;
  likeCount: number;
}[]> {
  const { limit = 10, timeRange = 'all' } = options;
  
  const db = getDatabase();
  
  let timeFilter = '';
  const params: Array<string | number> = [];
  
  if (timeRange !== 'all') {
    const now = Math.floor(Date.now() / 1000);
    let timeAgo: number;
    
    switch (timeRange) {
      case 'day':
        timeAgo = now - 24 * 60 * 60;
        break;
      case 'week':
        timeAgo = now - 7 * 24 * 60 * 60;
        break;
      case 'month':
        timeAgo = now - 30 * 24 * 60 * 60;
        break;
      default:
        timeAgo = 0;
    }
    
    timeFilter = 'WHERE created_at >= ?';
    params.push(timeAgo);
  }
  
  params.push(limit);
  
  const articles = db.prepare(`
    SELECT 
      article_id as articleId,
      COUNT(*) as likeCount
    FROM likes
    ${timeFilter}
    GROUP BY article_id
    ORDER BY likeCount DESC
    LIMIT ?
  `).all(...params) as { articleId: string; likeCount: number }[];
  
  return articles;
}

/**
 * 获取热门文章（按 点赞数+评论数 排序）
 */
export async function getHotArticlesByEngagement(
  options: {
    limit?: number;
    timeRange?: 'day' | 'week' | 'month' | 'all';
  } = {}
): Promise<{
  articleId: string;
  likeCount: number;
  commentCount: number;
  total: number;
}[]> {
  const { limit = 10, timeRange = 'all' } = options;
  const db = getDatabase();

  let timeFilter = '';
  let timeFilterComments = '';
  const params: Array<string | number> = [];
  const params2: Array<string | number> = [];

  if (timeRange !== 'all') {
    const now = Math.floor(Date.now() / 1000);
    let timeAgo = 0;
    switch (timeRange) {
      case 'day':
        timeAgo = now - 24 * 60 * 60;
        break;
      case 'week':
        timeAgo = now - 7 * 24 * 60 * 60;
        break;
      case 'month':
        timeAgo = now - 30 * 24 * 60 * 60;
        break;
      default:
        timeAgo = 0;
    }
    timeFilter = 'WHERE created_at >= ?';
    timeFilterComments = 'WHERE created_at >= ?';
    params.push(timeAgo);
    params2.push(timeAgo);
  }

  const likesSub = db.prepare(`
    SELECT article_id AS articleId, COUNT(*) AS likeCount
    FROM likes
    ${timeFilter}
    GROUP BY article_id
  `).all(...params) as { articleId: string; likeCount: number }[];

  const commentsSub = db.prepare(`
    SELECT article_id AS articleId, COUNT(*) AS commentCount
    FROM comments
    ${timeFilterComments}
    GROUP BY article_id
  `).all(...params2) as { articleId: string; commentCount: number }[];

  // 合并：按 articleId 聚合
  const map = new Map<string, { articleId: string; likeCount: number; commentCount: number; total: number }>();
  for (const l of likesSub) {
    map.set(l.articleId, { articleId: l.articleId, likeCount: l.likeCount, commentCount: 0, total: l.likeCount });
  }
  for (const c of commentsSub) {
    const prev = map.get(c.articleId);
    if (prev) {
      prev.commentCount = c.commentCount;
      prev.total = prev.likeCount + c.commentCount;
      map.set(c.articleId, prev);
    } else {
      map.set(c.articleId, { articleId: c.articleId, likeCount: 0, commentCount: c.commentCount, total: c.commentCount });
    }
  }

  const merged = Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);

  return merged;
}

/**
 * 获取点赞统计信息
 */
export async function getLikeStats(articleId?: string): Promise<{
  totalLikes: number;
  likesToday: number;
  likesThisWeek: number;
  likesThisMonth: number;
  uniqueUsers: number;
}> {
  const db = getDatabase();
  
  const now = Math.floor(Date.now() / 1000);
  const oneDayAgo = now - 24 * 60 * 60;
  const oneWeekAgo = now - 7 * 24 * 60 * 60;
  const oneMonthAgo = now - 30 * 24 * 60 * 60;
  
  const whereClause = articleId ? 'WHERE article_id = ?' : '';
  const params = articleId ? [articleId] : [];
  
  const totalResult = db.prepare(`
    SELECT COUNT(*) as count FROM likes ${whereClause}
  `).get(...params) as { count: number };
  
  const todayResult = db.prepare(`
    SELECT COUNT(*) as count FROM likes 
    ${whereClause} ${whereClause ? 'AND' : 'WHERE'} created_at >= ?
  `).get(...params, oneDayAgo) as { count: number };
  
  const weekResult = db.prepare(`
    SELECT COUNT(*) as count FROM likes 
    ${whereClause} ${whereClause ? 'AND' : 'WHERE'} created_at >= ?
  `).get(...params, oneWeekAgo) as { count: number };
  
  const monthResult = db.prepare(`
    SELECT COUNT(*) as count FROM likes 
    ${whereClause} ${whereClause ? 'AND' : 'WHERE'} created_at >= ?
  `).get(...params, oneMonthAgo) as { count: number };
  
  const uniqueUsersResult = db.prepare(`
    SELECT COUNT(DISTINCT user_id) as count FROM likes ${whereClause}
  `).get(...params) as { count: number };
  
  return {
    totalLikes: totalResult.count,
    likesToday: todayResult.count,
    likesThisWeek: weekResult.count,
    likesThisMonth: monthResult.count,
    uniqueUsers: uniqueUsersResult.count
  };
}
