import { getDatabase, withTransaction } from '../database/connection';
import { sanitizeComment } from '../security/sanitization';
import { validateData, createCommentSchema, userIdSchema, articleIdSchema, nicknameSchema, avatarUrlSchema } from '../security/validation';

/**
 * 评论服务
 * 处理评论的创建、查询、更新和删除
 * 包含完整的安全验证和数据清理
 */

export interface Comment {
  id: string;
  articleId: string;
  userId: string;
  nickname: string;        // 快照昵称
  avatarUrl: string;       // 快照头像链接
  content: string;
  browserFingerprint?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateCommentData {
  articleId: string;
  userId: string;
  nickname: string;        // 提交时的昵称快照
  avatarUrl: string;       // 提交时的头像链接快照
  content: string;
  browserFingerprint?: string;
}

export type CommentWithUser = Comment;

/**
 * 创建新评论（快照昵称与头像链接）
 */
export async function createComment(data: CreateCommentData): Promise<Comment> {
  // 基本字段验证
  const baseValidation = validateData(createCommentSchema, {
    articleId: data.articleId,
    userId: data.userId,
    content: data.content,
    browserFingerprint: data.browserFingerprint,
  });
  if (!baseValidation.success) {
    throw new Error(`数据验证失败: ${baseValidation.error}`);
  }

  // 快照字段验证
  const nickValidation = validateData(nicknameSchema, data.nickname);
  if (!nickValidation.success) {
    throw new Error(`昵称验证失败: ${nickValidation.error}`);
  }
  const avatarValidation = validateData(avatarUrlSchema, data.avatarUrl);
  if (!avatarValidation.success) {
    throw new Error(`头像链接验证失败: ${avatarValidation.error}`);
  }

  const { articleId, userId, content, browserFingerprint } = baseValidation.data;
  const snapshotNickname = data.nickname;
  const snapshotAvatarUrl = data.avatarUrl;

  // 清理评论内容
  const sanitizedContent = sanitizeComment(content);
  if (!sanitizedContent.trim()) {
    throw new Error('评论内容不能为空');
  }

  return withTransaction((db) => {
    // 确保用户存在（用于外键约束）
    const user = db.prepare(`
      SELECT id
      FROM users
      WHERE id = ?
    `).get(userId) as { id: string } | undefined;

    if (!user) {
      throw new Error('用户不存在');
    }

    // 确保文章存在（如果文章表中没有记录，则创建一个）
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

    // 创建评论（写入昵称与头像URL快照）
    const commentId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    db.prepare(`
      INSERT INTO comments (id, article_id, user_id, nickname, avatar_url, content, raw_content, browser_fingerprint, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(commentId, articleId, userId, snapshotNickname, snapshotAvatarUrl, sanitizedContent, content, browserFingerprint || null, now, now);

    // 返回创建的评论（直接读快照字段）
    const comment = db.prepare(`
      SELECT
        c.id,
        c.article_id as articleId,
        c.user_id as userId,
        COALESCE(c.nickname, '匿名用户') as nickname,
        COALESCE(c.avatar_url, '') as avatarUrl,
        c.content,
        c.browser_fingerprint as browserFingerprint,
        c.created_at as createdAt,
        c.updated_at as updatedAt
      FROM comments c
      WHERE c.id = ?
    `).get(commentId) as Comment;

    return comment;
  });
}

/**
 * 获取文章的评论列表（返回快照字段）
 */
export async function getCommentsByArticle(
  articleId: string,
  options: {
    page?: number;
    limit?: number;
    orderBy?: 'newest' | 'oldest';
  } = {}
): Promise<{
  comments: CommentWithUser[];
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

  const { page = 1, limit = 20, orderBy = 'newest' } = options;
  const offset = (page - 1) * limit;
  const orderClause = orderBy === 'newest' ? 'DESC' : 'ASC';

  const db = getDatabase();

  // 获取总数
  const totalResult = db.prepare(`
    SELECT COUNT(*) as count
    FROM comments
    WHERE article_id = ?
  `).get(articleId) as { count: number };

  const total = totalResult.count;
  const totalPages = Math.ceil(total / limit);

  // 获取评论列表（直接用快照字段，不再 JOIN users）
  const comments = db.prepare(`
    SELECT
      c.id,
      c.article_id as articleId,
      c.user_id as userId,
      COALESCE(c.nickname, '匿名用户') as nickname,
      COALESCE(c.avatar_url, '') as avatarUrl,
      c.content,
      c.browser_fingerprint as browserFingerprint,
      c.created_at as createdAt,
      c.updated_at as updatedAt
    FROM comments c
    WHERE c.article_id = ?
    ORDER BY c.created_at ${orderClause}
    LIMIT ? OFFSET ?
  `).all(articleId, limit, offset) as CommentWithUser[];

  return {
    comments,
    total,
    page,
    limit,
    totalPages
  };
}

/**
 * 获取全部评论列表（返回快照字段）
 */
export async function getAllComments(
  options: { page?: number; limit?: number; orderBy?: 'newest' | 'oldest' } = {}
): Promise<{
  comments: CommentWithUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const { page = 1, limit = 50, orderBy = 'newest' } = options;
  const offset = (page - 1) * limit;
  const orderClause = orderBy === 'newest' ? 'DESC' : 'ASC';

  const db = getDatabase();

  const totalResult = db.prepare(`
    SELECT COUNT(*) as count
    FROM comments
  `).get() as { count: number };

  const total = totalResult.count;
  const totalPages = Math.ceil(total / limit);

  const comments = db.prepare(`
    SELECT
      c.id,
      c.article_id as articleId,
      c.user_id as userId,
      COALESCE(c.nickname, '匿名用户') as nickname,
      COALESCE(c.avatar_url, '') as avatarUrl,
      c.content,
      c.browser_fingerprint as browserFingerprint,
      c.created_at as createdAt,
      c.updated_at as updatedAt
    FROM comments c
    ORDER BY c.created_at ${orderClause}
    LIMIT ? OFFSET ?
  `).all(limit, offset) as CommentWithUser[];

  return { comments, total, page, limit, totalPages };
}

/**
 * 获取用户的评论列表（返回快照字段）
 */
export async function getCommentsByUser(
  userId: string,
  options: {
    page?: number;
    limit?: number;
  } = {}
): Promise<{
  comments: Comment[];
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
    SELECT COUNT(*) as count
    FROM comments
    WHERE user_id = ?
  `).get(userId) as { count: number };

  const total = totalResult.count;
  const totalPages = Math.ceil(total / limit);

  // 获取评论列表（直接用快照字段）
  const comments = db.prepare(`
    SELECT
      c.id,
      c.article_id as articleId,
      c.user_id as userId,
      COALESCE(c.nickname, '匿名用户') as nickname,
      COALESCE(c.avatar_url, '') as avatarUrl,
      c.content,
      c.created_at as createdAt,
      c.updated_at as updatedAt
    FROM comments c
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, limit, offset) as Comment[];

  return {
    comments,
    total,
    page,
    limit,
    totalPages
  };
}

/**
 * 删除评论
 * 只有评论作者在发布后2分钟内且浏览器指纹匹配时可以删除
 */
export async function deleteComment(
  commentId: string,
  userId: string,
  browserFingerprint: string
): Promise<boolean> {
  // 验证输入
  const commentValidation = validateData(userIdSchema, commentId);
  const userValidation = validateData(userIdSchema, userId);

  if (!commentValidation.success || !userValidation.success) {
    throw new Error('参数验证失败');
  }

  if (!browserFingerprint) {
    throw new Error('浏览器指纹验证失败');
  }

  return withTransaction((db) => {
    // 检查评论是否存在、属于该用户、浏览器指纹匹配且在2分钟内
    const comment = db.prepare(`
      SELECT id, user_id, browser_fingerprint, created_at
      FROM comments
      WHERE id = ? AND user_id = ?
    `).get(commentId, userId) as {
      id: string;
      user_id: string;
      browser_fingerprint: string | null;
      created_at: number;
    } | undefined;

    if (!comment) {
      throw new Error('评论不存在或无权限删除');
    }

    // 验证浏览器指纹
    if (comment.browser_fingerprint !== browserFingerprint) {
      throw new Error('浏览器指纹验证失败，无法删除评论');
    }

    // 检查是否在2分钟内
    const now = Math.floor(Date.now() / 1000);
    const timeDiff = now - comment.created_at;
    const twoMinutes = 2 * 60; // 2分钟

    if (timeDiff > twoMinutes) {
      throw new Error('评论发布超过2分钟，无法删除');
    }

    // 删除评论
    const result = db.prepare(`
      DELETE FROM comments
      WHERE id = ? AND user_id = ?
    `).run(commentId, userId);

    return result.changes > 0;
  });
}

/**
 * 检查评论是否可以删除
 * 返回删除权限信息
 */
export async function canDeleteComment(
  commentId: string,
  userId: string,
  browserFingerprint: string
): Promise<{
  canDelete: boolean;
  reason?: string;
  timeLeft?: number;
}> {
  try {
    const db = getDatabase();

    const comment = db.prepare(`
      SELECT id, user_id, browser_fingerprint, created_at
      FROM comments
      WHERE id = ? AND user_id = ?
    `).get(commentId, userId) as {
      id: string;
      user_id: string;
      browser_fingerprint: string | null;
      created_at: number;
    } | undefined;

    if (!comment) {
      return { canDelete: false, reason: '评论不存在或无权限' };
    }

    // 验证浏览器指纹
    if (comment.browser_fingerprint !== browserFingerprint) {
      return { canDelete: false, reason: '浏览器指纹验证失败' };
    }

    // 检查时间限制
    const now = Math.floor(Date.now() / 1000);
    const timeDiff = now - comment.created_at;
    const twoMinutes = 2 * 60; // 2分钟

    if (timeDiff > twoMinutes) {
      return { canDelete: false, reason: '超过删除时限（2分钟）' };
    }

    const timeLeft = twoMinutes - timeDiff;
    return { canDelete: true, timeLeft };

  } catch {
    return { canDelete: false, reason: '检查权限时出错' };
  }
}

/**
 * 获取评论统计信息
 */
export async function getCommentStats(articleId?: string): Promise<{
  totalComments: number;
  commentsToday: number;
  commentsThisWeek: number;
  commentsThisMonth: number;
}> {
  const db = getDatabase();
  
  const now = Math.floor(Date.now() / 1000);
  const oneDayAgo = now - 24 * 60 * 60;
  const oneWeekAgo = now - 7 * 24 * 60 * 60;
  const oneMonthAgo = now - 30 * 24 * 60 * 60;
  
  const whereClause = articleId ? 'WHERE article_id = ?' : '';
  const params = articleId ? [articleId] : [];
  
  const totalResult = db.prepare(`
    SELECT COUNT(*) as count FROM comments ${whereClause}
  `).get(...params) as { count: number };
  
  const todayResult = db.prepare(`
    SELECT COUNT(*) as count FROM comments 
    ${whereClause} ${whereClause ? 'AND' : 'WHERE'} created_at >= ?
  `).get(...params, oneDayAgo) as { count: number };
  
  const weekResult = db.prepare(`
    SELECT COUNT(*) as count FROM comments 
    ${whereClause} ${whereClause ? 'AND' : 'WHERE'} created_at >= ?
  `).get(...params, oneWeekAgo) as { count: number };
  
  const monthResult = db.prepare(`
    SELECT COUNT(*) as count FROM comments 
    ${whereClause} ${whereClause ? 'AND' : 'WHERE'} created_at >= ?
  `).get(...params, oneMonthAgo) as { count: number };
  
  return {
    totalComments: totalResult.count,
    commentsToday: todayResult.count,
    commentsThisWeek: weekResult.count,
    commentsThisMonth: monthResult.count
  };
}
