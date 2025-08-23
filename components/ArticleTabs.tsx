"use client";
import { useState, useMemo } from "react";
import { Tab } from "@headlessui/react";
import { Clock, TrendingUp, Code, MessageCircle } from "lucide-react";
import Link from "next/link";
import { ArticleMeta } from "@/lib/articles";

interface ArticleTabsProps {
  articles: ArticleMeta[];
  popularArticles?: string[]; // 热门文章的 slug 列表
}

export default function ArticleTabs({ articles, popularArticles = [] }: ArticleTabsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 分类文章
  const categorizedArticles = useMemo(() => {
    // 最近发布 - 按时间排序
    const recent = [...articles].sort((a, b) => +new Date(b.date) - +new Date(a.date));
    
    // 热门 - 根据热门文章列表排序
    const popular = articles.filter(article => popularArticles.includes(article.slug))
      .sort((a, b) => popularArticles.indexOf(a.slug) - popularArticles.indexOf(b.slug));
    
    // 技术分享 - 包含技术相关标签的文章
    const tech = articles.filter(article => 
      article.tags?.some(tag => 
        ['技术', 'tech', 'javascript', 'react', 'nextjs', 'typescript', 'web', '前端', '后端', '开发'].includes(tag.toLowerCase())
      )
    );
    
    // 杂谈 - 其他文章
    const misc = articles.filter(article => 
      !article.tags?.some(tag => 
        ['技术', 'tech', 'javascript', 'react', 'nextjs', 'typescript', 'web', '前端', '后端', '开发'].includes(tag.toLowerCase())
      )
    );

    return { recent, popular, tech, misc };
  }, [articles, popularArticles]);

  const tabs = [
    {
      name: "最近发布",
      icon: Clock,
      articles: categorizedArticles.recent,
      color: "text-blue-600"
    },
    {
      name: "热门",
      icon: TrendingUp,
      articles: categorizedArticles.popular,
      color: "text-red-600"
    },
    {
      name: "技术分享",
      icon: Code,
      articles: categorizedArticles.tech,
      color: "text-green-600"
    },
    {
      name: "杂谈",
      icon: MessageCircle,
      articles: categorizedArticles.misc,
      color: "text-purple-600"
    }
  ];

  return (
    <div className="w-full">
      <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
        <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 p-1">
          {tabs.map((tab, index) => (
            <Tab
              key={tab.name}
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 px-3 text-sm font-medium leading-5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
                  selected
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:bg-white/[0.12] hover:text-gray-900'
                }`
              }
            >
              {({ selected }) => (
                <div className="flex items-center justify-center space-x-2">
                  <tab.icon className={`h-4 w-4 ${selected ? tab.color : 'text-gray-500'}`} />
                  <span className="sr-only">{tab.name}</span>
                </div>
              )}
            </Tab>
          ))}
        </Tab.List>
        
        <Tab.Panels className="mt-6">
          {tabs.map((tab, index) => (
            <Tab.Panel
              key={index}
              className="rounded-xl bg-white p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              {tab.articles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <tab.icon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>暂无{tab.name}文章</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {tab.articles.map((article) => (
                    <li key={article.slug} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                      <Link 
                        href={`/articles/${article.slug}`} 
                        className="block hover:bg-gray-50 rounded-lg p-3 transition-colors duration-200"
                      >
                        <h3 className="font-semibold text-gray-900 mb-2">{article.title}</h3>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>{new Date(article.date).toLocaleDateString()}</span>
                          {article.tags && article.tags.length > 0 && (
                            <div className="flex space-x-1">
                              {article.tags.slice(0, 2).map((tag) => (
                                <span 
                                  key={tag}
                                  className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                                >
                                  {tag}
                                </span>
                              ))}
                              {article.tags.length > 2 && (
                                <span className="text-gray-400 text-xs">+{article.tags.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>
                        {article.summary && (
                          <p className="mt-2 text-gray-600 text-sm line-clamp-2">{article.summary}</p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
