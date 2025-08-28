"use client";
import { useEffect, useMemo, useState } from 'react';

interface Meta { slug: string; title: string; date: string; summary?: string; tags?: string[] }
interface Article extends Meta { content: string }

export default function ArticlesConsole() {
  const [list, setList] = useState<Meta[]>([]);
  const [editing, setEditing] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);
  const [summaryInfo, setSummaryInfo] = useState<{ summary: string | null; systemPrompt: string; updatedAt: number | null } | null>(null);
  const [regenLoading, setRegenLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await fetch('/api/admin/articles', { cache: 'no-store' });
    const j = await r.json();
    setList(j.data || []);
    setLoading(false);
  };

  const loadOne = async (slug: string) => {
    const r = await fetch(`/api/admin/articles?slug=${encodeURIComponent(slug)}`);
    const j = await r.json();
    setEditing(j.data);
    // 加载摘要信息
    try {
      const s = await fetch(`/api/admin/summaries?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
      const sj = await s.json();
      setSummaryInfo(sj.data || null);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const blank: Article = useMemo(() => ({ slug: '', title: '', date: new Date().toISOString(), summary: '', tags: [], content: '' }), []);

  const save = async () => {
    if (!editing) return;
    const body = { ...editing, tags: editing.tags || [] };
    const r = await fetch('/api/admin/articles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (r.ok) { await load(); alert('已保存'); } else { alert('保存失败'); }
  };

  const del = async (slug: string) => {
    if (!confirm('确认删除该文章?')) return;
    const r = await fetch(`/api/admin/articles?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' });
    if (r.ok) { await load(); alert('已删除'); if (editing?.slug === slug) setEditing(null); } else { alert('删除失败'); }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">文章列表</h2>
          <button className="px-2 py-1 text-sm border rounded" onClick={() => setEditing({ ...blank })}>新建</button>
        </div>
        <ul className="divide-y border rounded bg-white/70 dark:bg-black/30">
          {loading && <li className="p-3 text-sm">加载中...</li>}
          {list.map(a => (
            <li key={a.slug} className="p-3 flex items-center justify-between hover:bg-black/5">
              <button className="text-left" onClick={() => loadOne(a.slug)}>
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-gray-500">{a.slug}</div>
              </button>
              <button className="text-red-600 text-xs" onClick={() => del(a.slug)}>删除</button>
            </li>
          ))}
        </ul>
      </div>
      <div className="md:col-span-2">
        {!editing ? (
          <div className="text-sm text-gray-500">选择左侧文章或点击“新建”</div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Slug<input className="w-full border rounded px-2 py-1" value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value })} /></label>
              <label className="text-sm">Title<input className="w-full border rounded px-2 py-1" value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} /></label>
              <label className="text-sm col-span-2">Date<input className="w-full border rounded px-2 py-1" value={editing.date} onChange={e => setEditing({ ...editing, date: e.target.value })} /></label>
              <label className="text-sm col-span-2">Summary<textarea className="w-full border rounded px-2 py-1" value={editing.summary || ''} onChange={e => setEditing({ ...editing, summary: e.target.value })} /></label>
              <div className="text-sm col-span-2 p-2 border rounded bg-gray-50 dark:bg-black/30">
                <div className="font-medium mb-1">AI 摘要</div>
                {!summaryInfo ? (
                  <div className="text-xs text-gray-500">暂无</div>
                ) : (
                  <>
                    <div className="text-xs text-gray-500 mb-1">上次更新：{summaryInfo.updatedAt ? new Date(summaryInfo.updatedAt * 1000).toLocaleString() : '—'}</div>
                    <div className="mb-2 whitespace-pre-wrap text-sm">{summaryInfo.summary || '未生成'}</div>
                    <label className="text-sm block">System Prompt
                      <textarea className="w-full border rounded px-2 py-1" value={summaryInfo.systemPrompt}
                        onChange={e => setSummaryInfo({ ...(summaryInfo || { summary: null, systemPrompt: '', updatedAt: null }), systemPrompt: e.target.value })} />
                    </label>
                    <div className="mt-2 flex gap-2">
                      <button className="px-2 py-1 border rounded text-xs" disabled={regenLoading}
                        onClick={async () => {
                          if (!editing) return;
                          setRegenLoading(true);
                          try {
                            const resp = await fetch('/api/admin/summaries', {
                              method: 'POST', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ slug: editing.slug, systemPrompt: summaryInfo?.systemPrompt || '' })
                            });
                            const j = await resp.json();
                            if (resp.ok) {
                              setSummaryInfo(si => si ? { ...si, summary: j.data?.summary || '', updatedAt: Math.floor(Date.now()/1000) } : si);
                              alert('已重新生成');
                            } else {
                              alert(j.error || '重生成失败');
                            }
                          } finally {
                            setRegenLoading(false);
                          }
                        }}>重新生成</button>
                    </div>
                  </>
                )}
              </div>
              <label className="text-sm col-span-2">Tags<input className="w-full border rounded px-2 py-1" value={(editing.tags || []).join(', ')} onChange={e => setEditing({ ...editing, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} /></label>
            </div>
            <label className="text-sm block">Content (Markdown)
              <textarea className="w-full h-[480px] border rounded px-2 py-1 font-mono" value={editing.content} onChange={e => setEditing({ ...editing, content: e.target.value })} />
            </label>
            <div className="flex gap-2">
              <button className="px-3 py-1 border rounded" onClick={save}>保存</button>
              <button className="px-3 py-1 border rounded" onClick={() => setEditing(null)}>取消</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

