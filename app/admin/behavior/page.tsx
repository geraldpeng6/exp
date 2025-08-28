"use client";
import { useEffect, useMemo, useState } from 'react';
import ChartCard from '@/components/ChartCard';
import RangeButtons, { type RangeVal } from '@/components/RangeButtons';

export default function BehaviorPage() {
  const [range, setRange] = useState<RangeVal>('7d');
  const [data, setData] = useState<{ stayBuckets: number[]; topClicks: Array<{ sel: string; name?: string | null; v: number }>; scrollDist: number[] }>({ stayBuckets: [0,0,0,0,0,0], topClicks: [], scrollDist: [0,0,0,0] });
  const [loading, setLoading] = useState<boolean>(false);
  const [useCustom, setUseCustom] = useState(false);
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');

  function buildUrl() {
    if (useCustom && start && end) {
      const s = Math.floor(new Date(start).getTime() / 1000);
      const e = Math.floor(new Date(end).getTime() / 1000) + 86399;
      return `/api/analytics/aggregate?start=${s}&end=${e}`;
    }
    return `/api/analytics/aggregate?range=${range}`;
  }

  useEffect(() => {
    let aborted = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(buildUrl(), { cache: 'no-store' });
        const j = await res.json().catch(() => ({}));
        if (!aborted) setData(j?.data || { stayBuckets: [0,0,0,0,0,0], topClicks: [], scrollDist: [0,0,0,0] });
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [range, useCustom, start, end]);

  const stayLabels = ['0-5s','5-15s','15-60s','1-3m','3-10m','10m+'];
  const staySeries = [{ label: '人数', data: data.stayBuckets as number[] }];

  type ClickRow = { sel: string; name?: string | null; v: number };
  const clickLabels = useMemo(() => (data.topClicks as ClickRow[]).map((x) => x.name ? `${x.name} (${x.sel})` : x.sel), [data.topClicks]);
  const clickSeries = useMemo(() => ([{ label: '点击', data: (data.topClicks as ClickRow[]).map((x) => Number(x.v)||0) }]), [data.topClicks]);

  const scrollLabels = ['0-25%','25-50%','50-75%','75-100%'];
  const scrollSeries = [{ label: '人数', data: data.scrollDist as number[] }];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold">行为</h1>
        <div className="flex items-center gap-3">
          <RangeButtons value={range} onChange={(v)=>{ setRange(v); setUseCustom(false); }} />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">自定义日期：</label>
            <input type="date" value={start} onChange={(e)=>setStart(e.target.value)} className="px-2 py-1 border rounded" />
            <span>-</span>
            <input type="date" value={end} onChange={(e)=>setEnd(e.target.value)} className="px-2 py-1 border rounded" />
            <button onClick={()=>{ if (start && end) setUseCustom(true); }} className="px-2.5 py-1 text-sm rounded border bg-transparent text-gray-700 dark:text-gray-300 hover:bg-black/5 border-gray-300 dark:border-gray-700">应用</button>
            <button onClick={()=>{ setUseCustom(false); }} className="px-2.5 py-1 text-sm rounded border bg-transparent text-gray-700 dark:text-gray-300 hover:bg-black/5 border-gray-300 dark:border-gray-700">清除</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">加载中...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="停留时长分布" labels={stayLabels} series={staySeries} type="bar" />
            <ChartCard title="滚动深度分布" labels={scrollLabels} series={scrollSeries} type="bar" />
          </div>

          <ChartCard title="热门点击（Top 10）" labels={clickLabels} series={clickSeries} type="bar" />

          <div className="p-4 border rounded-lg bg-white dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <a href={useCustom && start && end ? (()=>{ const s=Math.floor(new Date(start).getTime()/1000), e=Math.floor(new Date(end).getTime()/1000)+86399; return `/api/analytics/aggregate?start=${s}&end=${e}&format=csv`; })() : `/api/analytics/aggregate?range=${range}&format=csv`} className="px-2.5 py-1 text-sm rounded border bg-transparent text-gray-700 dark:text-gray-300 hover:bg-black/5 border-gray-300 dark:border-gray-700" download>
                导出 PV/UV CSV
              </a>
              <a href={useCustom && start && end ? (()=>{ const s=Math.floor(new Date(start).getTime()/1000), e=Math.floor(new Date(end).getTime()/1000)+86399; return `/api/analytics/aggregate?start=${s}&end=${e}&format=csv&dataset=top_articles`; })() : `/api/analytics/aggregate?range=${range}&format=csv&dataset=top_articles`} className="px-2.5 py-1 text-sm rounded border bg-transparent text-gray-700 dark:text-gray-300 hover:bg-black/5 border-gray-300 dark:border-gray-700" download>
                导出 Top Articles CSV
              </a>
              <a href={useCustom && start && end ? (()=>{ const s=Math.floor(new Date(start).getTime()/1000), e=Math.floor(new Date(end).getTime()/1000)+86399; return `/api/analytics/aggregate?start=${s}&end=${e}&format=csv&dataset=referrers`; })() : `/api/analytics/aggregate?range=${range}&format=csv&dataset=referrers`} className="px-2.5 py-1 text-sm rounded border bg-transparent text-gray-700 dark:text-gray-300 hover:bg-black/5 border-gray-300 dark:border-gray-700" download>
                导出 Referrers CSV
              </a>
              <a href={useCustom && start && end ? (()=>{ const s=Math.floor(new Date(start).getTime()/1000), e=Math.floor(new Date(end).getTime()/1000)+86399; return `/api/analytics/aggregate?start=${s}&end=${e}&format=csv&dataset=utm`; })() : `/api/analytics/aggregate?range=${range}&format=csv&dataset=utm`} className="px-2.5 py-1 text-sm rounded border bg-transparent text-gray-700 dark:text-gray-300 hover:bg-black/5 border-gray-300 dark:border-gray-700" download>
                导出 UTM CSV
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

