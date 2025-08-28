"use client";
import { useEffect, useRef, useState } from "react";
import {
  getUserIdentity,
  generateRandomNickname,
  regenerateAvatar,
  getAvatarUrl,
  setUserIdentity as persistUserIdentity,
  type UserIdentity,
} from "@/lib/user-identity";
import { updateNicknameUnified } from "../lib/user-nickname";
import { getBrowserFingerprint } from "@/lib/browser-fingerprint";
import CommentDropdown from "./CommentDropdown";
import { Viewer } from "@bytemd/react";
import gfm from "@bytemd/plugin-gfm";
import highlightSsr from "@bytemd/plugin-highlight-ssr";
import type { BytemdPlugin } from "bytemd";
import { Send } from "lucide-react";
import SlotMachine from "./SlotMachine";
import { SLOT_AVATAR_SEEDS, SLOT_NICKNAMES } from "@/lib/slot-pools";

// 仅用于槽机视觉：忽略 fixedAvatarUrl，强制用传入 seed 构造 URL
function buildAvatarUrlFromSeed(seed: string): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&size=32`;
}


function cnNicknameSanitize(s: string) {
  // 保留中英文、数字、空格与常见连接符，长度限制 1-50
  return s.replace(/[^\w\s\u4e00-\u9fff\u3400-\u4dbf\-_.]/g, '').trim().slice(0, 50);
}

function EditableNickname({ userId, nickname, onUpdated, disabled }: { userId: string; nickname: string; onUpdated: (nextNickname: string, avatarUrlOverride?: string) => void; disabled?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(nickname);
  const [saving, setSaving] = useState(false);
  const originalNicknameRef = useRef(nickname);

  // 当外部昵称变化且未处于编辑状态时，同步本地值
  useEffect(() => {
    if (!editing) setValue(nickname);
  }, [nickname, editing]);

  const commit = async () => {
    const base = originalNicknameRef.current;
    const next = cnNicknameSanitize(value);
    if (!next || next === base) {
      setEditing(false);
      setValue(base);
      return;
    }
    setSaving(true);
    try {
      const result = await updateNicknameUnified(userId, next);
      if (result.ok) {
        onUpdated(next, result.avatarUrlOverride);
        setEditing(false);
      } else {
        // 取消或失败：不更新昵称，恢复原值
        setValue(base);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <span
        role="button"
        title={disabled ? "动画中，暂不可编辑" : "点击修改昵称"}
        style={{ cursor: disabled ? 'not-allowed' : 'text', userSelect: 'text', opacity: disabled ? 0.6 : 1 }}
        onClick={() => { if (disabled) return; originalNicknameRef.current = nickname; setValue(nickname); setEditing(true); }}
        aria-disabled={disabled}
      >
        {nickname}
      </span>
    );
  }

  return (
    <input
      autoFocus
      disabled={saving}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') { setValue(originalNicknameRef.current); setEditing(false); }
      }}
      className="px-1 py-0.5 border rounded bg-transparent"
      aria-label="编辑昵称"
    />
  );
}


// 评论系统，使用后端 API 存储，支持实时同步
interface CommentItem {
  id: string;
  userId: string;
  nickname: string;
  avatarUrl: string;
  content: string;
  createdAt: number;
  updatedAt?: number;
}

// 服务端返回的评论结构
interface ServerComment {
  id: string;
  userId: string;
  nickname: string;
  avatarUrl: string;
  content: string;
  createdAt: number; // 秒
  updatedAt?: number | null; // 可能不存在或为 null
}

// 兼容旧版本地存储结构（可能包含 avatarSeed）
interface LegacyLocalItem extends Partial<CommentItem> {
  avatarSeed?: string;
}

export default function Comments({ articleId }: { articleId: string }) {
  const draftKey = `comment-draft:${articleId}`;

  const [list, setList] = useState<CommentItem[]>([]);
  const [text, setText] = useState("");
  const plugins: BytemdPlugin[] = [gfm(), highlightSsr()];
  const [userIdentity, setUserIdentity] = useState<UserIdentity | null>(null);
  const [isRegeneratingAvatar, setIsRegeneratingAvatar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [, setError] = useState<string>("");

  const [browserFingerprint, setBrowserFingerprint] = useState<string>('');
  // 合并请求用的定时器（头像/昵称）
  const avatarSyncTimer = useRef<number | null>(null);
  const nickSyncTimer = useRef<number | null>(null);
  const pendingNicknameRef = useRef<string | null>(null);

  // Slot machine state
  const [spinningAvatar, setSpinningAvatar] = useState(false);
  const [spinningNickname, setSpinningNickname] = useState(false);

  useEffect(() => {
    // 初始化用户身份
    setUserIdentity(getUserIdentity());

    // 订阅全局身份变更事件，保持多组件一致
    const onIdentityChange = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as UserIdentity;
        if (detail && detail.id) setUserIdentity(detail);
      } catch {}
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('user-identity-changed', onIdentityChange as EventListener);
    }

    // 获取浏览器指纹
    setBrowserFingerprint(getBrowserFingerprint());

    // 加载评论和草稿
    loadComments();

    const draft = localStorage.getItem(draftKey);
    if (draft) setText(draft);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('user-identity-changed', onIdentityChange as EventListener);
      }
      if (avatarSyncTimer.current) window.clearTimeout(avatarSyncTimer.current);
      if (nickSyncTimer.current) window.clearTimeout(nickSyncTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  // 从后端加载评论
  const loadComments = async (pageNum = 1, append = false) => {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/comments?articleId=${encodeURIComponent(articleId)}&page=${pageNum}&limit=20&orderBy=newest`
      );
      const result = await response.json();

      if (result.success) {
        const newComments = result.data.comments.map((comment: ServerComment) => ({
          id: comment.id,
          userId: comment.userId,
          nickname: comment.nickname,
          avatarUrl: comment.avatarUrl,
          content: comment.content,
          createdAt: comment.createdAt * 1000, // 转换为毫秒
          updatedAt: comment.updatedAt ? comment.updatedAt * 1000 : undefined
        }));

        if (append) {
          setList(prev => [...prev, ...newComments]);
        } else {
          setList(newComments);
          // 同时更新 localStorage 以保持兼容性
          updateLocalStorageComments(newComments);
        }

        setTotal(result.data.total);
        setHasMore(result.data.page < result.data.totalPages);
        setPage(result.data.page);
      } else {
        setError(result.error || '加载评论失败');
        // 回退到 localStorage
        fallbackLoadComments();
      }
    } catch {
      setError('网络错误，请稍后重试');
      // 回退到 localStorage
      fallbackLoadComments();
    } finally {
      setLoading(false);
    }
  };

  // 回退到 localStorage 的加载逻辑
  const fallbackLoadComments = () => {
    const storageKey = `comments:${articleId}`;
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as LegacyLocalItem[];
        const compatible = parsed.map((item): CommentItem => ({
          id: item.id ?? crypto.randomUUID(),
          userId: item.userId ?? 'anonymous',
          nickname: item.nickname ?? '匿名用户',
          avatarUrl: item.avatarUrl ?? (item.avatarSeed ? getAvatarUrl(item.avatarSeed) : getAvatarUrl()),
          content: item.content ?? '',
          // 本地兼容：若为秒则转毫秒，保持前端统一使用毫秒
          createdAt: typeof item.createdAt === 'number' ? (item.createdAt < 1e12 ? item.createdAt * 1000 : item.createdAt) : Date.now(),
          updatedAt: typeof item.updatedAt === 'number' ? (item.updatedAt < 1e12 ? item.updatedAt * 1000 : item.updatedAt) : undefined,
        }));
        setList(compatible);
        setTotal(compatible.length);
      } catch {
        setList([]);
        setTotal(0);
      }
    }
  };

  // 更新 localStorage（保持兼容性）
  const updateLocalStorageComments = (comments: CommentItem[]) => {
    const storageKey = `comments:${articleId}`;
    localStorage.setItem(storageKey, JSON.stringify(comments));
  };


  // 头像：槽机动画 + 去抖合并 API
  const handleRegenerateAvatar = async () => {
    if (!userIdentity || spinningAvatar) return;
    setSpinningAvatar(true);
    setIsRegeneratingAvatar(true);
    const duration = 3500; // 3.5s 动画

    // 动画期间：禁用按钮
    if (avatarSyncTimer.current) window.clearTimeout(avatarSyncTimer.current);

    // 等待动画结束后再应用真实随机结果
    window.setTimeout(async () => {
      try {
        const newSeed = regenerateAvatar(); // 实际随机
        const nextLocal = { ...getUserIdentity(), avatarSeed: newSeed };
        persistUserIdentity(nextLocal);
        setUserIdentity(nextLocal);
        // 后端去抖合并（延长到与动画一致的级别，防止频繁触发）
        if (avatarSyncTimer.current) window.clearTimeout(avatarSyncTimer.current);
        avatarSyncTimer.current = window.setTimeout(() => {
          const latest = getUserIdentity().avatarSeed;
          void fetch('/api/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userIdentity.id, avatarSeed: latest }),
          }).catch(() => {});
        }, 0);
      } finally {
        setIsRegeneratingAvatar(false);
        setSpinningAvatar(false);
      }
    }, duration);
  };


  // 提交评论
  const submit = async () => {
    const t = text.trim();
    if (!t || !userIdentity || submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleId,
          userId: userIdentity.id,
          nickname: userIdentity.nickname,
          avatarUrl: getAvatarUrl(userIdentity.avatarSeed),
          content: t,
          browserFingerprint
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 成功后重新加载评论列表
        await loadComments();
        setText("");
        localStorage.removeItem(draftKey);
      } else {
        setError(result.error || '发表评论失败');
        // 如果后端失败，回退到 localStorage
        fallbackSubmit(t);
      }
    } catch {
      setError('网络错误，请稍后重试');
      // 回退到 localStorage
      fallbackSubmit(t);
    } finally {
      setSubmitting(false);
    }
  };

  // 回退到 localStorage 的提交逻辑
  const fallbackSubmit = (content: string) => {
    if (!userIdentity) return;

    const item: CommentItem = {
      id: crypto.randomUUID(),
      userId: userIdentity.id,
      nickname: userIdentity.nickname,
      avatarUrl: getAvatarUrl(userIdentity.avatarSeed),
      content,
      // 本地 optimistic UI 以毫秒存储，便于 Date()
      createdAt: Date.now()
    };

    const next = [item, ...list];
    setList(next);
    updateLocalStorageComments(next);
    setText("");
    localStorage.removeItem(draftKey);
  };

  const onChange = (v: string) => {
    setText(v);
    localStorage.setItem(draftKey, v);
  };

  // 加载更多评论
  const loadMore = () => {
    if (hasMore && !loading) {
      loadComments(page + 1, true);
    }
  };

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <section className="comments">
      <h3 id="评论">
        评论 {total > 0 && <span className="comment-count">({total})</span>}
      </h3>

      {/* 错误信息静默处理，不显示给用户 */}

      {/* 用户身份区域 */}
      {userIdentity && (
        <div className="comment-user-identity">
          <div className="identity-avatar relative flex items-center gap-2">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getAvatarUrl(userIdentity.avatarSeed)}
                alt="Avatar"
                className={spinningAvatar ? 'opacity-0' : (isRegeneratingAvatar ? 'rotating' : '')}
              />
              {spinningAvatar && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <SlotMachine
                    items={SLOT_AVATAR_SEEDS}
                    durationMs={3500}
                    minIntervalMs={60}
                    maxIntervalMs={260}
                    renderItem={(seed) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={buildAvatarUrlFromSeed(seed)} alt="spin" />
                    )}
                    onEnd={async () => {
                      try {
                        const newSeed = regenerateAvatar();
                        const nextLocal = { ...getUserIdentity(), avatarSeed: newSeed };
                        persistUserIdentity(nextLocal);
                        setUserIdentity(nextLocal);
                        if (avatarSyncTimer.current) window.clearTimeout(avatarSyncTimer.current);
                        avatarSyncTimer.current = window.setTimeout(() => {
                          const latest = getUserIdentity().avatarSeed;
                          void fetch('/api/users', {
                            method: 'PUT', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: userIdentity.id, avatarSeed: latest }),
                          }).catch(() => {});
                        }, 0);
                      } finally {
                        setIsRegeneratingAvatar(false);
                        setSpinningAvatar(false);
                      }
                    }}
                  />
                </div>
              )}
            </div>
            <button
              onClick={handleRegenerateAvatar}
              className="dice-button"
              title="换个头像"
              disabled={spinningAvatar}
            >
              🎲
            </button>
          </div>
          <div className="identity-nickname">
            <div className="relative inline-flex items-center gap-2">
              <div className="relative">
                <div className={spinningNickname ? 'invisible' : ''}>
                  <EditableNickname
                    userId={userIdentity.id}
                    nickname={userIdentity.nickname}
                    onUpdated={(nextNickname: string, avatarUrlOverride?: string) => {
                      if (!userIdentity) return;
                      const nextIdentity = { ...userIdentity, nickname: nextNickname };
                      // 持久化并更新本地状态
                      if (avatarUrlOverride) {
                        // 特殊昵称触发：固定头像并锁定
                        nextIdentity.fixedAvatarUrl = avatarUrlOverride;
                        nextIdentity.avatarLocked = true;
                        nextIdentity.specialActivated = true;
                      }
                      persistUserIdentity(nextIdentity);
                      setUserIdentity(nextIdentity);
                    }}
                    disabled={spinningNickname}
                  />
                </div>
                {spinningNickname && (
                  <div className="absolute inset-0 flex items-center">
                    <SlotMachine
                      items={SLOT_NICKNAMES}
                      durationMs={3500}
                      minIntervalMs={50}
                      maxIntervalMs={220}
                      renderItem={(name) => (
                        <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-sm">{name}</span>
                      )}
                      onEnd={async () => {
                        try {
                          const nextNickname = generateRandomNickname();
                          const current = getUserIdentity();
                          const nextIdentity = { ...current, nickname: nextNickname } as UserIdentity;
                          persistUserIdentity(nextIdentity);
                          setUserIdentity(nextIdentity);

                          pendingNicknameRef.current = nextNickname;
                          if (nickSyncTimer.current) window.clearTimeout(nickSyncTimer.current);
                          nickSyncTimer.current = window.setTimeout(async () => {
                            const latest = pendingNicknameRef.current;
                            if (!latest) return;
                            const cur = getUserIdentity();
                            const upd = await updateNicknameUnified(cur.id, latest);
                            if (upd.ok && upd.avatarUrlOverride) {
                              const cur2 = getUserIdentity();
                              const fixed = { ...cur2, nickname: latest, fixedAvatarUrl: upd.avatarUrlOverride, avatarLocked: true, specialActivated: true } as UserIdentity;
                              persistUserIdentity(fixed);
                              setUserIdentity(fixed);
                            }
                          }, 0);
                        } finally {
                          setSpinningNickname(false);
                        }
                      }}
                    />
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  if (!userIdentity || spinningNickname) return;
                  setSpinningNickname(true);
                  if (nickSyncTimer.current) window.clearTimeout(nickSyncTimer.current);
                }}
                className="dice-button"
                title="换个昵称"
                disabled={spinningNickname}
              >
                🎲
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 评论输入区 */}
      <div className="comment-input-area">
        <textarea
          placeholder="写点什么...（Enter 发送，Shift+Enter 换行）"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          className="comment-textarea"
          style={{ height: 40 }}
        />
        <button
          onClick={submit}
          className={`inline-flex items-center justify-center rounded-lg w-10 h-10 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={submitting || !text.trim()}
          title="发表评论"
          aria-label="发表评论"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* 评论列表 */}
      <div className="comment-list">
        {loading && list.length === 0 ? (
          <div className="loading-comments">加载评论中...</div>
        ) : list.length === 0 ? (
          <div className="no-comments">暂时还没有评论</div>
        ) : (
          <>
            {list.map((c) => (
              <div key={c.id} className="comment-item">
                <div className="comment-avatar">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.avatarUrl || getAvatarUrl()}
                    alt={c.nickname}
                  />
                </div>
                <div className="comment-content">
                  <div className="comment-meta">
                    <span className="comment-author">{c.nickname}</span>
                    <span className="comment-time">
                      {new Date(c.createdAt).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="comment-text markdown-body"><Viewer value={c.content} plugins={plugins} /></div>
                </div>
                <div className="comment-actions">
                  <CommentDropdown content={c.content} />
                </div>
              </div>
            ))}

            {/* 加载更多按钮 */}
            {hasMore && (
              <div className="load-more-container">
                <button
                  onClick={loadMore}
                  className={`button load-more-button ${loading ? 'loading' : ''}`}
                  disabled={loading}
                >
                  {loading ? '加载中...' : '加载更多评论'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

