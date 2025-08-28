"use client";
import { useState, useMemo, useEffect } from "react";
import { Clock, TrendingUp, Code, MessageCircle, Eye, Heart } from "lucide-react";
import Link from "next/link";
import { ArticleMeta } from "@/lib/articles";
import { Tab } from "@headlessui/react";

interface ArticleTabsProps {
  articles: ArticleMeta[];
  popularArticles?: string[]; // 热门文章的 slug 列表
}

export default function ArticleTabsSimple({ articles, popularArticles = [] }: ArticleTabsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showTabText, setShowTabText] = useState(true); // Default to true for SSR

  // Handle responsive behavior on client side
  useEffect(() => {
    const handleResize = () => {
      setShowTabText(window.innerWidth > 640);
    };

    // Set initial value
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 分类文章
  const categorizedArticles = useMemo(() => {
    // 最近发布 - 按时间排序
    const recent = [...articles].sort((a, b) => +new Date(b.date) - +new Date(a.date));

    // 热门 - 根据热门文章列表排序（点赞+评论综合）
    const popular = articles
      .filter(article => popularArticles.includes(article.slug))
      .sort((a, b) => popularArticles.indexOf(a.slug) - popularArticles.indexOf(b.slug));

    // 技术分享 - 标签包含：技术、技术分享、AI、LLM
    const techTags = new Set(['技术', '技术分享', 'ai', 'llm']);
    const tech = articles.filter(article =>
      (article.tags || []).some(tag => techTags.has(String(tag).toLowerCase()))
    );

    // 杂谈 - 标签包含：杂谈、闲聊
    const miscTags = new Set(['杂谈', '闲聊']);
    const misc = articles.filter(article =>
      (article.tags || []).some(tag => miscTags.has(String(tag)))
    );

    return { recent, popular, tech, misc };
  }, [articles, popularArticles]);

  const tabs = [
    {
      name: "最近发布",
      icon: Clock,
      articles: categorizedArticles.recent,
      color: "#3b82f6"
    },
    {
      name: "热门",
      icon: TrendingUp,
      articles: categorizedArticles.popular,
      color: "#ef4444"
    },
    {
      name: "技术分享",
      icon: Code,
      articles: categorizedArticles.tech,
      color: "#10b981"
    },
    {
      name: "杂谈",
      icon: MessageCircle,
      articles: categorizedArticles.misc,
      color: "#8b5cf6"
    }
  ];

  return (
    <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
      <Tab.List className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-6">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <Tab
              key={tab.name}
              className={({ selected }) =>
                `flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg
                font-medium text-sm transition-all duration-200 outline-none
                ${selected
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-900/50'
                }`
              }
            >
              <IconComponent className="w-4 h-4" />
              <span className={showTabText ? 'inline' : 'hidden sm:inline'}>
                {tab.name}
              </span>
            </Tab>
          );
        })}
      </Tab.List>

      <Tab.Panels>
        {tabs.map((tab, index) => {
          const IconComponent = tab.icon;

          return (
            <Tab.Panel key={index}>
              {tab.articles.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <IconComponent className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p>暂无{tab.name}文章</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tab.articles.map((article) => (
                    <div
                      key={article.slug}
                      className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0"
                    >
                      <Link
                        href={`/articles/${article.slug}`}
                        className="block p-3 rounded-lg -mx-3 transition-all duration-200
                          hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                      >
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-base leading-relaxed">
                          {article.title}
                        </h3>

                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <span>{new Date(article.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' })}</span>
                          {article.tags && article.tags.length > 0 && (
                            <div className="flex gap-1">
                              {article.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400
                                    rounded-full text-xs"
                                >
                                  {tag}
                                </span>
                              ))}
                              {article.tags.length > 2 && (
                                <span className="text-gray-400 dark:text-gray-500 text-xs">
                                  +{article.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 统计行 */}
                        <StatsRow slug={article.slug} />

                        {article.summary && (
                          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed line-clamp-2">
                            {article.summary}
                          </p>
                        )}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </Tab.Panel>
          );
        })}
      </Tab.Panels>
    </Tab.Group>
  );
}


function StatsRow({ slug }: { slug: string }) {
  const [data, setData] = useState<{ pv: number; likes: number; comments: number } | null>(null);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch(`/api/articles/stats?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
        const j = await res.json().catch(() => ({}));
        const d = j?.data?.[slug];
        if (!aborted && d) setData(d);
      } catch {}
    })();
    return () => { aborted = true; };
  }, [slug]);

  return (
    <div className="mt-2 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
      <div className="group relative inline-flex items-center gap-1">
        <Eye className="w-3.5 h-3.5" />
        <span>{data?.pv ?? 0}</span>
        <span className="absolute left-5 -top-6 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 pointer-events-none">阅读数</span>
      </div>
      <div className="group relative inline-flex items-center gap-1">
        <Heart className="w-3.5 h-3.5" />
        <span>{data?.likes ?? 0}</span>
        <span className="absolute left-5 -top-6 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 pointer-events-none">点赞数</span>
      </div>
      <div className="group relative inline-flex items-center gap-1">
        <MessageCircle className="w-3.5 h-3.5" />
        <span>{data?.comments ?? 0}</span>
        <span className="absolute left-5 -top-6 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 pointer-events-none">评论数</span>
      </div>
    </div>
  );
}
