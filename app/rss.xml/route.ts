import { NextResponse } from 'next/server';
import { getAllArticles } from '@/lib/articles';

export const revalidate = 600; // 10 分钟缓存

function escapeXml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cheche.vercel.app';
  const items = getAllArticles();

  const now = new Date().toUTCString();

  const rssItems = items
    .map((a) => {
      const link = `${siteUrl}/articles/${a.slug}`;
      const title = escapeXml(a.title);
      const desc = escapeXml((a.summary || '').slice(0, 500));
      const pubDate = new Date(a.date).toUTCString();
      return `\n    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="false">${a.slug}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${desc}</description>
    </item>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Peng's Blog</title>
    <link>${siteUrl}</link>
    <description>RSS Feed</description>
    <lastBuildDate>${now}</lastBuildDate>${rssItems}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=600',
    },
  });
}

