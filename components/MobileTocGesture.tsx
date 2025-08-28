"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TocItem } from "./MarkdownViewer";
import { focusHeadingById } from "@/lib/scroll";
import { Menu } from "lucide-react";

// 移动端目录按钮的“短按/长按 + 拖动”交互：
// - 长按后，按钮左侧出现简略目录；按住上下滑动可在标题间快速预览/跳转（松开时跳转）
// - 短按：打开或切换目录抽屉
// 注：已移除“回到顶部”相关交互
export default function MobileTocGesture({ toc, onOpenSidebar, isSidebarOpen: _isSidebarOpen, onToggleSidebar }: { toc: TocItem[]; onOpenSidebar?: () => void; isSidebarOpen?: boolean; onToggleSidebar?: () => void }) {
  // touch prop to avoid unused warning
  void _isSidebarOpen;
  const [overlay, setOverlay] = useState<
    | { mode: "none" }
    | { mode: "scrub"; pointerId: number; x: number; y: number; activeIndex: number }
  >({ mode: "none" });

  // 定时器/状态引用
  const longPressTimer = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const startAt = useRef(0);
  const actionTaken = useRef(false); // 是否已触发某个动作（避免重复）

  // 交互阈值（仅移动端）
  const LONG_PRESS_MS = 900; // 更长的长按时间
  const TAP_MAX_MOVE_PX = 10; // 视为“点击”的最大移动
  const ITEM_H = 28; // 快速目录每项高度
  const MAX_W = 200; // 简略目录最大宽度

  // 简化为仅显示到 h2（包含 h1 与 h2），移动端更易用
  const flatToc = useMemo(() => toc.filter(t => t.level <= 2), [toc]);

  const clearTimers = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const endOverlay = useCallback(() => {
    clearTimers();
    setOverlay({ mode: "none" });
  }, []);



  // 计算基于 y 的目录索引
  const computeIndexByY = useCallback((y: number) => {
    const root = rootRef.current;
    const list = root?.querySelector(".mtg-scrub") as HTMLElement | null;
    if (!list) return -1;
    const r = list.getBoundingClientRect();
    const idx = Math.round((y - r.top) / ITEM_H);
    return Math.max(0, Math.min(flatToc.length - 1, idx));
  }, [flatToc.length]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (window.innerWidth >= 1024) return; // 仅移动端
    (e.target as Element).setPointerCapture?.(e.pointerId);

    // 记录起点与初始状态
    startX.current = e.clientX;
    startY.current = e.clientY;
    startAt.current = Date.now();
    actionTaken.current = false;

    // 安排长按：进入“目录快滑”
    longPressTimer.current = window.setTimeout(() => {
      if (actionTaken.current) return; // 若已回顶/已打开抽屉，则不再进入快滑
      setOverlay(prev => {
        const y = (prev.mode !== "none" ? prev.y : e.clientY);
        const x = (prev.mode !== "none" ? prev.x : e.clientX);
        const idx = flatToc.length ? computeIndexByY(y) : -1;
        return { mode: "scrub", pointerId: e.pointerId, x, y, activeIndex: idx };
      });
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    setOverlay(prev => {
      if (prev.mode === "none" || prev.pointerId !== e.pointerId) return prev;
      if (prev.mode === "scrub") {
        const idx = flatToc.length ? computeIndexByY(e.clientY) : -1;
        if (idx !== prev.activeIndex && idx >= 0 && idx < flatToc.length) {
          try {
            focusHeadingById(flatToc[idx].id, { behavior: "auto", delayMs: 0 });
          } catch {}
        }
        return { ...prev, x: e.clientX, y: e.clientY, activeIndex: idx };
      }
      return prev;
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const current = overlay;

    // 若已处于某种 overlay 状态，根据模式处理
    if (current.mode !== "none" && current.pointerId === e.pointerId) {
      if (current.mode === "scrub") {
        const idx = current.activeIndex;
        if (idx >= 0 && idx < flatToc.length) {
          const id = flatToc[idx].id;
          focusHeadingById(id, { behavior: "smooth", delayMs: 150, durationMs: 800 });
        }
      }
      endOverlay();
      return;
    }

    // 未发生长按/上滑等动作：判断为“短按” -> 打开侧边目录抽屉
    const dt = Date.now() - startAt.current;
    const moveDist = Math.hypot(e.clientX - startX.current, e.clientY - startY.current);
    if (!actionTaken.current && dt < LONG_PRESS_MS && moveDist <= TAP_MAX_MOVE_PX) {
      actionTaken.current = true;
      try {
        if (onToggleSidebar) {
          onToggleSidebar();
        } else {
          onOpenSidebar?.();
        }
      } catch {}
    }
    endOverlay();
  };

  const onPointerCancel = () => endOverlay();

  // 清理
  useEffect(() => () => clearTimers(), []);

  // 渲染 UI
  const showScrub = overlay.mode === "scrub";

  return (
    <div ref={rootRef} className="lg:hidden fixed bottom-20 right-4 z-50 select-none touch-none">
      {/* 主按钮 */}
      <button
        className="mtg-main-btn w-12 h-12 rounded-full shadow-lg bg-white dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        aria-label="目录/快速导航"
      >
        <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>

      {/* 简略目录（长按后显示在左侧） */}
      {showScrub && (
        <div className="mtg-scrub absolute bottom-0 right-16 max-h-[60vh] overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-2xl rounded-lg"
             style={{ width: Math.min(MAX_W, 200) }}>
          <div className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">快速跳转</div>
          <ul className="py-1">
            {flatToc.map((item, i) => {
              const active = overlay.mode === "scrub" && overlay.activeIndex === i;
              return (
                <li key={item.id}
                    className={`text-sm px-3 h-[28px] leading-[28px] truncate ${active ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                    style={{ paddingLeft: `${4 + (item.level - 1) * 8}px` }}>
                  {item.text}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

