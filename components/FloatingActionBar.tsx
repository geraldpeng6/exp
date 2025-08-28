"use client";

import { useEffect, useState } from "react";
import { ArrowUp, MessageCircle } from "lucide-react";
import AIChatWidget from "./AIChatWidget";

export default function FloatingActionBar({ slug }: { slug?: string }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [topVisible, setTopVisible] = useState(false);

  useEffect(() => {
    const check = () => setTopVisible((window.pageYOffset || 0) > 400);
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          check();
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    check();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  const btnBase =
    "inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 shadow-lg hover:shadow-xl hover:border-gray-300 dark:hover:border-gray-600 transition";

  return (
    <>
      {/* 统一容器：右下角，同一行并排，同样大小 */}
      <div className="fixed right-4 bottom-4 z-50 flex items-center gap-2">
        {/* 回到顶部 */}
        <button
          type="button"
          title="回到顶部"
          aria-label="回到顶部"
          onClick={scrollToTop}
          className={`${btnBase} ${topVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <ArrowUp className="w-5 h-5" />
        </button>

        {/* 打开聊天 */}
        <button
          type="button"
          aria-label="与 AI 对话"
          onClick={() => setChatOpen((v) => !v)}
          className={btnBase}
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      </div>

      {/* 聊天面板（由上方按钮受控） */}
      <AIChatWidget
        slug={slug}
        controlledOpen={chatOpen}
        onOpenChange={setChatOpen}
        disableFloatingTrigger
      />
    </>
  );
}

