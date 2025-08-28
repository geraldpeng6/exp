import { getDatabase } from '@/lib/database/connection';

const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const DEFAULT_SYSTEM_PROMPT = '你是一个优秀的技术写作助手。请为输入的文章内容生成一段 2-4 句的中文摘要，突出关键要点，避免冗余。';

// 简单的并发去重：同一 slug 的请求合并
const inFlight = new Map<string, Promise<string>>();

// 简单熔断器：连续失败达到阈值后短时间拒绝请求
const circuit = new Map<string, { fails: number; until?: number }>();
const FAIL_THRESHOLD = 3;
const COOLDOWN_MS = 60_000; // 1 分钟

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('请求超时')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
  });
}

async function callOpenAI(userContent: string, systemPrompt: string): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('缺少 OPENAI_API_KEY');
  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt || DEFAULT_SYSTEM_PROMPT },
      { role: 'user', content: userContent }
    ],
    temperature: 0.3,
    max_tokens: 240,
  };

  // 兼容 OpenAI 风格
  const resp = await withTimeout(fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  }), 20000);

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    const err = new Error(`OpenAI 请求失败: ${resp.status} ${resp.statusText} ${text}`);
    (err as unknown as { status?: number }).status = resp.status;
    throw err;
  }
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('OpenAI 返回内容为空');
  return content;
}

export async function getSummary(slug: string, provider = 'openai', model = OPENAI_MODEL): Promise<string | null> {
  const db = getDatabase();
  const row = db.prepare(`SELECT summary FROM article_summaries WHERE slug = ? AND provider = ? AND model = ?`).get(slug, provider, model) as { summary: string } | undefined;
  return row?.summary || null;
}

export async function createOrGetSummary(slug: string, content: string, opts?: { provider?: string; model?: string; force?: boolean; systemPrompt?: string }): Promise<string> {
  const provider = opts?.provider || 'openai';
  const model = opts?.model || OPENAI_MODEL;

  if (!content || content.trim().length < 10) throw new Error('内容过短，无法生成摘要');

  // 命中缓存
  if (!opts?.force) {
    const cached = await getSummary(slug, provider, model);
    if (cached) return cached;
  }

  // 并发去重
  const key = `${slug}:${provider}:${model}`;
  const existing = inFlight.get(key);
  if (existing) return existing;

  const p = (async () => {
    // 熔断检查
    const c = circuit.get(provider) || { fails: 0 };
    if (c.until && Date.now() < c.until) {
      throw new Error('服务繁忙，请稍后再试');
    }

    // 长文截断（避免超 tokens），可后续做分段+汇总
    const trimmed = content.length > 8000 ? content.slice(0, 8000) : content;

    // 指数退避重试（最多 3 次）
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // 获取/决定系统提示词
        const db = getDatabase();
        const row = db.prepare(`SELECT system_prompt FROM article_summaries WHERE slug = ? AND provider = ? AND model = ?`).get(slug, provider, model) as { system_prompt?: string } | undefined;
        const systemPrompt = (opts?.systemPrompt ?? row?.system_prompt ?? DEFAULT_SYSTEM_PROMPT).trim();

        const summary = await callOpenAI(trimmed, systemPrompt);
        // 成功重置失败计数
        circuit.set(provider, { fails: 0 });

        db.prepare(`INSERT INTO article_summaries (slug, provider, model, summary, system_prompt, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, unixepoch(), unixepoch())
                    ON CONFLICT(slug, provider, model) DO UPDATE SET summary=excluded.summary, system_prompt=excluded.system_prompt, updated_at=unixepoch()`)
          .run(slug, provider, model, summary, systemPrompt);
        return summary;
      } catch (e) {
        lastErr = e;
        const prev = circuit.get(provider) || { fails: 0 };
        const fails = prev.fails + 1;
        const backoff = Math.min(5000, 300 * Math.pow(2, attempt));
        circuit.set(provider, fails >= FAIL_THRESHOLD ? { fails, until: Date.now() + COOLDOWN_MS } : { fails });
        if (attempt < 2) await new Promise(r => setTimeout(r, backoff));
      }
    }
    throw lastErr;
  })();

  inFlight.set(key, p);
  try {
    const result = await p;
    return result;
  } finally {
    inFlight.delete(key);
  }
}

export async function invalidateSummary(slug: string, provider = 'openai', model = OPENAI_MODEL): Promise<void> {
  const db = getDatabase();
  db.prepare(`DELETE FROM article_summaries WHERE slug = ? AND provider = ? AND model = ?`).run(slug, provider, model);
}

export function getSummaryAdmin(slug: string, provider = 'openai', model = OPENAI_MODEL): { summary: string | null; systemPrompt: string; updatedAt: number | null } {
  const db = getDatabase();
  const row = db.prepare(`SELECT summary, system_prompt, updated_at FROM article_summaries WHERE slug = ? AND provider = ? AND model = ?`).get(slug, provider, model) as { summary?: string; system_prompt?: string; updated_at?: number } | undefined;
  return {
    summary: row?.summary ?? null,
    systemPrompt: (row?.system_prompt ?? DEFAULT_SYSTEM_PROMPT),
    updatedAt: (row?.updated_at ?? null) as number | null,
  };
}

