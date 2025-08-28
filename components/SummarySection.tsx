"use client";
import { useEffect, useState } from 'react';
import Paper from './Paper';

export default function SummarySection({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // 初次尝试：先请求已有缓存（force=false）
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug }),
        });
        const data = await res.json();
        if (res.ok && data?.success && !cancelled) setSummary(data.data.summary);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [slug]);


  if (loading && !summary) {
    return (
      <div className="mb-6">
        <div className="text-sm text-gray-500">正在加载摘要...</div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">文章摘要</h2>
      </div>
      {summary ? (
        <Paper className="p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{summary}</Paper>
      ) : (
        <div className="text-sm text-gray-500">暂无摘要</div>
      )}
    </div>
  );
}

