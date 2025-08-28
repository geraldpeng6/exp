"use client";
import { useEffect, useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { getBrowserFingerprint } from '@/lib/browser-fingerprint';

/**
 * 客户端匿名埋点（轻量、无侵入）
 * - 放置在 RootLayout 中，跨路由工作
 * - 仅在客户端运行；尊重浏览器 DNT 设置
 * - 仅采集必要字段（pv/click/scroll/stay），避免性能影响
 */
export default function AnalyticsClient() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 将查询对象稳定为字符串，作为依赖触发 PV
  const search = useMemo(() => (searchParams ? `?${searchParams.toString()}` : ''), [searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (navigator.doNotTrack === '1') return; // 尊重 DNT

    const fp = getBrowserFingerprint();

    // 记录本次页面会话的起始时间 & 滚动深度
    let start = Date.now();
    let maxDepth = 0;

    // 轻量发送器：优先 sendBeacon，回退 keepalive fetch
    function send(type: string, extra: Record<string, unknown> = {}) {
      const body = {
        events: [
          {
            ts: Math.floor(Date.now() / 1000),
            fp,
            path: location.pathname,
            ref: document.referrer || '',
            utm: location.search || '',
            type,
            payload: JSON.stringify(extra),
          },
        ],
      };
      const data = JSON.stringify(body);
      if (navigator.sendBeacon) {
        try { navigator.sendBeacon('/api/analytics/collect', new Blob([data], { type: 'application/json' })); return; } catch {}
      }
      try { void fetch('/api/analytics/collect', { method: 'POST', body: data, headers: { 'Content-Type': 'application/json' }, keepalive: true }); } catch {}
    }

    // 点击埋点（仅采集带 data-track 或 data-track-name 的元素）
    function findTrackTarget(el: Element | null): Element | null {
      while (el) {
        if ((el as HTMLElement).dataset?.track != null || (el as HTMLElement).dataset?.trackName != null) return el;
        el = el.parentElement as Element | null;
      }
      return null;
    }
    function selectorFor(el: Element): string {
      const id = (el as HTMLElement).id;
      const cls = (el as HTMLElement).classList?.[0];
      const tag = el.tagName.toLowerCase();
      let sel = tag;
      if (id) sel += `#${id}`;
      if (cls) sel += `.${cls}`;
      return sel.slice(0, 80);
    }
    const onClick = (e: MouseEvent) => {
      const t = findTrackTarget(e.target as Element | null);
      if (!t) return;
      const name = (t as HTMLElement).dataset?.trackName || undefined;
      const sel = selectorFor(t);
      send('click', { sel, name });
    };

    // 滚动深度：记录最大到达（0-100），在隐藏/卸载或路由切换时上报
    function computeDepth() {
      const sh = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      const st = window.scrollY || document.documentElement.scrollTop || (document.body as HTMLElement).scrollTop || 0;
      const ih = window.innerHeight || document.documentElement.clientHeight;
      const denom = Math.max(1, sh - ih);
      const p = Math.min(100, Math.max(0, Math.round((st / denom) * 100)));
      if (p > maxDepth) maxDepth = p;
    }
    const onScroll = () => { computeDepth(); };

    // 上报并重置（用于页面隐藏或路由变更）
    function flushAndReset() {
      const dur = Math.max(0, Date.now() - start);
      send('scroll', { depth: maxDepth });
      send('stay', { ms: dur });
      start = Date.now();
      maxDepth = 0;
      computeDepth();
    }

    document.addEventListener('click', onClick, true);
    window.addEventListener('scroll', onScroll, { passive: true });
    computeDepth();

    // 首次/每次路由变化：发送 PV
    send('pv');

    const onVis = () => { if (document.visibilityState === 'hidden') flushAndReset(); };
    window.addEventListener('visibilitychange', onVis);
    window.addEventListener('beforeunload', flushAndReset);

    // 当 pathname/search 变化时，上报上一个页面的停留并发送新页 PV
    // 注意：该 effect 每次依赖变化都会执行清理 -> 触发 flushAndReset
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('scroll', onScroll as EventListener);
      window.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeunload', flushAndReset);
      // 在依赖变更时，发送上一个页面的 stay/scroll（类似切页）
      flushAndReset();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search]);

  return null;
}

