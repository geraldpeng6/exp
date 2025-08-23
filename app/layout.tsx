import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import BrandDecor from "@/components/BrandDecor";
import Footer from "@/components/Footer";
import ThemeProvider, { ThemeScript } from "@/components/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Peng's Blog",
  description: "A minimalist blog powered by Markdown",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <header className="site-header">
            {/* 站点标题，用 rough-notation 装饰 */}
            <Link href="/" className="brand"><BrandDecor /></Link>
            {/* 主题切换按钮 */}
            <ThemeToggle />
          </header>
          <main className="container">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}

