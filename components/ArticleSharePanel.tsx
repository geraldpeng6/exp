"use client";

import { useState, useEffect } from "react";
import {
  Copy,
  FileText,
  Check
} from "lucide-react";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface ArticleSharePanelProps {
  title: string;
  content: string;
  date: string;
  tags?: string[];
  slug: string;
}

export default function ArticleSharePanel({
  title,
  content,
  date,
  tags = [],
  slug
}: ArticleSharePanelProps) {
  const [copiedText, setCopiedText] = useState(false);
  const [downloadedMd, setDownloadedMd] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 复制文本内容
  const handleCopyText = async () => {
    try {
      const textContent = `# ${title}\n\n${new Date(date).toLocaleString()} · ${tags.join(" · ")}\n\n${content}`;
      await navigator.clipboard.writeText(textContent);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch (error) {
      console.error("复制文本失败:", error);
    }
  };

  // 下载 Markdown 文件
  const handleDownloadMarkdown = () => {
    try {
      const mdContent = `---
title: ${title}
date: ${date}
tags: ${tags.join(", ")}
---

# ${title}

${content}`;
      
      const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8" });
      downloadBlob(blob, `${slug}.md`);
      setDownloadedMd(true);
      setTimeout(() => setDownloadedMd(false), 2000);
    } catch (error) {
      console.error("下载 Markdown 失败:", error);
    }
  };


  // 截取内容的前几段作为预览
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getPreviewContent = (text: string, maxLength: number = 500) => {
    if (text.length <= maxLength) return text;
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");
    return truncated.substring(0, lastSpace) + "...";
  };

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-2">
      {/* 复制文本 */}
      <button
        onClick={handleCopyText}
        className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
        title="复制文本内容"
      >
        {copiedText ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        )}
      </button>

      {/* 下载 Markdown */}
      <button
        onClick={handleDownloadMarkdown}
        className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
        title="下载 Markdown 文件"
      >
        {downloadedMd ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        )}
      </button>

      {/* 复制页面链接 */}
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(window.location.href);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
          } catch (e) {
            console.error('复制链接失败:', e);
          }
        }}
        className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
        title="复制页面链接"
      >
        {copiedLink ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        )}
      </button>
    </div>
  );
}
