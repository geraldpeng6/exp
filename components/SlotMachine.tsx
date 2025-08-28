"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

export interface SlotMachineProps<T> {
  items: readonly T[];
  durationMs: number; // total spin duration
  minIntervalMs?: number; // fastest interval at the start
  maxIntervalMs?: number; // slowest interval near the end
  easing?: (t01: number) => number; // t in [0,1] -> [0,1], controls deceleration
  renderItem: (item: T) => React.ReactNode;
  className?: string;
  onEnd?: () => void; // called when animation completes
}

// Generic slot machine animation: cycles through a shuffled order of a fixed pool
export default function SlotMachine<T>(props: SlotMachineProps<T>) {
  const { items, durationMs, minIntervalMs = 60, maxIntervalMs = 300, easing, renderItem, className, onEnd } = props;
  const [index, setIndex] = useState(0);
  const orderRef = useRef<number[]>([]);
  const runningRef = useRef(false);
  const startTsRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  const pool = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  useEffect(() => {
    if (!pool.length) return;
    runningRef.current = true;
    // shuffle order (Fisher–Yates)
    const order = [...Array(pool.length).keys()];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    orderRef.current = order;
    let i = Math.floor(Math.random() * pool.length);
    setIndex(orderRef.current[i % orderRef.current.length]);

    const ease = easing || ((t: number) => 1 - Math.pow(1 - t, 3)); // cubic ease-out
    startTsRef.current = performance.now();
    lastTickRef.current = startTsRef.current;

    const step = (now: number) => {
      if (!runningRef.current) return;
      const t = Math.min(1, (now - startTsRef.current) / Math.max(500, durationMs));
      const curInterval = minIntervalMs + (maxIntervalMs - minIntervalMs) * ease(t);
      if (now - lastTickRef.current >= curInterval) {
        i = (i + 1) % orderRef.current.length;
        setIndex(orderRef.current[i]);
        lastTickRef.current = now;
      }
      if (t >= 1) {
        runningRef.current = false;
        onEnd && onEnd();
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      runningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // re-run each mount (consumer controls when to mount/unmount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, durationMs, minIntervalMs, maxIntervalMs, easing]);

  const current = pool.length ? pool[index % pool.length] : undefined;
  return (
    <div className={className} aria-live="polite" aria-busy>
      {current !== undefined ? renderItem(current) : null}
    </div>
  );
}

