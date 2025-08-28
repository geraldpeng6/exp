"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ChartCard from '@/components/ChartCard';
import RangeButtons, { type RangeVal } from '@/components/RangeButtons';

export default function TrafficPage() {
  const [range, setRange] = useState<RangeVal>('7d');
  const [data, setData] = useState<{ byDay: Array<{d:number;c:number}>; byDayUv: Array<{d:number;c:number}>; topArticles: Array<{slug:string;v:number}>; topReferrers: Array<{ref:string;v:number}>; topUtmSource: Array<{src:string;v:number}>; byReferrerDay: Array<{d:number;ref:string;c:number}>; stayBuckets: number[]; scrollDist: number[]; newVisitors?: number; returningVisitors?: number; aiTodayUsed?: number; aiDailyLimit?: number; aiRemaining?: number }>({ byDay: [], byDayUv: [], topArticles: [], topReferrers: [], topUtmSource: [], byReferrerDay: [], stayBuckets: [], scrollDist: [], newVisitors: 0, returningVisitors: 0, aiTodayUsed: 0, aiDailyLimit: 0, aiRemaining: 0 });
  const [loading, setLoading] = useState(false);
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
        if (!aborted) setData(j?.data || { byDay: [], byDayUv: [], topArticles: [], topReferrers: [], topUtmSource: [], byReferrerDay: [], stayBuckets: [], scrollDist: [], newVisitors: 0, returningVisitors: 0, aiTodayUsed: 0, aiDailyLimit: 0, aiRemaining: 0 });
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [range, useCustom, start, end]);

  type ByDayRow = { d: number; c: number };
  type ByDayUvRow = { d: number; c: number };
  type RefRow = { ref: string; v: number };
  type ReferrerDayRow = { d: number; ref: string; c: number };
  type UtmRow = { src: string; v: number };
  type ArticleRow = { slug: string; v: number };

  // 按日补零：生成连续日期栅格
  const dayKeys: number[] = useMemo(() => {
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

  const pvMap = useMemo(() => new Map((data.byDay as ByDayRow[]).map((x)=>[x.d, Number(x.c)||0])), [data.byDay]);
  const uvMap = useMemo(() => new Map((data.byDayUv as ByDayUvRow[]).map((x)=>[x.d, Number(x.c)||0])), [data.byDayUv]);

  const byDayLabels: string[] = useMemo(() => dayKeys.map((sec)=> new Date(sec*1000).toLocaleDateString()), [dayKeys]);
  const byDaySeries = useMemo(() => ([
    { label: 'PV', data: dayKeys.map((d)=> pvMap.get(d) || 0), fill: true },
    { label: 'UV', data: dayKeys.map((d)=> uvMap.get(d) || 0), color: '#10b981' },
  ]), [dayKeys, pvMap, uvMap]);

  // byReferrerDay 转为多序列折线
  const dayKeysRaw = useMemo(() => Array.from(new Set((data.byDay as ByDayRow[]).map((x)=>x.d))).sort((a,b)=>a-b), [data.byDay]);
  const refKeys = useMemo(() => (data.topReferrers as RefRow[]).map((x) => x.ref), [data.topReferrers]);
  const refToSeries: Record<string, number[]> = useMemo(() => {
    const m: Record<string, number[]> = {};
    for (const ref of refKeys) m[ref] = dayKeys.map(() => 0);
    for (const row of (data.byReferrerDay as ReferrerDayRow[])) {
      const d = row.d, ref = row.ref, c = Number(row.c)||0;
      const idx = dayKeys.indexOf(d);
      if (idx >= 0 && m[ref]) m[ref][idx] = c;
    }
    return m;
  }, [data.byReferrerDay, dayKeys, refKeys]);

  const byRefLabels = useMemo(() => dayKeys.map((sec)=> new Date(sec*1000).toLocaleDateString()), [dayKeys]);
  const refColors = useMemo(()=>['#60a5fa', '#f59e0b', '#10b981', '#f43f5e', '#a78bfa', '#34d399', '#fb7185', '#22d3ee'], []);
  const byRefSeries = useMemo(() => refKeys.slice(0, 6).map((ref, i) => ({ label: ref, data: refToSeries[ref] || [], color: refColors[i%refColors.length] })), [refKeys, refToSeries, refColors]);

  const topRefLabels = useMemo(() => (data.topReferrers as RefRow[]).map((x) => x.ref), [data.topReferrers]);
  const topRefSeries = useMemo(() => ([{ label: 'Ref PV', data: (data.topReferrers as RefRow[]).map((x) => Number(x.v)||0) }]), [data.topReferrers]);

  const utmLabels = useMemo(() => (data.topUtmSource as UtmRow[]).map((x) => x.src), [data.topUtmSource]);
  const utmSeries = useMemo(() => ([{ label: 'UTM PV', data: (data.topUtmSource as UtmRow[]).map((x) => Number(x.v)||0) }]), [data.topUtmSource]);

  // 新增图表数据：停留时长分布、滚动深度分布、新/回访
  const stayLabels = useMemo(() => ['0-5s','5-15s','15-60s','1-3m','3-10m','10m+'], []);
  const staySeries = useMemo(() => ([{ label: '人数', data: (data.stayBuckets || []).map((x:number)=>Number(x)||0) }]), [data.stayBuckets]);
  const scrollLabels = useMemo(() => ['0-25%','26-50%','51-75%','76-100%'], []);
  const scrollSeries = useMemo(() => ([{ label: '人数', data: (data.scrollDist || []).map((x:number)=>Number(x)||0), color: '#f59e0b' }]), [data.scrollDist]);
  const visitorLabels = useMemo(() => ['新访客','回访'], []);
  const visitorSeries = useMemo(() => ([{ label: '人数', data: [Number(data.newVisitors||0), Number(data.returningVisitors||0)], color: '#10b981' }]), [data.newVisitors, data.returningVisitors]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold">流量</h1>
        <div className="flex items-center gap-3">
          <RangeButtons value={range} onChange={(v)=>{ setRange(v); setUseCustom(false); }} />
          <a href={`/api/analytics/aggregate?range=${range}&format=csv`} className="px-2.5 py-1 text-sm rounded border bg-transparent text-gray-700 dark:text-gray-300 hover:bg-black/5 border-gray-300 dark:border-gray-700" download>
            导出 PV/UV CSV
          </a>
          <a href={`/api/analytics/aggregate?range=${range}&format=csv&dataset=top_articles`} className="px-2.5 py-1 text-sm rounded border bg-transparent text-gray-700 dark:text-gray-300 hover:bg-black/5 border-gray-300 dark:border-gray-700" download>
            导出 Top Articles CSV
          </a>
          <a href={`/api/analytics/aggregate?range=${range}&format=csv&dataset=referrers`} className="px-2.5 py-1 text-sm rounded border bg-transparent text-gray-700 dark:text-gray-300 hover:bg-black/5 border-gray-300 dark:border-gray-700" download>
            导出 Referrers CSV
          </a>
          <a href={`/api/analytics/aggregate?range=${range}&format=csv&dataset=utm`} className="px-2.5 py-1 text-sm rounded border bg-transparent text-gray-700 dark:text-gray-300 hover:bg-black/5 border-gray-300 dark:border-gray-700" download>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title={`PV/UV 趋势（${range}）`} labels={byDayLabels} series={byDaySeries} type="line" />
        <ChartCard title="来源趋势（Top）" labels={byRefLabels} series={byRefSeries} type="line" />
      </div>

      {/* 今日 AI 配额使用卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-4 border rounded-lg bg-white dark:bg-gray-900">
          <div className="text-sm text-gray-500 mb-1">今日 AI 用量（UTC）</div>
          <div className="text-2xl font-semibold">{data.aiTodayUsed ?? 0} / {data.aiDailyLimit ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1">剩余：{Math.max(0, (data.aiRemaining ?? 0))}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top Referrers" labels={topRefLabels} series={topRefSeries} type="bar" />
        <ChartCard title="UTM Source" labels={utmLabels} series={utmSeries} type="bar" />
      </div>

      {/* 新增：行为分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="停留时长分布" labels={stayLabels} series={staySeries} type="bar" />
        <ChartCard title="滚动深度分布" labels={scrollLabels} series={scrollSeries} type="bar" />
      </div>

      {/* 新增：新/回访 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="新/回访" labels={visitorLabels} series={visitorSeries} type="bar" />
      </div>

      <div className="p-4 border rounded-lg bg-white dark:bg-gray-900">
        <div className="font-semibold mb-2">Top Articles（{range}）</div>
        <ul className="list-disc pl-6">
          {(data.topArticles as ArticleRow[]).map((x) => (
            <li key={x.slug}>
              <Link href={`/articles/${x.slug}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{x.slug}</Link> - {x.v}
            </li>
          ))}
        </ul>
        {!Array.isArray(data.topArticles) || data.topArticles.length===0 ? (
          <div className="text-sm text-gray-500 mt-2">{loading ? '加载中...' : '暂无数据'}</div>
        ) : null}
      </div>
    </div>
  );
}

