import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b bg-white/70 dark:bg-black/40 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/console" className="font-semibold">Console</Link>
            <nav className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-4">
              <Link href="/console">概览</Link>
              <Link href="/console/traffic">流量</Link>
              <Link href="/console/behavior">行为</Link>
            </nav>
          </div>
          <form action="/api/auth/logout" method="post">
            <button className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">退出登录</button>
          </form>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}

