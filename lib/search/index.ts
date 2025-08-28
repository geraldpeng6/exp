import { getAllArticles, getArticle } from '@/lib/articles';

export interface SearchDoc { slug: string; title: string; text: string; }

let cache: { ts: number; docs: SearchDoc[] } | null = null;

function normalizeText(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

export function buildIndex(): SearchDoc[] {
  const now = Date.now();
  if (cache && now - cache.ts < 60_000) return cache.docs;
  const metas = getAllArticles();
  const docs = metas.map(m => {
    const a = getArticle(m.slug);
    return { slug: a.slug, title: a.title, text: normalizeText(a.content) } as SearchDoc;
  });
  cache = { ts: now, docs };
  return docs;
}

export function search(query: string, limit = 20): Array<{ slug: string; title: string; snippet: string }>{
  const q = query.trim();
  if (!q) return [];
  const docs = buildIndex();
  const res: Array<{ slug: string; title: string; snippet: string }> = [];
  for (const d of docs) {
    const i = d.text.indexOf(q);
    if (i >= 0) {
      const start = Math.max(0, i - 50);
      const end = Math.min(d.text.length, i + q.length + 50);
      const snippet = d.text.slice(start, end);
      res.push({ slug: d.slug, title: d.title, snippet });
      if (res.length >= limit) break;
    }
  }
  return res;
}

