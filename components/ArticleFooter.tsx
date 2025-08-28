"use client";

import { useState } from "react";
import { Mail, MessageCircle } from "lucide-react";

export default function ArticleFooter() {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedWechat, setCopiedWechat] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText("pjlpcc@qq.com");
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch (error) {
      console.error("复制邮箱失败:", error);
    }
  };

  const handleCopyWechat = async () => {
    try {
      await navigator.clipboard.writeText("wx3dot1415926");
      setCopiedWechat(true);
      setTimeout(() => setCopiedWechat(false), 2000);
    } catch (error) {
      console.error("复制微信号失败:", error);
    }
  };

  return (
    <footer className="mt-12 pt-8 text-center">
      <div className="flex items-center justify-center gap-6 mb-4">
        <button
          onClick={handleCopyEmail}
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 
            hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-200"
          title="点击复制邮箱"
        >
          <Mail className="w-4 h-4" />
          <span>{copiedEmail ? "已复制" : "pjlpcc@qq.com"}</span>
        </button>
        
        <button
          onClick={handleCopyWechat}
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 
            hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-200"
          title="点击复制微信号"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{copiedWechat ? "已复制" : "wx3dot1415926"}</span>
        </button>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-500">
        © 2025 Peng&apos;s Blog
      </div>
    </footer>
  );
}
