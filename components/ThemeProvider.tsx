"use client";

import { useEffect, useState } from 'react';
import { initializeTheme } from '@/lib/theme';

/**
 * 主题提供者组件
 * 负责初始化主题系统并防止闪烁
 */

interface ThemeProviderProps {
  children: React.ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 初始化主题系统
    initializeTheme();
    setMounted(true);
  }, []);

  // 在客户端挂载之前，渲染一个占位符以防止闪烁
  if (!mounted) {
    return (
      <div className="min-h-screen bg-white">
        {children}
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * 主题初始化脚本
 * 这个脚本会在页面加载时立即执行，防止主题闪烁
 */
export function ThemeScript() {
  const script = `
    (function() {
      try {
        // 主题配置
        const THEME_CONFIG = {
          AUTO_DARK_START: 18,
          AUTO_DARK_END: 6,
          STORAGE_KEY: 'blog-theme-preference',
          DARK_CLASS: 'dark',
        };

        // 获取当前时间是否应该使用黑夜模式
        function shouldUseDarkMode() {
          const now = new Date();
          const hour = now.getHours();
          return hour >= THEME_CONFIG.AUTO_DARK_START || hour < THEME_CONFIG.AUTO_DARK_END;
        }

        // 获取用户的主题偏好
        function getThemePreference() {
          try {
            const stored = localStorage.getItem(THEME_CONFIG.STORAGE_KEY);
            if (stored && ['light', 'dark', 'auto'].includes(stored)) {
              return stored;
            }
          } catch (error) {
            console.warn('无法读取主题偏好:', error);
          }
          return 'auto';
        }

        // 计算实际应该使用的主题
        function getActualTheme(preference) {
          switch (preference) {
            case 'light':
              return 'light';
            case 'dark':
              return 'dark';
            case 'auto':
            default:
              return shouldUseDarkMode() ? 'dark' : 'light';
          }
        }

        // 应用主题到 DOM
        function applyTheme(theme) {
          const root = document.documentElement;
          if (theme === 'dark') {
            root.classList.add(THEME_CONFIG.DARK_CLASS);
          } else {
            root.classList.remove(THEME_CONFIG.DARK_CLASS);
          }
        }

        // 立即应用主题
        const preference = getThemePreference();
        const actualTheme = getActualTheme(preference);
        applyTheme(actualTheme);

      } catch (error) {
        console.warn('主题初始化失败:', error);
      }
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
