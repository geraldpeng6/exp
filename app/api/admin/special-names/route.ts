import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMIT_CONFIGS, getClientIp } from '@/lib/security/rate-limit';
import { validateData } from '@/lib/security/validation';
import { upsertRule, ensureSpecialNamesTable } from '@/lib/services/special-names-service';
import { getDatabase } from '@/lib/database/connection';
import { z } from 'zod';

// 验证管理员权限
async function validateAdmin(request: NextRequest) {
  const sessionCookie = request.cookies.get('session');
  if (!sessionCookie) return false;
  try {
    const { verifySession } = await import('@/lib/security/auth');
    const payload = await verifySession(sessionCookie.value);
    return payload?.role === 'admin';
  } catch {
    return false;
  }
}

const specialNameSchema = z.object({
  name: z.string().min(1).max(50),
  avatarUrl: z.string().url().max(500).refine((v) => /^https?:\/\//i.test(v), '仅支持 http/https 链接'),
  password: z.string().min(6).max(200).optional()
});

/**
 * 获取所有特殊昵称规则
 */
export async function GET(request: NextRequest) {
  try {
    // 局域网限制
    const ip = getClientIp(request);
    const { isLan } = await import('@/lib/security/ip');
    if (!isLan(ip)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // 验证管理员权限
    if (!(await validateAdmin(request))) {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 401 });
    }

    // 频率限制
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(
      `${clientIp}:admin-special-names`,
      RATE_LIMIT_CONFIGS.API_GENERAL
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    ensureSpecialNamesTable();
    const db = getDatabase();
    const rules = db.prepare(`
      SELECT
        name,
        avatar_url as avatarUrl,
        CASE WHEN pwd_hash IS NOT NULL THEN 1 ELSE 0 END as hasPassword,
        created_at as createdAt,
        updated_at as updatedAt
      FROM special_names
      ORDER BY created_at DESC
    `).all();

    return NextResponse.json({
      success: true,
      data: rules
    });

  } catch (error) {
    console.error('获取特殊昵称规则失败:', error);
    return NextResponse.json(
      { error: '获取规则失败' },
      { status: 500 }
    );
  }
}

/**
 * 创建或更新特殊昵称规则
 */
export async function POST(request: NextRequest) {
  try {
    // 局域网限制
    const ip = getClientIp(request);
    const { isLan } = await import('@/lib/security/ip');
    if (!isLan(ip)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // 验证管理员权限
    if (!(await validateAdmin(request))) {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 401 });
    }

    // 频率限制
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(
      `${clientIp}:admin-special-names-modify`,
      RATE_LIMIT_CONFIGS.USER_ACTION
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: '操作过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = validateData(specialNameSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { error: `数据验证失败: ${validation.error}` },
        { status: 400 }
      );
    }

    const { name, avatarUrl, password } = validation.data;

    // 创建或更新规则
    upsertRule(name, avatarUrl, password);

    return NextResponse.json({
      success: true,
      message: '规则保存成功'
    });

  } catch (error) {
    console.error('保存特殊昵称规则失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '保存规则失败' },
      { status: 500 }
    );
  }
}

/**
 * 删除特殊昵称规则
 */
export async function DELETE(request: NextRequest) {
  try {
    // 局域网限制
    const ip = getClientIp(request);
    const { isLan } = await import('@/lib/security/ip');
    if (!isLan(ip)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // 验证管理员权限
    if (!(await validateAdmin(request))) {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 401 });
    }

    // 频率限制
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(
      `${clientIp}:admin-special-names-delete`,
      RATE_LIMIT_CONFIGS.USER_ACTION
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: '操作过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json(
        { error: '缺少昵称参数' },
        { status: 400 }
      );
    }

    ensureSpecialNamesTable();
    const db = getDatabase();
    const result = db.prepare(`DELETE FROM special_names WHERE name = ?`).run(name);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: '规则不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '规则删除成功'
    });

  } catch (error) {
    console.error('删除特殊昵称规则失败:', error);
    return NextResponse.json(
      { error: '删除规则失败' },
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
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
