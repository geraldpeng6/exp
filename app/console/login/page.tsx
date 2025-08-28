"use client";
import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function LoginInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || '登录失败');
      const to = sp.get('from') || '/console';
      // @ts-expect-error Next Route 类型收紧，运行时合法即可
      router.replace(to);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '登录失败';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-lg border p-6 space-y-4">
        <h1 className="text-xl font-semibold">Console 登录</h1>
        {error && <div className="text-sm text-red-500">{error}</div>}
        <div className="space-y-2">
          <label className="block text-sm">用户名</label>
          <input className="w-full px-3 py-2 rounded border bg-transparent" value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm">密码</label>
          <input type="password" className="w-full px-3 py-2 rounded border bg-transparent" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <button disabled={loading} className="w-full py-2 rounded bg-gray-900 text-white dark:bg-gray-100 dark:text-black disabled:opacity-50">
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
    </div>
  );
}

export default function ConsoleLogin() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center">加载中...</div>}>
      <LoginInner />
    </Suspense>
  );
}

