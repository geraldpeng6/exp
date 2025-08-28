"use client";
import { useState } from 'react';
import Link from 'next/link';
import { HIGHLIGHT_YELLOW_LIGHT, HIGHLIGHT_YELLOW_DARK, isDarkThemeActive } from '@/lib/scroll';

function highlight(text: string, q: string) {
  if (!q) return text;
  const idx = text.indexOf(q);
  if (idx < 0) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  const color = isDarkThemeActive() ? HIGHLIGHT_YELLOW_DARK : HIGHLIGHT_YELLOW_LIGHT;
  return (
    <>
      {before}
      <mark style={{ backgroundColor: color, color: 'inherit' }}>{match}</mark>
      {after}
    </>
  );
}

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  type SearchResult = { slug: string; title: string; snippet: string };
  const [results, setResults] = useState<SearchResult[]>([]);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json().catch(() => ({}));
    setResults((data?.data as SearchResult[]) || []);
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={onSearch} className="flex gap-2 mb-4">
        <input className="flex-1 border rounded px-3 py-2 bg-transparent" value={q} onChange={e => setQ(e.target.value)} placeholder="搜索文章...（支持中文）" />
        <button className="px-4 py-2 rounded bg-gray-900 text-white dark:bg-gray-100 dark:text-black">搜索</button>
      </form>
      {loading && <div>搜索中...</div>}
      <ul className="space-y-4">
        {results.map((r) => (
          <li key={r.slug} className="p-4 border rounded bg-white dark:bg-gray-900">
            <Link href={`/articles/${r.slug}`} className="font-semibold hover:underline">{r.title}</Link>
            <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{highlight(r.snippet, q)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

