"use client";

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { ThemeManager, type Theme, getThemeDisplayName } from '@/lib/theme';

/**
 * 主题切换组件
 * 包含有趣的太阳/月亮切换动画
 */

export default function ThemeToggle() {
  const [themeManager] = useState(() => new ThemeManager());
  const [currentTheme, setCurrentTheme] = useState<Theme>('auto');
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');
  const [isAnimating, setIsAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // 初始化主题状态
    setCurrentTheme(themeManager.getPreference());
    setActualTheme(themeManager.getActualTheme());

    // 监听主题变化
    const unsubscribe = themeManager.addListener((theme, actual) => {
      setCurrentTheme(theme);
      setActualTheme(actual);
    });

    return () => {
      unsubscribe();
      themeManager.destroy();
    };
  }, [themeManager]);

  // 处理主题切换
  const handleToggle = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    themeManager.toggle();

    // 动画结束后重置状态
    setTimeout(() => {
      setIsAnimating(false);
    }, 600);
  };

  // 服务端渲染时不显示，避免水合不匹配
  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isAnimating}
      className={`
        p-2 rounded-lg
        hover:bg-gray-100 dark:hover:bg-gray-800
        transition-all duration-300 ease-in-out
        transform hover:scale-110 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 dark:focus:ring-purple-400
        disabled:cursor-not-allowed
        ${isAnimating ? 'animate-spin' : ''}
      `}
      title={`当前: ${getThemeDisplayName(currentTheme)} (点击切换)`}
      aria-label="切换主题"
    >
      {/* 只显示当前主题对应的图标 */}
      {actualTheme === 'light' ? (
        <Sun className="w-5 h-5 text-yellow-600" />
      ) : (
        <Moon className="w-5 h-5 text-purple-400" />
      )}
    </button>
  );
}

/**
 * 简化版主题切换组件（用于移动端或空间受限的地方）
 */
export function SimpleThemeToggle() {
  const [themeManager] = useState(() => new ThemeManager());
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setActualTheme(themeManager.getActualTheme());

    const unsubscribe = themeManager.addListener((_, actual) => {
      setActualTheme(actual);
    });

    return () => {
      unsubscribe();
      themeManager.destroy();
    };
  }, [themeManager]);

  if (!mounted) {
    return <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />;
  }

  return (
    <button
      onClick={() => themeManager.toggle()}
      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label="切换主题"
    >
      {actualTheme === 'light' ? (
        <Sun className="w-5 h-5 text-yellow-600" />
      ) : (
        <Moon className="w-5 h-5 text-purple-400" />
      )}
    </button>
  );
}
