"use client";
// 滚动与高亮工具：模块化、可复用、可热插拔（中文注释）
// 目标：
// - 将任意元素平滑滚动到视口居中位置
// - 在目标元素上播放 rough-notation 的 highlight 动效，并在结束后移除

import { annotate } from "rough-notation";
import { createSlug } from "@/lib/slug";

// 统一的高亮黄色（与所有 TOC/锚点行为保持一致）
export const HIGHLIGHT_YELLOW_LIGHT = "rgb(253, 230, 138)"; // #fde68a（amber-300）
export const HIGHLIGHT_YELLOW_DARK = "rgb(192, 132, 252)";  // #c084fc（purple-400，暗黑模式更醒目）
// 兼容旧用法（默认导出为浅色，调用方应尽量不传 color，让本模块按主题自动选择）
export const HIGHLIGHT_YELLOW = HIGHLIGHT_YELLOW_LIGHT;

// 记录元素上的高亮实例，便于重复点击时清理
// 类型尽量贴近 rough-notation 的返回值接口结构
type AnnotationLike = { show?: () => void; hide?: () => void; remove?: () => void };
const activeAnnotations = new WeakMap<Element, AnnotationLike>();

/**
 * 将元素平滑滚动到视口垂直居中
 */
export function scrollElementToCenter(el: Element, behavior: ScrollBehavior = "smooth") {
  // 优先使用原生 API，简洁并能精确居中
  if ("scrollIntoView" in el) {
    (el as HTMLElement).scrollIntoView({ behavior, block: "center", inline: "nearest" });
    return;
  }
  // 兜底：自行计算目标位置
  const rect = (el as HTMLElement).getBoundingClientRect();
  const targetY = window.scrollY + rect.top - window.innerHeight / 2 + rect.height / 2;
  window.scrollTo({ top: targetY, behavior });
}

/**
 * 在元素上播放一次 highlight 动效，播放后自动清理
 */
export function isDarkThemeActive(): boolean {
  // 仅依赖应用的 html.dark class，不受系统偏好干扰
  return document.documentElement.classList.contains('dark');
}

export function highlightOnce(el: Element, options?: { color?: string; durationMs?: number }) {
  // 根据应用主题类选择颜色（避免受系统 prefers-color-scheme 干扰）
  const isDarkMode = isDarkThemeActive();

  const autoColor = isDarkMode ? HIGHLIGHT_YELLOW_DARK : HIGHLIGHT_YELLOW_LIGHT;
  const { color = autoColor, durationMs = 1200 } = options || {};

  // 若已有高亮，先清理，避免叠加
  const prev = activeAnnotations.get(el);
  if (prev) {
    try { prev.hide?.(); } catch {}
    try { prev.remove?.(); } catch {}
    activeAnnotations.delete(el);
  }

  try {
    const a = annotate(el as HTMLElement, {
      type: "highlight",
      color,
      iterations: 1,
      multiline: false, // 改为 false，让高亮自适应文本宽度
      padding: 6, // 稍微增加内边距
      animationDuration: Math.min(1000, Math.max(400, durationMs - 200)),
    });
    a.show();
    activeAnnotations.set(el, a);

    window.setTimeout(() => {
      try {
        a.hide?.();
        // Add a small delay before removing to allow hide animation to complete
        window.setTimeout(() => {
          try { a.remove?.(); } catch {}
          activeAnnotations.delete(el);
        }, 300);
      } catch {}
    }, durationMs);
  } catch (err) {
    console.warn('Failed to create annotation:', err);
  }
}

/**
 * 聚焦到指定 heading 并播放一次高亮
 */
export function focusHeadingById(
  id: string,
  opts?: { behavior?: ScrollBehavior; delayMs?: number; color?: string; durationMs?: number }
) {
  // 优先按原始 id 寻找
  let el: HTMLElement | null = document.getElementById(id);

  // 兜底1：尝试 GitHub 风格前缀 user-content-
  if (!el) {
    el = document.getElementById(`user-content-${id}`);
  }

  // 兜底2：尝试将 id 视为标题文本，转为 slug 后匹配（统一使用公共 createSlug）
  if (!el) {
    const slug = createSlug(id);
    if (slug) {
      el = document.getElementById(slug);
      if (!el) el = document.getElementById(`user-content-${slug}`);
    }
  }

  // 兜底3：遍历 h1-h6，尝试文本等于 id 或 decode 后等于 id
  if (!el) {
    const headings = Array.from(document.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6'));
    const target = headings.find(h => {
      const text = (h.textContent || '').trim();
      return text === id || decodeURIComponent(text) === id;
    });
    if (target) el = target;
  }

  if (!el) {
    console.warn(`Element with id "${id}" not found`);
    return;
  }
  const { behavior = "smooth", delayMs = 420, color, durationMs } = opts || {};

  // 滚动到元素，留出顶部空间
  const yOffset = -100;
  const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
  window.scrollTo({ top: y, behavior });

  // 延迟后高亮
  window.setTimeout(() => highlightOnce(el!, { color, durationMs }), delayMs);
}

