import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import BrandDecor from "@/components/BrandDecor";
import Footer from "@/components/Footer";
import ThemeProvider, { ThemeScript } from "@/components/ThemeProvider";
import ToastContainer from "@/components/ToastContainer";
import ThemeToggle from "@/components/ThemeToggle";
import AnalyticsClient from "@/components/AnalyticsClient";

export const metadata: Metadata = {
  title: "Peng's Blog",
  description: "A minimalist blog powered by Markdown",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://cheche.vercel.app'),
  openGraph: {
    siteName: "Peng's Blog",
    type: 'website',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://cheche.vercel.app',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="alternate" type="application/rss+xml" title="Peng's Blog RSS" href="/rss.xml" />
        <ThemeScript />
      </head>
      <body suppressHydrationWarning className="paper-canvas">
        <ThemeProvider>
          <header className="site-header">
            {/* 站点标题，用 rough-notation 装饰 */}
            <Link href="/" className="brand"><BrandDecor /></Link>
            {/* 主题切换按钮 */}
            <ThemeToggle />
          </header>
          <main className="container">
            {children}
          </main>
          <Footer />
          {/* 客户端匿名埋点需要包裹在 Suspense 中，避免 useSearchParams 构建期报错 */}
          <Suspense fallback={null}>
            <AnalyticsClient />
          </Suspense>
          <ToastContainer />
        </ThemeProvider>
      </body>
    </html>
  );
}

