"use client";
import { useEffect, useState } from 'react';
import type { ToastPayload } from '@/lib/toast';

interface Item extends ToastPayload { id: number }

export default function ToastContainer() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastPayload>).detail;
      if (!detail?.message) return;
      const id = Date.now() + Math.random();
      const item: Item = { id, ...detail };
      setItems(prev => [...prev, item]);
      const t = window.setTimeout(() => {
        setItems(prev => prev.filter(x => x.id !== id));
      }, item.duration ?? 1800);
      return () => window.clearTimeout(t);
    };
    window.addEventListener('toast', onToast as EventListener);
    return () => window.removeEventListener('toast', onToast as EventListener);
  }, []);

  const base = "px-3 py-2 rounded-lg shadow-md text-sm text-white backdrop-blur transition-opacity duration-150";
  const variant = (t?: string) =>
    t === 'success' ? 'bg-emerald-600/95' :
    t === 'error'   ? 'bg-rose-600/95' :
    t === 'warning' ? 'bg-amber-600/95' :
                      'bg-gray-800/95';

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-2 pointer-events-none" aria-live="polite" aria-atomic="true">
      {items.map(i => (
        <div key={i.id} className={`${base} ${variant(i.type)} pointer-events-auto`}>
          {i.message}
        </div>
      ))}
    </div>
  );
}

