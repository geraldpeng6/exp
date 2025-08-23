import { getAllArticles } from "@/lib/articles";
import ArticleTabsSimple from "@/components/ArticleTabsSimple";
import { getHotArticlesByEngagement } from "@/lib/services/like-service";

// 首页：文章列表（中文注释）
export const revalidate = 60; // ISR，减少冷启动

export default async function Home() {
  const articles = getAllArticles();

  // 获取热门文章列表（点赞+评论数综合）
  let popularArticleSlugs: string[] = [];
  try {
    const hot = await getHotArticlesByEngagement({ limit: 10 });
    popularArticleSlugs = hot.map(p => p.articleId);
  } catch (error) {
    console.error('获取热门文章失败:', error);
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, margin: "8px 0 24px" }}>文章</h1>
      <ArticleTabsSimple articles={articles} popularArticles={popularArticleSlugs} />
    </div>
  );
}

