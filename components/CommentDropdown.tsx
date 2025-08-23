"use client";
import { useState, useEffect } from "react";
import { Menu } from "@headlessui/react";
import { MoreVertical, Copy, Trash2, Clock } from "lucide-react";
import { getBrowserFingerprint } from "@/lib/browser-fingerprint";

interface CommentDropdownProps {
  commentId: string;
  userId: string;
  content: string;
  createdAt: number;
  currentUserId?: string;
  onDelete?: () => void;
}

export default function CommentDropdown({
  commentId,
  userId,
  content,
  createdAt,
  currentUserId,
  onDelete
}: CommentDropdownProps) {
  const [canDelete, setCanDelete] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fingerprint, setFingerprint] = useState<string>('');

  // 检查是否是当前用户的评论
  const isOwnComment = currentUserId === userId;

  useEffect(() => {
    // 获取浏览器指纹
    const fp = getBrowserFingerprint();
    setFingerprint(fp);

    if (isOwnComment && fp) {
      checkDeletePermission();
    }
  }, [isOwnComment, commentId, userId]);

  useEffect(() => {
    // 如果可以删除，启动倒计时
    if (canDelete && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setCanDelete(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [canDelete, timeLeft]);

  const checkDeletePermission = async () => {
    try {
      const response = await fetch(
        `/api/comments/${commentId}?action=check-delete&userId=${userId}&fingerprint=${fingerprint}`
      );
      const result = await response.json();

      if (result.success && result.data) {
        setCanDelete(result.data.canDelete);
        setTimeLeft(result.data.timeLeft || 0);
      }
    } catch (error) {
      console.error('检查删除权限失败:', error);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      // 可以添加一个 toast 提示
      console.log('评论内容已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      // 降级方案：选择文本
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        console.log('评论内容已复制到剪贴板');
      } catch (e) {
        console.error('复制失败:', e);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleDelete = async () => {
    if (!canDelete || isDeleting) return;

    const confirmed = window.confirm('确定要删除这条评论吗？此操作无法撤销。');
    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          browserFingerprint: fingerprint
        }),
      });

      const result = await response.json();

      if (result.success) {
        onDelete?.();
      } else {
        alert(result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除评论失败:', error);
      alert('删除失败，请稍后重试');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors duration-200">
        <MoreVertical className="h-4 w-4 text-gray-500" />
      </Menu.Button>

      <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
        <div className="py-1">
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={handleCopy}
                className={`${
                  active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                } group flex items-center w-full px-4 py-2 text-sm transition-colors duration-200`}
              >
                <Copy className="mr-3 h-4 w-4" />
                复制内容
              </button>
            )}
          </Menu.Item>

          {isOwnComment && (
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={handleDelete}
                  disabled={!canDelete || isDeleting}
                  className={`${
                    active && canDelete && !isDeleting
                      ? 'bg-red-50 text-red-700'
                      : canDelete && !isDeleting
                      ? 'text-red-600'
                      : 'text-gray-400 cursor-not-allowed'
                  } group flex items-center w-full px-4 py-2 text-sm transition-colors duration-200`}
                >
                  {isDeleting ? (
                    <>
                      <div className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                      删除中...
                    </>
                  ) : canDelete ? (
                    <>
                      <Trash2 className="mr-3 h-4 w-4" />
                      删除 ({formatTime(timeLeft)})
                    </>
                  ) : (
                    <>
                      <Clock className="mr-3 h-4 w-4" />
                      已超时无法删除
                    </>
                  )}
                </button>
              )}
            </Menu.Item>
          )}
        </div>
      </Menu.Items>
    </Menu>
  );
}
