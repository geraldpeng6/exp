import { getDatabase, withTransaction } from '../database/connection';
import { sanitizeNickname } from '../security/sanitization';
import { validateData, createUserSchema, updateUserSchema, userIdSchema } from '../security/validation';

/**
 * 用户服务
 * 处理用户的创建、查询和更新
 * 管理匿名用户身份信息
 */

export interface User {
  id: string;
  nickname: string;
  avatarSeed: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateUserData {
  id: string;
  nickname: string;
  avatarSeed: string;
}

export interface UpdateUserData {
  nickname?: string;
  avatarSeed?: string;
}

/**
 * 创建新用户
 */
export async function createUser(data: CreateUserData): Promise<User> {
  // 验证输入数据
  const validation = validateData(createUserSchema, data);
  if (!validation.success) {
    throw new Error(`数据验证失败: ${validation.error}`);
  }
  
  const { id, nickname, avatarSeed } = validation.data;
  
  // 清理昵称
  const sanitizedNickname = sanitizeNickname(nickname);
  if (!sanitizedNickname.trim()) {
    throw new Error('昵称不能为空');
  }
  
  return withTransaction((db) => {
    // 检查用户是否已存在
    const existingUser = db.prepare(`
      SELECT id FROM users WHERE id = ?
    `).get(id);
    
    if (existingUser) {
      throw new Error('用户已存在');
    }
    
    // 创建用户
    const now = Math.floor(Date.now() / 1000);
    
    db.prepare(`
      INSERT INTO users (id, nickname, avatar_seed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, sanitizedNickname, avatarSeed, now, now);
    
    // 返回创建的用户
    const user = db.prepare(`
      SELECT 
        id,
        nickname,
        avatar_seed as avatarSeed,
        created_at as createdAt,
        updated_at as updatedAt
      FROM users
      WHERE id = ?
    `).get(id) as User;
    
    return user;
  });
}

/**
 * 获取用户信息
 */
export async function getUserById(userId: string): Promise<User | null> {
  // 验证用户ID
  const validation = validateData(userIdSchema, userId);
  if (!validation.success) {
    throw new Error(`用户ID验证失败: ${validation.error}`);
  }
  
  const db = getDatabase();
  
  const user = db.prepare(`
    SELECT 
      id,
      nickname,
      avatar_seed as avatarSeed,
      created_at as createdAt,
      updated_at as updatedAt
    FROM users
    WHERE id = ?
  `).get(userId) as User | undefined;
  
  return user || null;
}

/**
 * 更新用户信息
 */
export async function updateUser(userId: string, data: UpdateUserData): Promise<User> {
  // 验证用户ID
  const userValidation = validateData(userIdSchema, userId);
  if (!userValidation.success) {
    throw new Error(`用户ID验证失败: ${userValidation.error}`);
  }
  
  // 验证更新数据
  const dataValidation = validateData(updateUserSchema, data);
  if (!dataValidation.success) {
    throw new Error(`数据验证失败: ${dataValidation.error}`);
  }
  
  const updateData = dataValidation.data;
  
  // 清理昵称（如果提供）
  if (updateData.nickname) {
    const sanitizedNickname = sanitizeNickname(updateData.nickname);
    if (!sanitizedNickname.trim()) {
      throw new Error('昵称不能为空');
    }
    updateData.nickname = sanitizedNickname;
  }
  
  return withTransaction((db) => {
    // 检查用户是否存在
    const existingUser = db.prepare(`
      SELECT id FROM users WHERE id = ?
    `).get(userId);
    
    if (!existingUser) {
      throw new Error('用户不存在');
    }
    
    // 构建更新查询
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    
    if (updateData.nickname !== undefined) {
      updateFields.push('nickname = ?');
      updateValues.push(updateData.nickname);
    }
    
    if (updateData.avatarSeed !== undefined) {
      updateFields.push('avatar_seed = ?');
      updateValues.push(updateData.avatarSeed);
    }
    
    if (updateFields.length === 0) {
      throw new Error('没有提供更新字段');
    }
    
    // 添加 updated_at 字段
    updateFields.push('updated_at = ?');
    updateValues.push(Math.floor(Date.now() / 1000));
    
    // 添加 WHERE 条件
    updateValues.push(userId);
    
    // 执行更新
    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;
    
    const result = db.prepare(updateQuery).run(...updateValues);
    
    if (result.changes === 0) {
      throw new Error('更新失败');
    }
    
    // 返回更新后的用户信息
    const updatedUser = db.prepare(`
      SELECT 
        id,
        nickname,
        avatar_seed as avatarSeed,
        created_at as createdAt,
        updated_at as updatedAt
      FROM users
      WHERE id = ?
    `).get(userId) as User;
    
    return updatedUser;
  });
}

/**
 * 获取或创建用户
 * 如果用户不存在则自动创建
 */
export async function getOrCreateUser(data: CreateUserData): Promise<User> {
  // 先尝试获取用户
  const existingUser = await getUserById(data.id);
  if (existingUser) {
    return existingUser;
  }
  
  // 用户不存在，创建新用户
  return createUser(data);
}

/**
 * 删除用户
 * 注意：这会级联删除用户的所有评论和点赞
 */
export async function deleteUser(userId: string): Promise<boolean> {
  // 验证用户ID
  const validation = validateData(userIdSchema, userId);
  if (!validation.success) {
    throw new Error(`用户ID验证失败: ${validation.error}`);
  }
  
  return withTransaction((db) => {
    // 检查用户是否存在
    const existingUser = db.prepare(`
      SELECT id FROM users WHERE id = ?
    `).get(userId);
    
    if (!existingUser) {
      return false;
    }
    
    // 删除用户（外键约束会自动删除相关的评论和点赞）
    const result = db.prepare(`
      DELETE FROM users WHERE id = ?
    `).run(userId);
    
    return result.changes > 0;
  });
}

/**
 * 获取用户统计信息
 */
export async function getUserStats(userId: string): Promise<{
  commentCount: number;
  likeCount: number;
  joinedAt: number;
  lastActivity: number;
}> {
  // 验证用户ID
  const validation = validateData(userIdSchema, userId);
  if (!validation.success) {
    throw new Error(`用户ID验证失败: ${validation.error}`);
  }
  
  const db = getDatabase();
  
  // 获取用户基本信息
  const user = db.prepare(`
    SELECT created_at, updated_at FROM users WHERE id = ?
  `).get(userId) as { created_at: number; updated_at: number } | undefined;
  
  if (!user) {
    throw new Error('用户不存在');
  }
  
  // 获取评论数量
  const commentCount = db.prepare(`
    SELECT COUNT(*) as count FROM comments WHERE user_id = ?
  `).get(userId) as { count: number };
  
  // 获取点赞数量
  const likeCount = db.prepare(`
    SELECT COUNT(*) as count FROM likes WHERE user_id = ?
  `).get(userId) as { count: number };
  
  // 获取最后活动时间（最近的评论或点赞时间）
  const lastCommentTime = db.prepare(`
    SELECT MAX(created_at) as time FROM comments WHERE user_id = ?
  `).get(userId) as { time: number | null };
  
  const lastLikeTime = db.prepare(`
    SELECT MAX(created_at) as time FROM likes WHERE user_id = ?
  `).get(userId) as { time: number | null };
  
  const lastActivity = Math.max(
    lastCommentTime.time || 0,
    lastLikeTime.time || 0,
    user.updated_at
  );
  
  return {
    commentCount: commentCount.count,
    likeCount: likeCount.count,
    joinedAt: user.created_at,
    lastActivity
  };
}

/**
 * 搜索用户
 */
export async function searchUsers(
  query: string,
  options: {
    page?: number;
    limit?: number;
  } = {}
): Promise<{
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;
  
  // 清理搜索查询
  const sanitizedQuery = sanitizeNickname(query).trim();
  if (!sanitizedQuery) {
    return {
      users: [],
      total: 0,
      page,
      limit,
      totalPages: 0
    };
  }
  
  const db = getDatabase();
  const searchPattern = `%${sanitizedQuery}%`;
  
  // 获取总数
  const totalResult = db.prepare(`
    SELECT COUNT(*) as count FROM users 
    WHERE nickname LIKE ?
  `).get(searchPattern) as { count: number };
  
  const total = totalResult.count;
  const totalPages = Math.ceil(total / limit);
  
  // 获取用户列表
  const users = db.prepare(`
    SELECT 
      id,
      nickname,
      avatar_seed as avatarSeed,
      created_at as createdAt,
      updated_at as updatedAt
    FROM users
    WHERE nickname LIKE ?
    ORDER BY nickname
    LIMIT ? OFFSET ?
  `).all(searchPattern, limit, offset) as User[];
  
  return {
    users,
    total,
    page,
    limit,
    totalPages
  };
}
