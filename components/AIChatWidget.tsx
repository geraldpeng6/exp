"use client";
import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Minus } from 'lucide-react';
import { Viewer } from "@bytemd/react";
import gfm from "@bytemd/plugin-gfm";
import highlightSsr from "@bytemd/plugin-highlight-ssr";

interface Props {
  slug?: string;
  // 当提供 controlledOpen 时，组件受控，不再使用内部浮动触发按钮
  controlledOpen?: boolean;
  onOpenChange?: (v: boolean) => void;
  disableFloatingTrigger?: boolean;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatWidget({ slug, controlledOpen, onOpenChange, disableFloatingTrigger }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = typeof controlledOpen === 'boolean' ? controlledOpen : internalOpen;
  const setOpen = (v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === 'function' ? (v as (prev: boolean) => boolean)(open) : v;
    if (typeof controlledOpen === 'boolean') {
      onOpenChange?.(next);
    } else {
      setInternalOpen(next);
      onOpenChange?.(next);
    }
  };
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [selectedText, setSelectedText] = useState('');
  const [collapsed, setCollapsed] = useState(false); // 折叠/最小化，仅隐藏主体内容
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // 监听用户选中的文本
  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection?.();
      const text = sel ? sel.toString().trim() : '';
      setSelectedText(text);
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, []);

  // 滚动到底部
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [history, open]);

  async function send() {
    const msg = input.trim();
    if (!msg) return;
    setInput('');
    setHistory((h) => [...h, { role: 'user', content: msg }]);
    setLoading(true);

    // 先尝试流式
    try {
      setStreaming(true);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, message: msg, selectedText, history, stream: true }),
      });

      if (res.ok && res.body) {
        // 插入一条空的 assistant 消息，然后逐步填充
        let acc = '';
        setHistory((h) => [...h, { role: 'assistant', content: '' }]);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          // 追加 token
          setHistory((h) => {
            const copy = h.slice();
            // 找到最后一条 assistant 空消息
            for (let i = copy.length - 1; i >= 0; i--) {
              if (copy[i].role === 'assistant') {
                copy[i] = { ...copy[i], content: acc };
                break;
              }
            }
            return copy;
          });
          // 滚动到底部，跟随打字
          if (listRef.current) {
            try { listRef.current.scrollTop = listRef.current.scrollHeight; } catch {}
          }
        }
        setStreaming(false);
        setLoading(false);
        return;
      }
    } catch (e) {
      // ignore and fallback
    } finally {
      setStreaming(false);
    }

    // 回退到非流式
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, message: msg, selectedText, history }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setHistory((h) => [...h, { role: 'assistant', content: data.data.reply }]);
      } else {
        const err = data?.error || '请求失败';
        setHistory((h) => [...h, { role: 'assistant', content: `出错了：${err}` }]);
      }
    } catch (e) {
      setHistory((h) => [...h, { role: 'assistant', content: '网络错误，请稍后重试' }]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <>
      {/* 浮动按钮（可禁用，供外部容器统一触发） */}
      {!disableFloatingTrigger && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="fixed right-16 bottom-4 md:right-4 md:bottom-4 z-50 rounded-full shadow-lg p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:shadow-xl"
          aria-label="与 AI 对话"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      )}

      {/* 对话面板 */}
      {open && (
        <div
          ref={containerRef}
          className="fixed right-4 bottom-20 z-50 w-80 md:w-96 h-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl flex flex-col transition-transform duration-200 ease-out"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-200">AI 助手</div>
            <div className="flex items-center gap-1">
              {/* 最小化：仅折叠主体区域，保留标题栏 */}
              <button
                onClick={() => setCollapsed((v) => !v)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label={collapsed ? '展开' : '最小化'}
                data-track
                data-track-name="ai-minimize"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="关闭" data-track data-track-name="ai-close">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 可折叠主体：平滑过渡高度与透明度，避免闪烁 */}
          <div
            className="flex-1 overflow-hidden transition-all duration-300 ease-out"
            style={{
              maxHeight: collapsed ? 0 : 9999,
              opacity: collapsed ? 0 : 1,
              pointerEvents: collapsed ? 'none' as const : 'auto' as const,
            }}
            aria-hidden={collapsed}
            aria-expanded={!collapsed}
          >
            {/* 选中提示 */}
            {selectedText && (
              <div className="m-3 p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded text-xs">
                已捕获选中文本（发送时会作为上下文）：{selectedText.slice(0, 120)}{selectedText.length > 120 ? '…' : ''}
              </div>
            )}

            <div ref={listRef} className="h-[calc(100%-72px)] overflow-y-auto px-3 py-2 space-y-3">
              {history.length === 0 ? (
                <div className="text-xs text-gray-400 text-center mt-10">向我提问：例如“帮我总结当前段落”、“解释这段代码”、“生成思维导图要点”等</div>
              ) : (
                history.map((m, idx) => (
                  <div key={idx} className={`text-sm ${m.role === 'user' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-200'}`}>
                    {m.role === 'user' ? (
                      <div className="whitespace-pre-wrap">你：{m.content}</div>
                    ) : (
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">AI：</div>
                        <div className="markdown-body"><Viewer value={m.content} plugins={[gfm(), highlightSsr()]} /></div>
                      </div>
                    )}
                  </div>
                ))
              )}
              {streaming && (
                <div className="text-xs text-gray-400">AI 正在输入…</div>
              )}
            </div>

            <div className="p-2 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={loading ? 'AI 正在思考…' : '输入问题，回车发送（Shift+Enter 换行）'}
                  className="flex-1 resize-none h-10 max-h-24 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
                  disabled={loading}
                />
                <button
                  onClick={() => void send()}
                  disabled={loading || !input.trim()}
                  className="inline-flex items-center justify-center rounded-lg px-3 py-2 bg-blue-600 text-white text-sm disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

