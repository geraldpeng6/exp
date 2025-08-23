"use client";
import { Viewer } from "@bytemd/react";
import gfm from "@bytemd/plugin-gfm";
import highlightSsr from "@bytemd/plugin-highlight-ssr";
import math from "@bytemd/plugin-math";
import type { BytemdPlugin } from "bytemd";
import { visit } from "unist-util-visit";
import { createSlug } from "@/lib/slug";
import "katex/dist/katex.min.css";
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

// 迁移到 lib/slug.ts 的公共实现（此处仅保留导入）

// ByteMD 自定义插件：
// 1) 将 "language-latex/tex/math" 代码块渲染为 KaTeX 公式（DOM 层）
// 2) 将 GitHub 风格提示块 [!NOTE] 等转换为样式化的提示框（AST 层，避免水合回退）
const admonitionAndLatexPlugin: BytemdPlugin = {
  // 将 latex/tex/math 语言的代码围栏在 remark 阶段转换为 math 块，交由 @bytemd/plugin-math SSR 渲染
  remark(processor) {
    return processor.use(function latexCodeToMathRemark() {
      return (tree: any) => {
        // 仅清理 KaTeX 常见问题的零宽字符与 BOM（保留换行/空格等 Markdown 结构）
        const INVISIBLES = /[\u180E\u00AD\u200B-\u200F\uFEFF\u202A-\u202E\u2060-\u2064\u2066-\u2069]/g;
        const NBSP = /[\u00A0\u202F]/g;
        const normalizeMath = (v: string) => ((v || '').replace(INVISIBLES, '').replace(NBSP, ' '));
        // 代码围栏 -> math
        visit(tree as any, 'code' as any, (node: any, index?: number, parent?: any) => {
          const lang = (node.lang || '').toLowerCase();
          if (!parent || typeof index !== 'number') return;
          if (['latex', 'tex', 'math'].includes(lang)) {
            const value = normalizeMath(node.value || '');
            parent.children.splice(index, 1, { type: 'math', value });
          }
        });
        // 清理 remark-math 产生的 math/inlineMath 节点中的不可见字符
        visit(tree as any, 'math' as any, (node: any) => {
          node.value = normalizeMath(node.value || '');
        });
        visit(tree as any, 'inlineMath' as any, (node: any) => {
          node.value = normalizeMath(node.value || '');
        });
      };
    });
  },
  rehype(processor) {
    return processor.use(function admonitionRehypePlugin() {
      return (tree: any) => {
        const getText = (node: any): string => {
          if (!node) return "";
          if (node.type === "text") return node.value || "";
          if (Array.isArray(node.children)) return node.children.map(getText).join("");
          return "";
        };

        // 1) 为所有 h1-h6 生成（或规范化）GitHub 风格的 id（保留中文），并保证唯一
        const usedIds = new Set<string>();
        visit(tree as any, 'element' as any, (node: any) => {
          const tag = node.tagName;
          if (!/^h[1-6]$/.test(tag)) return;
          const text = getText(node).trim();
          let base = createSlug(text) || 'section';
          let finalId = base;
          let n = 1;
          while (usedIds.has(finalId)) {
            finalId = `${base}-${n++}`;
          }
          usedIds.add(finalId);
          node.properties = node.properties || {};
          node.properties.id = finalId;
        });

        // 2) 将 GitHub 风格提示块 [!NOTE] 等转换为结构化的提示框
        visit(tree as any, 'element' as any, (node: any, index?: number, parent?: any) => {
          if (!parent || node.tagName !== 'blockquote') return;
          const children = node.children || [];
          if (!children.length) return;

          // 兼容首节点为换行/text 的情况，直接对整个 blockquote 文本做匹配
          const wholeText = getText(node).trim();
          const m = wholeText.match(/^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION|INFO|SUCCESS)\]\s*([\s\S]*)$/i);
          if (!m) return;
          const type = m[1].toLowerCase();

          // 优先从第一段里切出内联标题后的内容，否则退化为整段内容
          let inlineText = '';
          const firstEl = children.find((ch: any) => ch && ch.type === 'element');
          if (firstEl) {
            const t = getText(firstEl).trim();
            inlineText = (t.replace(/^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION|INFO|SUCCESS)\]\s*/i, '') || '').trim();
          } else {
            inlineText = (m[2] || '').trim();
          }

          const titleMap: Record<string, string> = {
            note: 'Note',
            tip: 'Tip',
            warning: 'Warning',
            important: 'Important',
            caution: 'Caution',
            info: 'Info',
            success: 'Success',
          };
          const iconMap: Record<string, string> = {
            note: '📝',
            tip: '💡',
            warning: '⚠️',
            important: '❗',
            caution: '🚫',
            info: 'ℹ️',
            success: '✅',
          };
          const icon = iconMap[type] || '';

          // 内容区域：行内文本 + 余下的节点（排除第一段）
          const contentChildren: any[] = [];
          if (inlineText) {
            contentChildren.push({
              type: 'element',
              tagName: 'p',
              properties: {},
              children: [{ type: 'text', value: inlineText }],
            });
          }
          for (let i = 1; i < children.length; i++) {
            contentChildren.push(children[i]);
          }

          const wrapper: any = {
            type: 'element',
            tagName: 'div',
            properties: { className: ['admonition', `admonition-${type}`] },
            children: [
              {
                type: 'element',
                tagName: 'div',
                properties: { className: ['admonition-title'] },
                children: [{ type: 'text', value: icon ? `${icon} ${titleMap[type] || type.toUpperCase()}` : (titleMap[type] || type.toUpperCase()) }],
              },
              {
                type: 'element',
                tagName: 'div',
                properties: { className: ['admonition-content'] },
                children: contentChildren,
              },
            ],
          };

          if (typeof index === 'number' && parent && Array.isArray(parent.children)) {
            parent.children.splice(index, 1, wrapper);
          }
        });

        // 3) 包装 KaTeX 块级节点为 .math-block，便于样式控制
        visit(tree as any, 'element' as any, (node: any, index?: number, parent?: any) => {
          if (!parent || node.tagName !== 'span') return;
          const cls = (node.properties && node.properties.className) || [];
          const hasDisplay = Array.isArray(cls) ? cls.includes('katex-display') : (typeof cls === 'string' && cls.split(/\s+/).includes('katex-display'));
          if (!hasDisplay) return;
          if (typeof index !== 'number') return;
          const wrapper: any = {
            type: 'element',
            tagName: 'div',
            properties: { className: ['math-block'] },
            children: [node],
          };
          parent.children.splice(index, 1, wrapper);
        });

        // 4) 兜底：在 rehype 阶段再次清理所有文本节点中的不可见字符
        // 这一步可移除仍然混入到 KaTeX 输出结构中的零宽字符，避免控制台告警与渲染异常
        const INVISIBLES = /[\u180E\u00AD\u200B-\u200F\uFEFF\u202A-\u202E\u2060-\u2064\u2066-\u2069]/g;
        const NBSP = /[\u00A0\u202F]/g;
        visit(tree as any, 'text' as any, (node: any) => {
          if (typeof node.value === 'string' && (INVISIBLES.test(node.value) || NBSP.test(node.value))) {
            node.value = node.value.replace(INVISIBLES, '').replace(NBSP, ' ');
          }
        });
      };
    });
  },
  viewerEffect(ctx) {
    // DOM 层不做任何渲染兜底，全部依赖 remark/rehype 管线，避免水合冲突与重复逻辑
    return () => {};
  },
};

export default function MarkdownViewer({
  markdown,
  onRendered,
}: {
  markdown: string;
  onRendered?: (toc: TocItem[]) => void;
}) {
  // 全局清理不可见字符，避免 KaTeX 与选择器异常
  const cleanedMarkdown = useMemo(() => (markdown || '').
    replace(/[\u180E\u00AD\u200B-\u200F\uFEFF\u202A-\u202E\u2060-\u2064\u2066-\u2069]/g, '').
    replace(/[\u00A0\u202F]/g, ' ')
  , [markdown]);

  // 配置插件：GFM + math(katex先解析$) + 自定义（admonition + 代码围栏->math清理） + 高亮
  const plugins = useMemo(() => [
    gfm(),
    // 先由 math 插件把 $/$$ 解析为 math/inlineMath，便于我们在后续 remark 中清理不可见字符
    math({ katexOptions: { strict: 'ignore', trust: true, throwOnError: false } as any }),
    // 我们的插件：remark(清理 math/inlineMath 与将 latex/tex/math 代码围栏转为 math)；rehype(admonition + heading id)
    admonitionAndLatexPlugin,
    highlightSsr(),
  ], []);

  useEffect(() => {
    // 渲染后生成目录和添加复制按钮
    const timer = setTimeout(() => {
      const markdownBody = document.querySelector(".markdown-body");
      if (markdownBody) {
        // 为标题生成目录（ID 已由 rehype 阶段生成；若缺失则以公共 createSlug 兜底）
        const headings = markdownBody.querySelectorAll("h1, h2, h3, h4, h5, h6");
        const toc: TocItem[] = [];
        const seen = new Set<string>();

        headings.forEach((heading, index) => {
          const el = heading as HTMLElement;
          const text = (el.textContent || "").trim();
          const level = Number(el.tagName.substring(1));

          let id = el.id && typeof el.id === 'string' ? el.id : '';
          if (!id) {
            id = createSlug(text) || `heading-${index}`;
            // 若页面上已有同名 id，追加后缀
            let base = id, n = 1;
            while (document.getElementById(id)) id = `${base}-${n++}`;
            el.id = id;
          }
          if (seen.has(id)) return; // 避免重复
          seen.add(id);

          if (level <= 4) {
            toc.push({ id, text, level });
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
                // 退回到旧的方式：创建临时 textarea 尝试复制（某些环境可能被限制）
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.setAttribute('readonly', '');
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
                textarea.style.top = '0';
                document.body.appendChild(textarea);
                try {
                  textarea.select();
                  document.execCommand && document.execCommand('copy');
                } finally {
                  document.body.removeChild(textarea);
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
                  durationMs: 1200
                });
              }, 100);
            });
          }
        };

        // Initial hash navigation
        handleHashNavigation();

        // Intercept in-page anchor clicks inside markdown to avoid invalid CSS selector errors
        import("@/lib/anchors").then(({ interceptInPageAnchors }) => {
          const cleanup = interceptInPageAnchors(markdownBody, () => {
            handleHashNavigation();
          });
          // 挂到元素上，unmount 时清理
          (markdownBody as any).__anchorCleanup = cleanup;
        });

        // Listen for hash changes (browser back/forward)
        const handlePopState = () => {
          handleHashNavigation();
        };

        window.addEventListener('popstate', handlePopState);
        window.addEventListener('hashchange', handlePopState);

        return () => {
          try { (markdownBody as any).__anchorCleanup?.(); } catch {}
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
      <Viewer value={cleanedMarkdown} plugins={plugins} />
    </div>
  );
}

