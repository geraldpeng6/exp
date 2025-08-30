"use client";

import { Fragment, useState, useEffect } from "react";
import { Menu, Transition } from "@headlessui/react";
import {
  Share2,
  Copy,
  Download,
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

interface ArticleShareMenuProps {
  title: string;
  content: string;
  date: string;
  tags?: string[];
  slug: string;
}

export default function ArticleShareMenu({
  title,
  content,
  date,
  tags = [],
  slug
}: ArticleShareMenuProps) {
  const [copiedText, setCopiedText] = useState(false);
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
    } catch (error) {
      console.error("下载 Markdown 失败:", error);
    }
  };

  // 复制当前页面链接
  const handleCopyLink = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      console.error("复制链接失败:", error);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getPreviewContent = (text: string, maxLength: number = 500) => {
    if (text.length <= maxLength) return text;
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");
    return truncated.substring(0, lastSpace) + "...";
  };

  if (!mounted) return null;

  return (
    <>
      <Menu as="div" className="relative inline-block text-left ml-auto">
        <Menu.Button className="inline-flex items-center justify-center w-8 h-8 rounded-lg
          bg-white dark:bg-gray-800 transition-all duration-200
          text-gray-600 dark:text-gray-400
          border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
          <Share2 className="w-4 h-4" />
        </Menu.Button>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none p-1">
            <div className="flex flex-col gap-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleCopyText}
                    className={`${active ? 'bg-gray-100 dark:bg-gray-700' : ''} group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-900 dark:text-gray-100 transition-colors`}
                    aria-label="复制文本"
                  >
                    {copiedText ? (
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                    )}
                    <span>复制文本</span>
                  </button>
                )}
              </Menu.Item>

              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleDownloadMarkdown}
                    className={`${active ? 'bg-gray-100 dark:bg-gray-700' : ''} group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-900 dark:text-gray-100 transition-colors`}
                    aria-label="下载 Markdown"
                  >
                    <Download className="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span>下载 Markdown</span>
                  </button>
                )}
              </Menu.Item>

              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleCopyLink}
                    className={`${active ? 'bg-gray-100 dark:bg-gray-700' : ''} group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-900 dark:text-gray-100 transition-colors`}
                    aria-label="复制页面链接"
                  >
                    {copiedLink ? (
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                    )}
                    <span>复制页面链接</span>
                  </button>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>

    </>
  );
}
