"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/articles/")) return null;
  const [copiedText, setCopiedText] = useState<string>("");

  const copyToClipboard = async (text: string, label: string) => {
    try {
      // 优先使用 Clipboard API（仅在安全上下文，如 HTTPS 或 localhost 可用）
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof window !== 'undefined' && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // 退回到旧的方式：创建临时 textarea 并使用 execCommand('copy')
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!ok) {
          throw new Error('execCommand copy failed');
        }
      }
      // 显示复制成功提示
      setCopiedText(`已复制 ${label}`);
      // 2秒后清除提示
      setTimeout(() => {
        setCopiedText("");
      }, 2000);
    } catch (e) {
      alert('复制失败，请手动复制: ' + text);
    }
  };

  return (
    <footer className="site-footer">
      {/* 复制成功提示弹窗 */}
      {copiedText && (
        <div className="copy-toast">
          {copiedText}
        </div>
      )}

      <div className="footer-content">
        <div className="contact-icons">
          <span
            className="contact-item email-icon"
            title="点击复制邮箱"
            onClick={() => copyToClipboard('pjlpcc@qq.com', '邮箱')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z"></path>
            </svg>
            <span>pjlpcc@qq.com</span>
          </span>
          <span
            className="contact-item wechat-icon"
            title="点击复制微信号"
            onClick={() => copyToClipboard('wx3dot1415926', '微信号')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M8.5 12C9.33 12 10 11.33 10 10.5S9.33 9 8.5 9 7 9.67 7 10.5 7.67 12 8.5 12ZM15.5 12C16.33 12 17 11.33 17 10.5S16.33 9 15.5 9 14 9.67 14 10.5 14.67 12 15.5 12ZM18 10.5C18 6.36 14.64 3 10.5 3S3 6.36 3 10.5C3 12.83 4.24 14.86 6.07 16.05C5.73 17.74 4.21 19.81 4.21 19.81S7.5 19.5 9.08 18.29C9.54 18.38 10.01 18.43 10.5 18.43C14.64 18.43 18 15.07 18 10.5Z"></path>
            </svg>
            <span>wx3dot1415926</span>
          </span>
        </div>
        <div className="copyright">
          © {new Date().getFullYear()} Peng's Blog
        </div>
      </div>
    </footer>
  );
}
