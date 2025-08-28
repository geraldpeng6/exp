"use client";

// 简单社交分享（中文注释）
export default function ShareButtons({ title }: { title: string }) {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const shareText = title;

  const doShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareText, url });
      } catch {
        // 用户取消无须处理
      }
    } else {
      // 备选：打开新窗口到 Twitter/微博 等
      const encoded = encodeURIComponent(`${shareText} ${url}`);
      window.open(`https://twitter.com/intent/tweet?text=${encoded}`, "_blank");
    }
  };

  return (
    <button className="button share-button" onClick={doShare} title="分享文章">
      {/* 分享图标 */}
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
        <circle cx="18" cy="5" r="3"></circle>
        <circle cx="6" cy="12" r="3"></circle>
        <circle cx="18" cy="19" r="3"></circle>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
      </svg>
    </button>
  );
}

