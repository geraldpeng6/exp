import { getAllSlugs, getArticle } from "@/lib/articles";
import type { Metadata } from "next";
import ArticleDetail from "@/components/ArticleDetail";

export async function generateStaticParams() {
  // 静态生成所有文章路由
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = getArticle(slug);
  return { title: a.title, description: a.summary };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = getArticle(slug);
  return <ArticleDetail a={a} />;
}

