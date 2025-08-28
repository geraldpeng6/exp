import { z } from 'zod';

/**
 * 数据验证模块
 * 使用 Zod 进行类型安全的数据验证
 * 防止无效数据进入系统
 */

// 用户ID验证规则
export const userIdSchema = z.string()
  .min(1, '用户ID不能为空')
  .max(100, '用户ID过长')
  .regex(/^[a-zA-Z0-9\-_]+$/, '用户ID只能包含字母、数字、连字符和下划线');

// 用户昵称验证规则
export const nicknameSchema = z.string()
  .min(1, '昵称不能为空')
  .max(50, '昵称不能超过50个字符')
  .trim()
  .refine(
    (val) => val.length > 0,
    '昵称不能只包含空格'
  );

// 头像种子验证规则（用于用户表）
export const avatarSeedSchema = z.string()
  .min(1, '头像种子不能为空')
  .max(100, '头像种子过长')
  .regex(/^[a-zA-Z0-9\-_]+$/, '头像种子格式无效');

// 头像链接验证规则（用于评论快照）
export const avatarUrlSchema = z.string()
  .url('头像链接必须为有效的 URL')
  .max(500, '头像链接过长')
  .refine((v) => /^https?:\/\//i.test(v), '仅支持 http/https 链接');

// 文章ID验证规则
export const articleIdSchema = z.string()
  .min(1, '文章ID不能为空')
  .max(200, '文章ID过长')
  .regex(/^[a-zA-Z0-9\-_\/\.]+$/, '文章ID格式无效');

// 评论内容验证规则
export const commentContentSchema = z.string()
  .min(1, '评论内容不能为空')
  .max(2000, '评论内容不能超过2000个字符')
  .trim()
  .refine(
    (val) => val.length > 0,
    '评论内容不能只包含空格'
  )
  .refine(
    (val) => !containsMaliciousContent(val),
    '评论内容包含不当内容'
  );

// 分页参数验证
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
});

// 用户创建数据验证
export const createUserSchema = z.object({
  id: userIdSchema,
  nickname: nicknameSchema,
  avatarSeed: avatarSeedSchema
});

// 用户更新数据验证
export const updateUserSchema = z.object({
  nickname: nicknameSchema.optional(),
  avatarSeed: avatarSeedSchema.optional(),
  activationPassword: z.string().min(6).max(200).optional()
}).refine(
  (data) => data.nickname !== undefined || data.avatarSeed !== undefined || data.activationPassword !== undefined,
  '至少需要提供一个更新字段'
);

// 评论创建数据验证
export const createCommentSchema = z.object({
  articleId: articleIdSchema,
  userId: userIdSchema,
  content: commentContentSchema,
  browserFingerprint: z.string().optional()
});

// 点赞数据验证
export const likeSchema = z.object({
  articleId: articleIdSchema,
  userId: userIdSchema
});

// 文章数据验证
export const articleSchema = z.object({
  id: articleIdSchema,
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200)
});

/**
 * 检查内容是否包含恶意内容
 * 简单的内容过滤，可以根据需要扩展
 */
function containsMaliciousContent(content: string): boolean {
  // 检查是否包含脚本标签
  const scriptPattern = /<script[\s\S]*?>[\s\S]*?<\/script>/gi;
  if (scriptPattern.test(content)) {
    return true;
  }
  
  // 检查是否包含 javascript: 协议
  const jsProtocolPattern = /javascript\s*:/gi;
  if (jsProtocolPattern.test(content)) {
    return true;
  }
  
  // 检查是否包含 on* 事件处理器
  const eventHandlerPattern = /\s+on\w+\s*=/gi;
  if (eventHandlerPattern.test(content)) {
    return true;
  }
  
  // 检查是否包含 data: 协议（可能的 XSS 向量）
  const dataProtocolPattern = /data\s*:\s*text\/html/gi;
  if (dataProtocolPattern.test(content)) {
    return true;
  }
  
  return false;
}

/**
 * 验证请求数据的通用函数
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
      return { success: false, error: errorMessage };
    }
    return { success: false, error: '数据验证失败' };
  }
}

/**
 * API 请求体验证中间件
 */
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (data: unknown) => {
    const result = validateData(schema, data);
    if (!result.success) {
      throw new Error(`验证失败: ${result.error}`);
    }
    return result.data;
  };
}
