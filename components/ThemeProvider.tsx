"use client";

import { useEffect } from 'react';
import { initializeTheme } from '@/lib/theme';

/**
 * 主题提供者组件
 * 尽量不在首次渲染时改变布局，避免出现“黑白交叉/闪烁”。
 * 真正的无闪烁由下方的 ThemeScript 完成。
 */

interface ThemeProviderProps {
  children: React.ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  // 可选：在客户端水合后再次校准（幂等，不会引起闪烁）
  useEffect(() => {
    initializeTheme();
  }, []);

  // 不再渲染带背景色的占位容器，直接输出子节点，避免首屏双背景叠加
  return <>{children}</>;
}

/**
 * 主题初始化脚本
 * 在浏览器开始绘制前尽早运行：
 * - 根据用户偏好或时间添加/移除 html.dark
 * - 设置 color-scheme，避免滚动条等系统 UI 颜色闪烁
 */
export function ThemeScript() {
  const script = `
    (function() {
      try {
        var THEME_CONFIG = {
          AUTO_DARK_START: 18,
          AUTO_DARK_END: 6,
          STORAGE_KEY: 'blog-theme-preference',
          DARK_CLASS: 'dark'
        };

        function shouldUseDarkMode() {
          var now = new Date();
          var hour = now.getHours();
          return hour >= THEME_CONFIG.AUTO_DARK_START || hour < THEME_CONFIG.AUTO_DARK_END;
        }

        function getThemePreference() {
          try {
            var stored = localStorage.getItem(THEME_CONFIG.STORAGE_KEY);
            if (stored && ['light', 'dark', 'auto'].includes(stored)) return stored;
          } catch (e) {}
          return 'auto';
        }

        function getActualTheme(preference) {
          switch (preference) {
            case 'light': return 'light';
            case 'dark': return 'dark';
            default: return shouldUseDarkMode() ? 'dark' : 'light';
          }
        }

        function applyTheme(theme) {
          var root = document.documentElement;
          if (theme === 'dark') root.classList.add(THEME_CONFIG.DARK_CLASS);
          else root.classList.remove(THEME_CONFIG.DARK_CLASS);
          // 同步系统配色方案，避免首次渲染滚动条颜色突变
          root.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
        }

        var pref = getThemePreference();
        var actual = getActualTheme(pref);
        applyTheme(actual);
        // 标记主题已就绪，再开启 CSS 过渡，避免首屏闪烁
        document.documentElement.setAttribute('data-theme-ready', '1');
      } catch (e) {
        // 忽略错误，保持页面可用
      }
    })();
  `;

  return (
    <script dangerouslySetInnerHTML={{ __html: script }} />
  );
}
