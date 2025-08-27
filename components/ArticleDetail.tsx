"use client";
import MarkdownViewer, { TocItem } from "./MarkdownViewer";
import TOC from "./TOC";
import LikeButton from "./LikeButton";
import ArticleShareMenu from "./ArticleShareMenu";
import Comments from "./Comments";
import ScrollProgress from "./ScrollProgress";
import Paper from "./Paper";
import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";

// 客户端文章详情：管理 TOC 状态（中文注释）
export interface ArticleClientData {
  slug: string;
  title: string;
  date: string;
  tags?: string[];
  content: string;
}

export default function ArticleDetail({ a }: { a: ArticleClientData }) {
  const [toc, setToc] = useState<TocItem[]>([]);
  const [tocCollapsed, setTocCollapsed] = useState(false);
  const [showToggleBtn, setShowToggleBtn] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const startedAtEdge = useRef<boolean>(false);

  // 手势参数（更高的右滑展开阈值 + 左边缘触发 + 横向优先）
  const EDGE_START_MAX_X = 32; // 仅当从屏幕左侧一定距离内开始才允许右滑展开
  const OPEN_THRESHOLD = 100; // 右滑展开需要更大的滑动距离
  const CLOSE_THRESHOLD = 80; // 左滑关闭的阈值
  const VERTICAL_TOLERANCE = 24; // 纵向容忍度，超过则认为是纵向滚动

  // 处理移动端滑动手势
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      touchStartX.current = t.clientX;
      touchStartY.current = t.clientY;
      touchEndX.current = t.clientX;
      touchEndY.current = t.clientY;
      startedAtEdge.current = t.clientX <= EDGE_START_MAX_X;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      touchEndX.current = t.clientX;
      touchEndY.current = t.clientY;
    };

    const handleTouchEnd = () => {
      if (
        touchStartX.current === null ||
        touchStartY.current === null ||
        touchEndX.current === null ||
        touchEndY.current === null
      ) {
        return;
      }

      const dx = touchEndX.current - touchStartX.current;
      const dy = touchEndY.current - touchStartY.current;
      const isHorizontal = Math.abs(dx) > Math.abs(dy) + VERTICAL_TOLERANCE;

      // 右滑显示目录：仅当从左侧边缘开始，且横向明显，且移动距离足够
      if (dx > OPEN_THRESHOLD && isHorizontal && tocCollapsed && startedAtEdge.current) {
        setTocCollapsed(false);
      }
      // 左滑隐藏目录：横向明显，且移动距离足够
      if (dx < -CLOSE_THRESHOLD && isHorizontal && !tocCollapsed) {
        setTocCollapsed(true);
      }

      touchStartX.current = null;
      touchStartY.current = null;
      touchEndX.current = null;
      touchEndY.current = null;
      startedAtEdge.current = false;
    };

    // 只在移动端添加滑动监听
    if (window.innerWidth < 1024) {
      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [tocCollapsed]);

  return (
    <>
      <ScrollProgress />
      <div className="relative transition-all duration-300 lg:pl-64">
        {/* 桌面端：鼠标悬浮区域 */}
      <div
        className="hidden lg:block fixed left-0 top-0 w-20 h-full z-40"
        onMouseEnter={() => {
          if (tocCollapsed) {
            setShowToggleBtn(true);
          }
        }}
        onMouseLeave={() => {
          if (tocCollapsed) {
            // 延迟隐藏，给用户时间移动到按钮上
            setTimeout(() => {
              setShowToggleBtn(false);
            }, 200);
          }
        }}
      />

      {/* 桌面端：目录展开/收起按钮 */}
      <button
        onClick={() => setTocCollapsed(!tocCollapsed)}
        className="hidden lg:flex fixed top-1/2 -translate-y-1/2 z-50 items-center justify-center
          w-6 h-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm
          rounded-r-lg shadow-lg hover:shadow-xl
          hover:bg-white dark:hover:bg-gray-800
          group transition-all duration-300"
        style={{
          left: tocCollapsed ? 0 : '240px',
          opacity: tocCollapsed ? (showToggleBtn ? 1 : 0) : 1,
          transform: `translateY(-50%) translateX(${tocCollapsed && !showToggleBtn ? '-100%' : '0'})`,
          pointerEvents: tocCollapsed && !showToggleBtn ? 'none' : 'auto'
        }}
        onMouseEnter={() => {
          if (tocCollapsed) {
            setShowToggleBtn(true);
          }
        }}
        onMouseLeave={() => {
          if (tocCollapsed) {
            setShowToggleBtn(false);
          }
        }}
        title={tocCollapsed ? "展开目录" : "收起目录"}
        aria-label={tocCollapsed ? "展开目录" : "收起目录"}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {tocCollapsed ? (
            <ChevronRight className="w-3 h-3 text-gray-500 dark:text-gray-400
              group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-gray-500 dark:text-gray-400
              group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
          )}
        </div>
      </button>

      {/* 桌面端：贯穿全高的左侧分隔线（仅在目录展开时显示） */}
      {!tocCollapsed && (
        <div className="hidden lg:block fixed inset-y-0 left-60 border-r border-gray-200 dark:border-gray-800 z-30 pointer-events-none" />
      )}

      {/* 移动端：目录按钮（始终显示） */}
      <button
        onClick={() => setTocCollapsed(!tocCollapsed)}
        className="lg:hidden fixed bottom-20 right-4 z-50 flex items-center justify-center
          w-12 h-12 bg-white dark:bg-gray-800
          rounded-full shadow-lg hover:shadow-xl
          transition-all duration-300"
        aria-label={tocCollapsed ? "展开目录" : "收起目录"}
      >
        <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      {/* 桌面端目录侧边栏 */}
      <aside className={`fixed left-0 top-20 w-60 h-[calc(100vh-5rem)]
        overflow-y-auto transition-all duration-300 z-40
        ${tocCollapsed ? '-translate-x-full' : 'translate-x-0 border-r border-gray-200 dark:border-gray-800'}
        hidden lg:block`}>
        <TOC toc={toc} />
      </aside>

      {/* 移动端目录侧边栏 */}
      <aside className={`lg:hidden fixed left-0 top-0 w-72 h-full
        bg-white dark:bg-gray-900
        overflow-y-auto transition-transform duration-300 z-50
        ${tocCollapsed ? '-translate-x-full' : 'translate-x-0'}
        shadow-2xl`}>
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-end">
          <button
            onClick={() => setTocCollapsed(true)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="关闭目录"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <TOC toc={toc} onItemClick={() => setTocCollapsed(true)} />
      </aside>

      {/* 移动端遮罩层 */}
      {!tocCollapsed && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setTocCollapsed(true)}
        />
      )}

      {/* 文章内容（纸张质感容器） */}
      <div className="max-w-5xl mx-auto transition-all duration-300 lg:max-w-6xl lg:mr-8">
        <Paper className="p-6 md:p-8">
          <article>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {a.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-6">
              <time dateTime={a.date}>
                {new Date(a.date).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </time>
              {a.tags && a.tags.length > 0 && (
                <>
                  <span className="text-gray-400 dark:text-gray-600">·</span>
                  <div className="flex gap-2">
                    {a.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-md text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
            <MarkdownViewer markdown={a.content} onRendered={setToc} />
            <div className="flex items-center gap-2 py-4">
              <LikeButton id={a.slug} />
              <ArticleShareMenu
                title={a.title}
                content={a.content}
                date={a.date}
                tags={a.tags}
                slug={a.slug}
              />
            </div>
            <Comments articleId={a.slug} />
          </article>
        </Paper>
      </div>
    </div>
    </>
  );
}

