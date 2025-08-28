"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import RangeButtons, { type RangeVal } from '@/components/RangeButtons';
import ChartCard from '@/components/ChartCard';

export default function ConsoleHome() {
  const [range, setRange] = useState<RangeVal>('7d');
  const [data, setData] = useState<{ totalPv: number; totalUv: number; byDay: Array<{d:number;c:number}>; byDayUv: Array<{d:number;c:number}>; topArticles: Array<{slug:string;v:number}> }>({ totalPv: 0, totalUv: 0, byDay: [], byDayUv: [], topArticles: [] });
  const [loading, setLoading] = useState(false);
  const [useCustom, setUseCustom] = useState(false);
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');

  function buildUrl() {
    if (useCustom && start && end) {
      const s = Math.floor(new Date(start).getTime() / 1000);
      const e = Math.floor(new Date(end).getTime() / 1000) + 86399; // 包含整天
      return `/api/analytics/aggregate?start=${s}&end=${e}`;
    }
    return `/api/analytics/aggregate?range=${range}`;
  }

  useEffect(() => {
    let aborted = false;
    (async () => {
      setLoading(true);
      try {
        const url = buildUrl();
        const res = await fetch(url, { cache: 'no-store' });
        const j = await res.json().catch(() => ({}));
        if (!aborted) setData(j?.data || { totalPv: 0, totalUv: 0, byDay: [], byDayUv: [], topArticles: [] });
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [range, useCustom, start, end]);

  // 补零：根据选择范围或自定义时间生成连续日期序列
  const dayGrid: number[] = useMemo(() => {
    const toDayStart = (ts: number) => Math.floor(ts / 86400) * 86400;
    if (useCustom && start && end) {
      const s = toDayStart(Math.floor(new Date(start).getTime() / 1000));
      const e = toDayStart(Math.floor(new Date(end).getTime() / 1000));
      const arr: number[] = [];
      for (let d=s; d<=e; d+=86400) arr.push(d);
      return arr;
    }
    const now = Math.floor(Date.now()/1000);
    const days = range === '30d' ? 30 : range === '1d' ? 1 : 7;
    const s = toDayStart(now - days*86400);
    const e = toDayStart(now);
    const arr: number[] = [];
    for (let d=s; d<=e; d+=86400) arr.push(d);
    return arr;
  }, [range, useCustom, start, end]);

  const pvMap = useMemo(() => new Map((data.byDay||[]).map((x)=>[x.d, Number(x.c)||0])), [data.byDay]);
  const uvMap = useMemo(() => new Map((data.byDayUv||[]).map((x)=>[x.d, Number(x.c)||0])), [data.byDayUv]);

  const labels: string[] = useMemo(() => dayGrid.map((sec)=> new Date(sec*1000).toLocaleDateString()), [dayGrid]);
  const pvSeries = useMemo(() => dayGrid.map((d)=> pvMap.get(d) || 0), [dayGrid, pvMap]);
  const uvSeries = useMemo(() => dayGrid.map((d)=> uvMap.get(d) || 0), [dayGrid, uvMap]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold">概览</h1>
        <div className="flex items-center gap-3">
          <RangeButtons value={range} onChange={(v)=>{ setRange(v); setUseCustom(false); }} />
          <a
            href={useCustom && start && end
              ? (()=>{ const s=Math.floor(new Date(start).getTime()/1000), e=Math.floor(new Date(end).getTime()/1000)+86399; return `/api/analytics/aggregate?start=${s}&end=${e}&format=csv`; })()
              : `/api/analytics/aggregate?range=${range}&format=csv`}
            className="px-2.5 py-1 text-sm rounded border bg-transparent text-gray-700 dark:text-gray-300 hover:bg-black/5 border-gray-300 dark:border-gray-700"
            download
          >
            导出 PV/UV CSV
          </a>
          <a
            href={useCustom && start && end
              ? (()=>{ const s=Math.floor(new Date(start).getTime()/1000), e=Math.floor(new Date(end).getTime()/1000)+86399; return `/api/analytics/aggregate?start=${s}&end=${e}&format=csv&dataset=top_articles`; })()
              : `/api/analytics/aggregate?range=${range}&format=csv&dataset=top_articles`}
            className="px-2.5 py-1 text-sm rounded border bg-transparent text-gray-700 dark:text-gray-300 hover:bg-black/5 border-gray-300 dark:border-gray-700"
            download
          >
            导出 Top Articles CSV
          </a>
          <a
            href={useCustom && start && end
              ? (()=>{ const s=Math.floor(new Date(start).getTime()/1000), e=Math.floor(new Date(end).getTime()/1000)+86399; return `/api/analytics/aggregate?start=${s}&end=${e}&format=csv&dataset=referrers`; })()
              : `/api/analytics/aggregate?range=${range}&format=csv&dataset=referrers`}
            className="px-2.5 py-1 text-sm rounded border bg-transparent text-gray-700 dark:text-gray-300 hover:bg-black/5 border-gray-300 dark:border-gray-700"
            download
          >
            导出 Referrers CSV
          </a>
          <a
            href={useCustom && start && end
              ? (()=>{ const s=Math.floor(new Date(start).getTime()/1000), e=Math.floor(new Date(end).getTime()/1000)+86399; return `/api/analytics/aggregate?start=${s}&end=${e}&format=csv&dataset=utm`; })()
              : `/api/analytics/aggregate?range=${range}&format=csv&dataset=utm`}
            className="px-2.5 py-1 text-sm rounded border bg-transparent text-gray-700 dark:text-gray-300 hover:bg-black/5 border-gray-300 dark:border-gray-700"
            download
          >
            导出 UTM CSV
          </a>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500">自定义日期：</label>
        <input type="date" value={start} onChange={(e)=>setStart(e.target.value)} className="px-2 py-1 border rounded" />
        <span>-</span>
        <input type="date" value={end} onChange={(e)=>setEnd(e.target.value)} className="px-2 py-1 border rounded" />
        <button onClick={()=>{ if (start && end) setUseCustom(true); }} className="px-2.5 py-1 text-sm rounded border bg-transparent text-gray-700 dark:text-gray-300 hover:bg-black/5 border-gray-300 dark:border-gray-700">应用</button>
        <button onClick={()=>{ setUseCustom(false); }} className="px-2.5 py-1 text-sm rounded border bg-transparent text-gray-700 dark:text-gray-300 hover:bg-black/5 border-gray-300 dark:border-gray-700">清除</button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 border rounded-lg bg-white dark:bg-gray-900">
          <div className="text-sm text-gray-500">总 PV（{range}）</div>
          <div className="text-2xl font-semibold mt-1">{Number(data.totalPv || 0).toLocaleString()}</div>
        </div>
        <div className="p-4 border rounded-lg bg-white dark:bg-gray-900">
          <div className="text-sm text-gray-500">UV（{range} 去重）</div>
          <div className="text-2xl font-semibold mt-1">{Number(data.totalUv || 0).toLocaleString()}</div>
        </div>
        <div className="p-4 border rounded-lg bg-white dark:bg-gray-900">
          <div className="font-semibold mb-2">Top Articles（{range}）</div>
          {Array.isArray(data.topArticles) && data.topArticles.length > 0 ? (
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {data.topArticles.map((a: { slug: string; v: number }) => (
                <li key={a.slug}>
                  <Link href={`/articles/${a.slug}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{a.slug}</Link>
                  <span className="text-gray-400 ml-2">{a.v}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-500">{loading ? '加载中...' : '暂无数据'}</div>
          )}
        </div>
      </div>

      <ChartCard
        title={`PV/UV 趋势（${range}）`}
        labels={labels}
        series={[
          { label: 'PV', data: pvSeries, fill: true },
          { label: 'UV', data: uvSeries, color: '#10b981' },
        ]}
        type="line"
      />
    </div>
  );
}

