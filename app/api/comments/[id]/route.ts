import { NextRequest, NextResponse } from 'next/server';
import { deleteComment, canDeleteComment } from '@/lib/services/comment-service';
import { checkRateLimit, RATE_LIMIT_CONFIGS, getClientIp } from '@/lib/security/rate-limit';
import { validateData, userIdSchema } from '@/lib/security/validation';

/**
 * 删除评论 API
 * DELETE /api/comments/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;
    const body = await request.json();
    
    // 频率限制检查
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(
      `${clientIp}:delete-comment`,
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
    
    // 验证输入数据
    const { userId, browserFingerprint } = body;
    
    if (!userId || !browserFingerprint) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    const userValidation = validateData(userIdSchema, userId);
    if (!userValidation.success) {
      return NextResponse.json(
        { error: '用户ID格式无效' },
        { status: 400 }
      );
    }
    
    // 检查删除权限
    const permission = await canDeleteComment(commentId, userId, browserFingerprint);
    if (!permission.canDelete) {
      return NextResponse.json(
        { 
          error: permission.reason || '无权限删除此评论',
          canDelete: false 
        },
        { status: 403 }
      );
    }
    
    // 执行删除
    const success = await deleteComment(commentId, userId, browserFingerprint);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: '评论删除成功'
      });
    } else {
      return NextResponse.json(
        { error: '删除评论失败' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('删除评论失败:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '删除评论失败',
        success: false 
      },
      { status: 500 }
    );
  }
}

/**
 * 检查评论删除权限 API
 * GET /api/comments/[id]?action=check-delete&userId=xxx&fingerprint=xxx
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action !== 'check-delete') {
      return NextResponse.json(
        { error: '不支持的操作' },
        { status: 400 }
      );
    }
    
    const userId = searchParams.get('userId');
    const browserFingerprint = searchParams.get('fingerprint');
    
    if (!userId || !browserFingerprint) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    // 频率限制检查
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(
      `${clientIp}:check-delete`,
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
    
    // 检查删除权限
    const permission = await canDeleteComment(commentId, userId, browserFingerprint);
    
    return NextResponse.json({
      success: true,
      data: permission
    });
    
  } catch (error) {
    console.error('检查删除权限失败:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '检查权限失败',
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
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
