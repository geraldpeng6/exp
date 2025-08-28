import { NextRequest, NextResponse } from 'next/server';
import { RATE_LIMIT_CONFIGS, checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { search } from '@/lib/search/index';

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`${ip}:search`, RATE_LIMIT_CONFIGS.API_GENERAL);
  if (!rl.allowed) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });

  const url = new URL(req.url);
  const q = url.searchParams.get('q') || '';
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));

  const results = search(q, limit);
  return NextResponse.json({ success: true, data: results });
}

