"use client";
// 滚动与高亮工具：模块化、可复用、可热插拔（中文注释）
// 目标：
// - 将任意元素平滑滚动到视口居中位置
// - 在目标元素上播放 rough-notation 的 highlight 动效，并在结束后移除

import { annotate } from "rough-notation";

// 记录元素上的高亮实例，便于重复点击时清理
const activeAnnotations = new WeakMap<Element, any>();

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
export function highlightOnce(el: Element, options?: { color?: string; durationMs?: number }) {
  // Detect theme and adjust color accordingly
  const isDarkMode = document.documentElement.classList.contains('dark') ||
                     window.matchMedia('(prefers-color-scheme: dark)').matches;

  const defaultColor = isDarkMode ? "#fbbf24" : "#fde68a"; // Amber for dark, lighter amber for light
  const { color = defaultColor, durationMs = 1200 } = options || {};

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
  const el = document.getElementById(id);
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
  window.setTimeout(() => highlightOnce(el, { color, durationMs }), delayMs);
}

