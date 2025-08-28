"use client";
import { useEffect, useState } from 'react';

interface Comment { id: string; userId: string; articleId: string; nickname: string; avatarUrl: string; content: string; createdAt: number }

export default function CommentsConsole() {
  // 已改为展示全部评论，不再按文章ID过滤
  const [list, setList] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await fetch(`/api/admin/comments?page=1&limit=100`);
    const j = await r.json();
    setList(j.data?.comments || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (c: Comment) => {
    const r = await fetch(`/api/admin/comments/${c.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: c.content }) });
    if (r.ok) { alert('已保存'); await load(); } else { alert('保存失败'); }
  };
  const del = async (id: string) => {
    if (!confirm('确认删除该评论?')) return;
    const r = await fetch(`/api/admin/comments/${id}`, { method: 'DELETE' });
    if (r.ok) { alert('已删除'); await load(); } else { alert('删除失败'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <button className="px-2 py-1 border rounded" onClick={load}>刷新</button>
      </div>

      <div className="divide-y border rounded bg-white/70 dark:bg-black/30">
        {loading && <div className="p-3 text-sm">加载中...</div>}
        {list.map(c => (
          <div key={c.id} className="p-3 space-y-2">
            <div className="text-xs text-gray-500">{c.nickname} • {c.userId} • {new Date(c.createdAt*1000).toLocaleString()}</div>
            <textarea className="w-full h-24 border rounded px-2 py-1" value={c.content} onChange={e => setList(s => s.map(x => x.id===c.id?{...x, content: e.target.value}:x))} />
            <div className="flex gap-2">
              <button className="px-2 py-1 border rounded" onClick={() => save(c)}>保存</button>
              <button className="px-2 py-1 border rounded text-red-600" onClick={() => del(c.id)}>删除</button>
            </div>
          </div>
        ))}
        {!loading && !list.length && <div className="p-3 text-sm text-gray-500">暂无数据</div>}
      </div>
    </div>
  );
}

