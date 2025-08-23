import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserById, updateUser, getUserStats } from '@/lib/services/user-service';
import { checkRateLimit, RATE_LIMIT_CONFIGS, getClientIp } from '@/lib/security/rate-limit';
import { validateData, createUserSchema, updateUserSchema, userIdSchema } from '@/lib/security/validation';

/**
 * 用户 API 路由
 * GET: 获取用户信息
 * POST: 创建新用户
 * PUT: 更新用户信息
 */

/**
 * 获取用户信息
 * 查询参数：
 * - userId: 用户ID（必需）
 * - includeStats: 是否包含统计信息（可选，默认false）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const includeStats = searchParams.get('includeStats') === 'true';
    
    if (!userId) {
      return NextResponse.json(
        { error: '缺少用户ID参数' },
        { status: 400 }
      );
    }
    
    // 频率限制检查
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(
      `${clientIp}:get-user`,
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
    
    // 获取用户信息
    const user = await getUserById(userId);
    
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }
    
    let result: any = { user };
    
    // 如果需要统计信息
    if (includeStats) {
      const stats = await getUserStats(userId);
      result.stats = stats;
    }
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('获取用户信息失败:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '获取用户信息失败',
        success: false 
      },
      { status: 500 }
    );
  }
}

/**
 * 创建新用户
 * 请求体：
 * - id: 用户ID
 * - nickname: 用户昵称
 * - avatarSeed: 头像种子
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 频率限制检查
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(
      `${clientIp}:create-user`,
      RATE_LIMIT_CONFIGS.USER_ACTION
    );
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: '操作过于频繁，请稍后再试',
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
    
    // 验证用户数据
    const validation = validateData(createUserSchema, body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: `数据验证失败: ${validation.error}`,
          success: false 
        },
        { status: 400 }
      );
    }
    
    // 创建用户
    const user = await createUser(validation.data);
    
    return NextResponse.json({
      success: true,
      data: user
    }, { status: 201 });
    
  } catch (error) {
    console.error('创建用户失败:', error);
    
    // 检查是否是验证错误或用户已存在错误
    if (error instanceof Error) {
      if (error.message.includes('验证失败') || error.message.includes('用户已存在')) {
        return NextResponse.json(
          { 
            error: error.message,
            success: false 
          },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '创建用户失败',
        success: false 
      },
      { status: 500 }
    );
  }
}

/**
 * 更新用户信息
 * 请求体：
 * - userId: 用户ID
 * - nickname: 新昵称（可选）
 * - avatarSeed: 新头像种子（可选）
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 频率限制检查
    const clientIp = getClientIp(request);
    const userId = body.userId || 'anonymous';
    
    const rateLimitResult = checkRateLimit(
      `${clientIp}:${userId}:update-user`,
      RATE_LIMIT_CONFIGS.USER_ACTION
    );
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: '操作过于频繁，请稍后再试',
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
    
    // 验证用户ID
    const userIdValidation = validateData(userIdSchema, body.userId);
    if (!userIdValidation.success) {
      return NextResponse.json(
        { 
          error: `用户ID验证失败: ${userIdValidation.error}`,
          success: false 
        },
        { status: 400 }
      );
    }
    
    // 验证更新数据
    const updateData = {
      nickname: body.nickname,
      avatarSeed: body.avatarSeed
    };
    
    const validation = validateData(updateUserSchema, updateData);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: `数据验证失败: ${validation.error}`,
          success: false 
        },
        { status: 400 }
      );
    }
    
    // 更新用户
    const user = await updateUser(userIdValidation.data, validation.data);
    
    return NextResponse.json({
      success: true,
      data: user
    });
    
  } catch (error) {
    console.error('更新用户失败:', error);
    
    // 检查是否是验证错误或用户不存在错误
    if (error instanceof Error) {
      if (error.message.includes('验证失败') || error.message.includes('用户不存在')) {
        return NextResponse.json(
          { 
            error: error.message,
            success: false 
          },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '更新用户失败',
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
