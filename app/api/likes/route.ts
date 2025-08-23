import { NextRequest, NextResponse } from 'next/server';
import { toggleLike, getLikeStatus } from '@/lib/services/like-service';
import { getOrCreateUser } from '@/lib/services/user-service';
import { checkRateLimit, RATE_LIMIT_CONFIGS, getClientIp } from '@/lib/security/rate-limit';
import { validateData, likeSchema } from '@/lib/security/validation';

/**
 * 点赞 API 路由
 * GET: 获取文章点赞状态
 * POST: 切换点赞状态
 */

/**
 * 获取点赞状态
 * 查询参数：
 * - articleId: 文章ID（必需）
 * - userId: 用户ID（可选，用于检查用户是否已点赞）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');
    const userId = searchParams.get('userId');
    
    if (!articleId) {
      return NextResponse.json(
        { success: false, error: '缺少文章ID参数' },
        { status: 400 }
      );
    }
    
    // 频率限制检查
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(
      `${clientIp}:get-likes`,
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
    
    // 获取点赞状态
    const likeStatus = await getLikeStatus(articleId, userId || undefined);
    
    return NextResponse.json({
      success: true,
      data: likeStatus
    });
    
  } catch (error) {
    console.error('获取点赞状态失败:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '获取点赞状态失败',
        success: false 
      },
      { status: 500 }
    );
  }
}

/**
 * 切换点赞状态
 * 请求体：
 * - articleId: 文章ID
 * - userId: 用户ID
 * - nickname: 用户昵称（用于创建用户，如果用户不存在）
 * - avatarSeed: 头像种子（用于创建用户，如果用户不存在）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 频率限制检查
    const clientIp = getClientIp(request);
    const userId = body.userId || 'anonymous';
    
    // 使用点赞专用的频率限制
    const rateLimitResult = checkRateLimit(
      `${clientIp}:${userId}:like`,
      RATE_LIMIT_CONFIGS.LIKE
    );
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: '点赞过于频繁，请稍后再试',
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
    
    // 验证点赞数据
    const validation = validateData(likeSchema, {
      articleId: body.articleId,
      userId: body.userId
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
    
    const { articleId, userId: validatedUserId } = validation.data;
    
    // 确保用户存在（如果不存在则创建）
    if (body.nickname && body.avatarSeed) {
      await getOrCreateUser({
        id: validatedUserId,
        nickname: body.nickname,
        avatarSeed: body.avatarSeed
      });
    }
    
    // 切换点赞状态
    const result = await toggleLike({
      articleId,
      userId: validatedUserId
    });
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('切换点赞状态失败:', error);
    
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
        error: error instanceof Error ? error.message : '切换点赞状态失败',
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
