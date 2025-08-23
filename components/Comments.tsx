"use client";
import { useEffect, useState } from "react";
import {
  getUserIdentity,
  regenerateNickname,
  regenerateAvatar,
  getAvatarUrl,
  type UserIdentity
} from "@/lib/user-identity";
import { getBrowserFingerprint } from "@/lib/browser-fingerprint";
import CommentDropdownSimple from "./CommentDropdownSimple";

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

export default function Comments({ articleId }: { articleId: string }) {
  const draftKey = `comment-draft:${articleId}`;

  const [list, setList] = useState<CommentItem[]>([]);
  const [text, setText] = useState("");
  const [userIdentity, setUserIdentity] = useState<UserIdentity | null>(null);
  const [isRegeneratingNickname, setIsRegeneratingNickname] = useState(false);
  const [isRegeneratingAvatar, setIsRegeneratingAvatar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [browserFingerprint, setBrowserFingerprint] = useState<string>('');

  useEffect(() => {
    // 初始化用户身份
    setUserIdentity(getUserIdentity());

    // 获取浏览器指纹
    setBrowserFingerprint(getBrowserFingerprint());

    // 加载评论和草稿
    loadComments();

    const draft = localStorage.getItem(draftKey);
    if (draft) setText(draft);
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
        const newComments = result.data.comments.map((comment: any) => ({
          id: comment.id,
          userId: comment.userId,
          nickname: comment.nickname,
          avatarUrl: comment.avatarUrl,
          content: comment.content,
          createdAt: comment.createdAt * 1000, // 转换为毫秒
          updatedAt: comment.updatedAt * 1000
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
    } catch (error) {
      console.error('加载评论失败:', error);
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
        const parsed = JSON.parse(raw);
        const compatible = parsed.map((item: any) => ({
          ...item,
          userId: item.userId || 'anonymous',
          nickname: item.nickname || '匿名用户',
          avatarUrl: item.avatarUrl || (item.avatarSeed ? getAvatarUrl(item.avatarSeed) : getAvatarUrl())
        }));
        setList(compatible);
        setTotal(compatible.length);
      } catch (e) {
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



  // 重新生成昵称
  const handleRegenerateNickname = () => {
    if (!userIdentity) return;
    setIsRegeneratingNickname(true);
    setTimeout(() => {
      const newNickname = regenerateNickname();
      // 仅更新本地当前身份；历史评论保持原样（快照模式）
      setUserIdentity(prev => prev ? { ...prev, nickname: newNickname } : null);
      setIsRegeneratingNickname(false);
    }, 300);
  };

  // 重新生成头像
  const handleRegenerateAvatar = () => {
    if (!userIdentity) return;
    setIsRegeneratingAvatar(true);
    setTimeout(() => {
      const newSeed = regenerateAvatar();
      // 仅更新本地当前身份；历史评论保持原样（快照模式）
      setUserIdentity(prev => prev ? { ...prev, avatarSeed: newSeed } : null);
      setIsRegeneratingAvatar(false);
    }, 300);
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
    } catch (error) {
      console.error('发表评论失败:', error);
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

  return (
    <section className="comments">
      <h3 id="评论">
        评论 {total > 0 && <span className="comment-count">({total})</span>}
      </h3>

      {/* 错误信息静默处理，不显示给用户 */}

      {/* 用户身份区域 */}
      {userIdentity && (
        <div className="comment-user-identity">
          <div className="identity-avatar">
            <img
              src={getAvatarUrl(userIdentity.avatarSeed)}
              alt="Avatar"
              className={isRegeneratingAvatar ? 'rotating' : ''}
            />
            <button
              onClick={handleRegenerateAvatar}
              className="dice-button"
              title="换个头像"
              disabled={isRegeneratingAvatar}
            >
              🎲
            </button>
          </div>
          <div className="identity-nickname">
            <span className={isRegeneratingNickname ? 'fading' : ''}>
              {userIdentity.nickname}
            </span>
            <button
              onClick={handleRegenerateNickname}
              className="dice-button"
              title="换个昵称"
              disabled={isRegeneratingNickname}
            >
              🎲
            </button>
          </div>
        </div>
      )}

      {/* 评论输入区 */}
      <div className="comment-input-area">
        <textarea
          placeholder="写点什么..."
          value={text}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="comment-textarea"
        />
        <button
          onClick={submit}
          className={`button submit-button ${submitting ? 'loading' : ''}`}
          disabled={submitting || !text.trim()}
          title="发表评论"
        >
          {submitting ? (
            <span>发表中...</span>
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          )}
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
                  <div className="comment-text">{c.content}</div>
                </div>
                <div className="comment-actions">
                  <CommentDropdownSimple
                    commentId={c.id}
                    userId={c.userId}
                    content={c.content}
                    createdAt={c.createdAt}
                    currentUserId={userIdentity?.id}
                    onDelete={() => {
                      // 从列表中移除已删除的评论
                      setList(prev => prev.filter(item => item.id !== c.id));
                      setTotal(prev => prev - 1);
                    }}
                  />
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

