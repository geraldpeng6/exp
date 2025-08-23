"use client";
import { useState, useEffect, useRef } from "react";
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

export default function CommentDropdownSimple({
  commentId,
  userId,
  content,
  createdAt,
  currentUserId,
  onDelete
}: CommentDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fingerprint, setFingerprint] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    // 点击外部关闭下拉菜单
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      setIsOpen(false);
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
      setIsOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete || isDeleting) return;

    const confirmed = window.confirm('确定要删除这条评论吗？此操作无法撤销。');
    if (!confirmed) return;

    setIsDeleting(true);
    setIsOpen(false);

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
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          transition: 'background-color 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f3f4f6';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <MoreVertical size={16} color="#6b7280" />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          right: '0',
          top: '100%',
          marginTop: '8px',
          width: '192px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb',
          zIndex: 10,
          overflow: 'hidden'
        }}>
          <div style={{ padding: '4px 0' }}>
            <button
              onClick={handleCopy}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                padding: '8px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#374151',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Copy size={16} style={{ marginRight: '12px' }} />
              复制内容
            </button>

            {isOwnComment && (
              <button
                onClick={handleDelete}
                disabled={!canDelete || isDeleting}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 16px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: canDelete && !isDeleting ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  color: canDelete && !isDeleting ? '#dc2626' : '#9ca3af',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (canDelete && !isDeleting) {
                    e.currentTarget.style.backgroundColor = '#fef2f2';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {isDeleting ? (
                  <>
                    <div style={{
                      marginRight: '12px',
                      width: '16px',
                      height: '16px',
                      border: '2px solid #dc2626',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    删除中...
                  </>
                ) : canDelete ? (
                  <>
                    <Trash2 size={16} style={{ marginRight: '12px' }} />
                    删除 ({formatTime(timeLeft)})
                  </>
                ) : (
                  <>
                    <Clock size={16} style={{ marginRight: '12px' }} />
                    已超时无法删除
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
