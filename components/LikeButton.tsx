"use client";
import { useEffect, useState } from "react";
import { getUserIdentity } from "@/lib/user-identity";
// import { Heart } from "lucide-react";

// 点赞按钮，使用后端 API 存储，支持实时同步
export default function LikeButton({ id }: { id: string }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // 获取用户ID
    const identity = getUserIdentity();
    setUserId(identity.id);

    // 从后端获取点赞状态
    fetchLikeStatus(id, identity.id);
  }, [id]);

  // 获取点赞状态
  const fetchLikeStatus = async (articleId: string, userId: string) => {
    try {
      const response = await fetch(`/api/likes?articleId=${encodeURIComponent(articleId)}&userId=${encodeURIComponent(userId)}`);
      const result = await response.json();

      if (result.success) {
        setLiked(result.data.isLiked);
        setCount(result.data.totalLikes);
      } else {
        console.error('获取点赞状态失败:', result.error);
        // 回退到 localStorage
        fallbackToLocalStorage(articleId, userId);
      }
    } catch (error) {
      console.error('获取点赞状态失败:', error);
      // 回退到 localStorage
      fallbackToLocalStorage(articleId, userId);
    }
  };

  // 回退到 localStorage 的逻辑（兼容性处理）
  const fallbackToLocalStorage = (articleId: string, userId: string) => {
    const likedKey = `liked:${articleId}:${userId}`;
    const isLiked = localStorage.getItem(likedKey) === "1";
    setLiked(isLiked);

    const allLikesKey = `all-likes:${articleId}`;
    const allLikes = localStorage.getItem(allLikesKey);
    if (allLikes) {
      try {
        const likesArray = JSON.parse(allLikes) as string[];
        setCount(likesArray.length);
      } catch {
        setCount(0);
      }
    }
  };

  // 切换点赞状态
  const toggle = async () => {
    if (!userId || loading) return;

    setLoading(true);
    setError("");

    try {
      const identity = getUserIdentity();

      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleId: id,
          userId: identity.id,
          nickname: identity.nickname,
          avatarSeed: identity.avatarSeed
        }),
      });

      const result = await response.json();

      if (result.success) {
        setLiked(result.data.isLiked);
        setCount(result.data.totalLikes);

        // 同时更新 localStorage 以保持兼容性
        updateLocalStorage(id, identity.id, result.data.isLiked);
      } else {
        setError(result.error || '操作失败');
        // 如果后端失败，回退到 localStorage
        fallbackToggle();
      }
    } catch (error) {
      console.error('切换点赞状态失败:', error);
      setError('网络错误，请稍后重试');
      // 回退到 localStorage
      fallbackToggle();
    } finally {
      setLoading(false);
    }
  };

  // 回退到 localStorage 的切换逻辑
  const fallbackToggle = () => {
    const likedKey = `liked:${id}:${userId}`;
    const allLikesKey = `all-likes:${id}`;

    let allLikes: string[] = [];
    const stored = localStorage.getItem(allLikesKey);
    if (stored) {
      try {
        allLikes = JSON.parse(stored);
      } catch {
        allLikes = [];
      }
    }

    if (liked) {
      localStorage.removeItem(likedKey);
      allLikes = allLikes.filter(uid => uid !== userId);
      setLiked(false);
    } else {
      localStorage.setItem(likedKey, "1");
      if (!allLikes.includes(userId)) {
        allLikes.push(userId);
      }
      setLiked(true);
    }

    localStorage.setItem(allLikesKey, JSON.stringify(allLikes));
    setCount(allLikes.length);
  };

  // 更新 localStorage（保持兼容性）
  const updateLocalStorage = (articleId: string, userId: string, isLiked: boolean) => {
    const likedKey = `liked:${articleId}:${userId}`;

    if (isLiked) {
      localStorage.setItem(likedKey, "1");
    } else {
      localStorage.removeItem(likedKey);
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={toggle}
        className={`inline-flex items-center justify-center p-2 rounded-lg
          bg-white dark:bg-gray-800 transition-all duration-200
          ${loading ? 'opacity-50 cursor-not-allowed' : ''}
          hover:border-gray-300 dark:hover:border-gray-600
          ${liked ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}
          border border-transparent hover:border-gray-200 dark:hover:border-gray-700`}
        aria-pressed={liked}
        disabled={loading}
        title={error || (liked ? "取消点赞" : "点赞")}
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill={liked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      </button>
      {count > 0 && (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {count}
        </span>
      )}
    </div>
  );
}

