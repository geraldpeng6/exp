import { NextRequest, NextResponse } from 'next/server';
import { healthCheck, getDatabaseStats } from '@/lib/database/connection';
import { getRateLimitStats } from '@/lib/security/rate-limit';
import { getCommentStats } from '@/lib/services/comment-service';
import { getLikeStats } from '@/lib/services/like-service';

/**
 * 健康检查和系统统计 API
 * GET: 获取系统健康状态和统计信息
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('stats') === 'true';
    
    // 基础健康检查
    const isHealthy = healthCheck();
    
    const response: any = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    };
    
    // 如果请求包含统计信息
    if (includeStats) {
      try {
        // 数据库统计
        const dbStats = getDatabaseStats();
        
        // 评论统计
        const commentStats = await getCommentStats();
        
        // 点赞统计
        const likeStats = await getLikeStats();
        
        // 频率限制统计
        const rateLimitStats = getRateLimitStats();
        
        response.stats = {
          database: dbStats,
          comments: commentStats,
          likes: likeStats,
          rateLimit: rateLimitStats
        };
        
      } catch (error) {
        console.error('获取统计信息失败:', error);
        response.stats = {
          error: '获取统计信息失败'
        };
      }
    }
    
    // 如果系统不健康，返回 503 状态码
    const statusCode = isHealthy ? 200 : 503;
    
    return NextResponse.json(response, { status: statusCode });
    
  } catch (error) {
    console.error('健康检查失败:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : '健康检查失败'
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
