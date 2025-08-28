export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMIT_CONFIGS, getClientIp } from '@/lib/security/rate-limit';
import { checkAndConsumeDailyAiQuota } from '@/lib/security/daily-ai-limit';
import { getArticle } from '@/lib/articles';

const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`${ip}:chat`, RATE_LIMIT_CONFIGS.USER_ACTION);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试', retryAfter: rl.retryAfter },
        { status: 429, headers: { 'Retry-After': rl.retryAfter?.toString() || '60' } }
      );
    }

    // 全站日限流：超过 100 次/天（UTC）则拒绝
    const quota = checkAndConsumeDailyAiQuota();
    if (!quota.allowed) {
      return NextResponse.json(
        { error: '今日该网站AI使用过多，网站作者已穷，请明天再来吧' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const slug = typeof body.slug === 'string' ? body.slug : undefined;
    const message = typeof body.message === 'string' ? body.message : '';
    const selectedText = typeof body.selectedText === 'string' ? body.selectedText : '';
    const history = Array.isArray(body.history) ? body.history as Array<{ role: 'user'|'assistant'|'system'; content: string }> : [];

    if (!message.trim()) {
      return NextResponse.json({ error: '缺少提问内容' }, { status: 400 });
    }
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: '服务未配置 API Key' }, { status: 500 });
    }

    // 加载文章内容作为上下文
    let articleContext = '';
    if (slug) {
      try {
        const a = getArticle(slug);
        // 控制长度，避免超出模型限制
        const raw = a.content || '';
        articleContext = raw.length > 8000 ? raw.slice(0, 8000) : raw;
      } catch {}
    }

    const systemPrompt =
      '你是一个中文技术写作与讲解助手。优先依据提供的上下文回答问题；若上下文不足，请明确说明需要更多信息。回答要简洁、步骤清晰，并在必要时给出示例。';

    // 组装消息
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    messages.push({ role: 'system', content: systemPrompt });
    // 将历史对话（若有）并入
    for (const m of history) {
      if (m && typeof m.role === 'string' && typeof m.content === 'string') {
        const role = (m.role === 'user' || m.role === 'assistant' || m.role === 'system') ? m.role : 'user';
        messages.push({ role, content: m.content });
      }
    }

    // 将上下文与选中内容拼入用户请求
    let userContent = '';
    if (articleContext) userContent += `【文章上下文】\n${articleContext}\n\n`;
    if (selectedText) userContent += `【选中片段】\n${selectedText}\n\n`;
    userContent += `【用户问题】\n${message}`;
    messages.push({ role: 'user', content: userContent });

    const stream = body?.stream === true;

    if (stream) {
      const resp = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages,
          temperature: 0.3,
          max_tokens: 600,
          stream: true,
        }),
      });

      if (!resp.ok || !resp.body) {
        const text = await resp.text().catch(() => '');
        return NextResponse.json({ error: `AI 请求失败: ${resp.status} ${resp.statusText} ${text}` }, { status: 500 });
      }

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const readable = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            const reader = resp.body!.getReader();
            let buffer = '';
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split(/\r?\n/);
              buffer = lines.pop() || '';
              for (const ln of lines) {
                const line = ln.trim();
                if (!line.startsWith('data:')) continue;
                const dataStr = line.replace(/^data:\s*/, '');
                if (dataStr === '[DONE]') {
                  controller.close();
                  return;
                }
                try {
                  const json = JSON.parse(dataStr);
                  const delta = json?.choices?.[0]?.delta?.content || '';
                  if (delta) controller.enqueue(encoder.encode(delta));
                } catch {}
              }
            }
            if (buffer) {
              try {
                const json = JSON.parse(buffer);
                const delta = json?.choices?.[0]?.delta?.content || '';
                if (delta) controller.enqueue(encoder.encode(delta));
              } catch {}
            }
            controller.close();
          } catch (err) {
            try { controller.error(err); } catch {}
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
        },
      });
    }

    // 非流式：一次性返回
    const resp = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        temperature: 0.3,
        max_tokens: 600,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return NextResponse.json({ error: `AI 请求失败: ${resp.status} ${resp.statusText} ${text}` }, { status: 500 });
    }
    const data = await resp.json();
    const reply: string | undefined = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return NextResponse.json({ error: 'AI 返回为空' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { reply } });
  } catch (error) {
    console.error('AI 聊天失败:', error);
    const msg = error instanceof Error ? error.message : 'AI 聊天失败';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

