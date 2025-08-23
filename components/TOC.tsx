"use client";
import { useEffect, useState } from "react";
import { TocItem } from "./MarkdownViewer";
import { focusHeadingById } from "@/lib/scroll";
import { createSlug } from "@/lib/slug";

// 极简的目录组件
export default function TOC({ toc }: { toc: TocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // 监听滚动，高亮当前章节
  useEffect(() => {
    if (toc.length === 0) return;

    const handleScroll = () => {
      const headings = toc
        .map((item) => ({ id: item.id, element: document.getElementById(item.id) }))
        .filter((item) => item.element);

      // 找到当前在视口中的标题
      for (const { id, element } of headings) {
        const rect = element!.getBoundingClientRect();
        if (rect.top >= 0 && rect.top <= 200) {
          setActiveId(id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // 初始化

    return () => window.removeEventListener("scroll", handleScroll);
  }, [toc]);

  // 更健壮的元素查找（ID 不存在时按文本匹配）
  const findHeadingElement = (id: string, text?: string): HTMLElement | null => {
    // 1) 直接按 id 查找
    const byId = document.getElementById(id) as HTMLElement | null;
    if (byId) return byId;

    // 2) CSS.escape 兜底（少数特殊字符）
    try {
      // @ts-ignore - CSS.escape 可能不存在于某些 TS 环境声明
      const esc = (window.CSS?.escape ? window.CSS.escape(id) : id) as string;
      const bySelector = document.querySelector(`#${esc}`) as HTMLElement | null;
      if (bySelector) return bySelector;
    } catch {}

    // 3) 按文本兜底匹配（只在 markdown 范围内）
    if (text) {
      const headings = Array.from(
        document.querySelectorAll(
          ".markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6"
        )
      ) as HTMLElement[];
      const target = headings.find((h) => (h.textContent || "").trim() === text.trim());
      if (target) {
        // 若 DOM 上没有 id，则补上，便于后续 hash 导航
        if (!target.id) target.id = id;
        return target;
      }
    }

    return null;
  };

  // 点击处理（支持 URL hash、滚动与高亮，带兜底重试）
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, item: TocItem) => {
    e.preventDefault();

    const go = () => {
      const el = findHeadingElement(item.id, item.text);
      if (!el) {
        console.error(`Cannot find element with id: ${item.id}`);
        return false;
      }

      // 同步 URL hash（便于分享/回退），使用 encode 兼容中文
      try {
        const hash = `#${encodeURIComponent(item.id)}`;
        if (history.pushState) history.pushState(null, "", hash);
        else window.location.hash = hash;
      } catch {}

      // 滚动并高亮（不传色值，交由 scroll.ts 按浅/深色主题自动选择，确保两个 TOC 一致）
      focusHeadingById(item.id, { behavior: "smooth", delayMs: 300, durationMs: 1200 });
      setActiveId(item.id);
      return true;
    };

    // 立即尝试，失败则短暂重试一次（处理极端竞态）
    if (!go()) {
      setTimeout(go, 150);
    }
  };

  if (toc.length === 0) return null;

  return (
    <div className="p-4">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">目录</h3>
      <nav className="space-y-1">
        {toc.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => handleClick(e, item)}
            className={`
              block py-1.5 px-3 text-sm rounded transition-colors
              hover:bg-gray-100 dark:hover:bg-gray-800
              ${activeId === item.id
                ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                : "text-gray-600 dark:text-gray-400"}
            `}
            style={{ paddingLeft: `${12 + (item.level - 1) * 12}px` }}
          >
            {item.text}
          </a>
        ))}
      </nav>
    </div>
  );
}
