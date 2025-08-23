"use client";
import { Viewer } from "@bytemd/react";
import gfm from "@bytemd/plugin-gfm";
import highlightSsr from "@bytemd/plugin-highlight-ssr";
import "bytemd/dist/index.css";
import "@/app/code-blocks.css";
import "@/app/markdown-styles.css";
import { useEffect, useMemo } from "react";

// 通过解析 heading 生成目录数据
export interface TocItem {
  id: string;
  text: string;
  level: number; // 1-6
}

// 简单的 slug 生成函数
function createSlug(text: string): string {
  // 先处理常见的编号格式 (1.1, 2.2 等)
  let slug = text
    .toLowerCase()
    .trim()
    // 替换点号为连字符
    .replace(/\./g, '-')
    // 移除所有非字母、数字、中文、空格、连字符的字符
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
    // 空格转连字符
    .replace(/\s+/g, '-')
    // 合并多个连字符
    .replace(/-+/g, '-')
    // 去除首尾连字符
    .replace(/^-+|-+$/g, '');

  return slug || 'section';
}

export default function MarkdownViewer({
  markdown,
  onRendered,
}: {
  markdown: string;
  onRendered?: (toc: TocItem[]) => void;
}) {
  // 配置插件：GFM + 代码高亮（SSR版本）
  const plugins = useMemo(() => [
    gfm(),
    highlightSsr() // SSR 版本的 highlight.js 插件，支持服务端渲染
  ], []);

  useEffect(() => {
    // 渲染后生成目录和添加复制按钮
    const timer = setTimeout(() => {
      const markdownBody = document.querySelector(".markdown-body");
      if (markdownBody) {
        // 为标题添加 ID 和生成目录
        const headings = markdownBody.querySelectorAll("h1, h2, h3, h4, h5, h6");
        const toc: TocItem[] = [];
        const usedIds = new Set<string>();

        headings.forEach((heading, index) => {
          const el = heading as HTMLElement;
          const text = el.textContent || "";
          const level = Number(el.tagName.substring(1));

          // 生成 ID
          let id = createSlug(text);
          if (!id) {
            id = `heading-${index}`;
          }

          // 确保 ID 唯一
          let finalId = id;
          let counter = 1;
          while (usedIds.has(finalId)) {
            finalId = `${id}-${counter}`;
            counter++;
          }

          // 设置 ID 到元素上
          el.id = finalId;
          usedIds.add(finalId);



          // 只包含 h1-h4 在目录中
          if (level <= 4) {
            toc.push({
              id: finalId,
              text: text.trim(),
              level
            });
          }
        });

        onRendered?.(toc);

        // 为代码块添加复制按钮
        const codeBlocks = markdownBody.querySelectorAll("pre");
        codeBlocks.forEach((pre) => {
          // 检查是否已经有复制按钮
          if (pre.querySelector(".code-copy-button")) return;

          // 创建复制按钮
          const button = document.createElement("button");
          button.className = "code-copy-button";
          button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
            <span>复制</span>
          `;

          // 添加点击事件
          button.addEventListener("click", async () => {
            const code = pre.querySelector("code");
            if (!code) return;

            const text = code.textContent || "";

            try {
              // 优先使用 Clipboard API（仅在安全上下文，如 HTTPS 或 localhost 可用）
              if (typeof navigator !== 'undefined' && navigator.clipboard && typeof window !== 'undefined' && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
              } else {
                // 退回到旧的方式：创建临时 textarea 并使用 execCommand('copy')
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.setAttribute('readonly', '');
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
                textarea.style.top = '0';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                const ok = document.execCommand('copy');
                document.body.removeChild(textarea);
                if (!ok) {
                  throw new Error('execCommand copy failed');
                }
              }

              // 更新按钮状态
              button.classList.add("copied");
              button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
                <span>已复制</span>
              `;

              // 3秒后恢复原状
              setTimeout(() => {
                button.classList.remove("copied");
                button.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                  </svg>
                  <span>复制</span>
                `;
              }, 3000);
            } catch (err) {
              console.error("复制失败:", err);
              // 显示错误提示
              button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>复制失败</span>
              `;
              setTimeout(() => {
                button.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                  </svg>
                  <span>复制</span>
                `;
              }, 2000);
            }
          });

          pre.appendChild(button);
        });

        // 处理 hash 定位
        const handleHashNavigation = () => {
          const hash = decodeURIComponent(location.hash || "").replace(/^#/, "");
          if (hash) {
            import("@/lib/scroll").then(({ focusHeadingById }) => {
              // Add a small delay to ensure DOM is ready
              setTimeout(() => {
                focusHeadingById(hash, {
                  behavior: 'smooth',
                  delayMs: 300,
                  color: '#fde68a',
                  durationMs: 1200
                });
              }, 100);
            });
          }
        };

        // Initial hash navigation
        handleHashNavigation();

        // Listen for hash changes (browser back/forward)
        const handlePopState = () => {
          handleHashNavigation();
        };

        window.addEventListener('popstate', handlePopState);
        window.addEventListener('hashchange', handlePopState);

        return () => {
          window.removeEventListener('popstate', handlePopState);
          window.removeEventListener('hashchange', handlePopState);
        };
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [markdown, onRendered]);

  // 包一层 markdown-body，确保样式与查询范围一致
  return (
    <div className="markdown-body">
      <Viewer value={markdown} plugins={plugins} />
    </div>
  );
}

