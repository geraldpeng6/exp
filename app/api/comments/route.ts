import { NextRequest, NextResponse } from 'next/server';
import { createComment, getCommentsByArticle } from '@/lib/services/comment-service';
import { getOrCreateUser } from '@/lib/services/user-service';
import { checkRateLimit, RATE_LIMIT_CONFIGS, getClientIp } from '@/lib/security/rate-limit';
import { validateData, createCommentSchema, nicknameSchema, avatarUrlSchema } from '@/lib/security/validation';

/**
 * 评论 API 路由
 * GET: 获取文章评论列表
 * POST: 创建新评论
 */

/**
 * 获取评论列表
 * 查询参数：
 * - articleId: 文章ID（必需）
 * - page: 页码（可选，默认1）
 * - limit: 每页数量（可选，默认20）
 * - orderBy: 排序方式（可选，newest/oldest，默认newest）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // 限制最大50条
    const orderBy = searchParams.get('orderBy') as 'newest' | 'oldest' || 'newest';
    
    if (!articleId) {
      return NextResponse.json(
        { success: false, error: '缺少文章ID参数' },
        { status: 400 }
      );
    }
    
    // 频率限制检查
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(
      `${clientIp}:get-comments`,
      RATE_LIMIT_CONFIGS.API_GENERAL
    );
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: '请求过于频繁，请稍后再试',
          retryAfter: rateLimitResult.retryAfter 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
          }
        }
      );
    }
    
    // 获取评论列表
    const result = await getCommentsByArticle(articleId, {
      page,
      limit,
      orderBy
    });
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('获取评论列表失败:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '获取评论列表失败',
        success: false 
      },
      { status: 500 }
    );
  }
}

/**
 * 创建新评论（快照模式）
 * 请求体：
 * - articleId: 文章ID
 * - userId: 用户ID
 * - nickname: 用户昵称（快照）
 * - avatarUrl: 头像链接（快照）
 * - content: 评论内容
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 频率限制检查
    const clientIp = getClientIp(request);
    const userId = body.userId || 'anonymous';
    
    // 使用更严格的评论频率限制
    const rateLimitResult = checkRateLimit(
      `${clientIp}:${userId}:comment`,
      RATE_LIMIT_CONFIGS.COMMENT
    );
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: '评论过于频繁，请稍后再试',
          retryAfter: rateLimitResult.retryAfter 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
          }
        }
      );
    }
    
    // 验证评论数据
    const validation = validateData(createCommentSchema, {
      articleId: body.articleId,
      userId: body.userId,
      content: body.content,
      browserFingerprint: body.browserFingerprint
    });
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: `数据验证失败: ${validation.error}`,
          success: false 
        },
        { status: 400 }
      );
    }
    
    const { articleId, userId: validatedUserId, content, browserFingerprint } = validation.data;

    // 验证快照字段
    const nickCheck = validateData(nicknameSchema, body.nickname);
    const avatarUrlCheck = validateData(avatarUrlSchema, body.avatarUrl);
    if (!nickCheck.success || !avatarUrlCheck.success) {
      const message = !nickCheck.success ? nickCheck.error : avatarUrlCheck.success ? '' : avatarUrlCheck.error;
      return NextResponse.json(
        {
          error: `数据验证失败: ${message}`,
          success: false
        },
        { status: 400 }
      );
    }

    // 确保用户存在（如果不存在则创建），但评论表使用快照字段
    await getOrCreateUser({
      id: validatedUserId,
      nickname: body.nickname,
      avatarSeed: 'snapshot' // 此字段仅用于初始化用户占位，实际展示依赖评论快照
    });

    // 创建评论（带快照字段）
    const comment = await createComment({
      articleId,
      userId: validatedUserId,
      nickname: body.nickname,
      avatarUrl: body.avatarUrl,
      content,
      browserFingerprint
    });
    
    return NextResponse.json({
      success: true,
      data: comment
    }, { status: 201 });
    
  } catch (error) {
    console.error('创建评论失败:', error);
    
    // 检查是否是验证错误
    if (error instanceof Error && error.message.includes('验证失败')) {
      return NextResponse.json(
        { 
          error: error.message,
          success: false 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '创建评论失败',
        success: false 
      },
      { status: 500 }
    );
  }
}

/**
 * 处理 OPTIONS 请求（CORS 预检）
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
