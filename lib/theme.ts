"use client";

/**
 * 主题管理系统
 * 支持自动时间判断和手动切换
 */

export type Theme = 'light' | 'dark' | 'auto';

// 主题配置
const THEME_CONFIG = {
  // 自动切换的时间范围 (24小时制)
  AUTO_DARK_START: 18, // 18:00 开始黑夜模式
  AUTO_DARK_END: 6,    // 06:00 结束黑夜模式
  
  // 存储键
  STORAGE_KEY: 'blog-theme-preference',
  
  // CSS 类名
  DARK_CLASS: 'dark',
} as const;

/**
 * 获取当前时间是否应该使用黑夜模式
 */
export function shouldUseDarkMode(): boolean {
  const now = new Date();
  const hour = now.getHours();
  
  // 如果当前时间在 18:00-23:59 或 00:00-05:59，使用黑夜模式
  return hour >= THEME_CONFIG.AUTO_DARK_START || hour < THEME_CONFIG.AUTO_DARK_END;
}

/**
 * 获取用户的主题偏好
 */
export function getThemePreference(): Theme {
  if (typeof window === 'undefined') return 'auto';
  
  try {
    const stored = localStorage.getItem(THEME_CONFIG.STORAGE_KEY);
    if (stored && ['light', 'dark', 'auto'].includes(stored)) {
      return stored as Theme;
    }
  } catch (error) {
    console.warn('无法读取主题偏好:', error);
  }
  
  return 'auto';
}

/**
 * 保存用户的主题偏好
 */
export function setThemePreference(theme: Theme): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(THEME_CONFIG.STORAGE_KEY, theme);
  } catch (error) {
    console.warn('无法保存主题偏好:', error);
  }
}

/**
 * 计算实际应该使用的主题
 */
export function getActualTheme(preference: Theme): 'light' | 'dark' {
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

/**
 * 应用主题到 DOM
 */
export function applyTheme(theme: 'light' | 'dark'): void {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  
  if (theme === 'dark') {
    root.classList.add(THEME_CONFIG.DARK_CLASS);
  } else {
    root.classList.remove(THEME_CONFIG.DARK_CLASS);
  }
}

/**
 * 获取下一个主题状态（用于切换）
 */
export function getNextTheme(current: Theme): Theme {
  switch (current) {
    case 'auto':
      // 从自动模式切换到相反的手动模式
      return shouldUseDarkMode() ? 'light' : 'dark';
    case 'light':
      return 'dark';
    case 'dark':
      return 'auto';
    default:
      return 'auto';
  }
}

/**
 * 获取主题的显示名称
 */
export function getThemeDisplayName(theme: Theme): string {
  switch (theme) {
    case 'light':
      return '浅色模式';
    case 'dark':
      return '深色模式';
    case 'auto':
      return '自动模式';
    default:
      return '自动模式';
  }
}

/**
 * 获取主题对应的图标
 */
export function getThemeIcon(theme: Theme): string {
  const actualTheme = getActualTheme(theme);
  
  switch (actualTheme) {
    case 'light':
      return '☀️';
    case 'dark':
      return '🌙';
    default:
      return '🌙';
  }
}

/**
 * 检测系统主题偏好（作为 auto 模式的补充参考）
 */
export function getSystemThemePreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  
  try {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (error) {
    console.warn('无法检测系统主题偏好:', error);
  }
  
  return 'light';
}

/**
 * 监听系统主题变化
 */
export function watchSystemTheme(callback: (theme: 'light' | 'dark') => void): () => void {
  if (typeof window === 'undefined') return () => {};
  
  try {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handler = (e: MediaQueryListEvent) => {
      callback(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handler);
    
    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  } catch (error) {
    console.warn('无法监听系统主题变化:', error);
    return () => {};
  }
}

/**
 * 初始化主题系统
 */
export function initializeTheme(): void {
  if (typeof window === 'undefined') return;
  
  const preference = getThemePreference();
  const actualTheme = getActualTheme(preference);
  applyTheme(actualTheme);
}

/**
 * 主题管理类
 */
export class ThemeManager {
  private preference: Theme = 'auto';
  private listeners: Set<(theme: Theme, actualTheme: 'light' | 'dark') => void> = new Set();
  private timeCheckInterval?: NodeJS.Timeout;
  private systemThemeUnwatch?: () => void;

  constructor() {
    if (typeof window !== 'undefined') {
      this.preference = getThemePreference();
      this.startTimeCheck();
      this.watchSystemTheme();
    }
  }

  /**
   * 获取当前主题偏好
   */
  getPreference(): Theme {
    return this.preference;
  }

  /**
   * 获取当前实际主题
   */
  getActualTheme(): 'light' | 'dark' {
    return getActualTheme(this.preference);
  }

  /**
   * 设置主题偏好
   */
  setPreference(theme: Theme): void {
    this.preference = theme;
    setThemePreference(theme);
    this.applyAndNotify();
  }

  /**
   * 切换到下一个主题
   */
  toggle(): void {
    const nextTheme = getNextTheme(this.preference);
    this.setPreference(nextTheme);
  }

  /**
   * 添加主题变化监听器
   */
  addListener(listener: (theme: Theme, actualTheme: 'light' | 'dark') => void): () => void {
    this.listeners.add(listener);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 应用主题并通知监听器
   */
  private applyAndNotify(): void {
    const actualTheme = this.getActualTheme();
    applyTheme(actualTheme);
    
    this.listeners.forEach(listener => {
      try {
        listener(this.preference, actualTheme);
      } catch (error) {
        console.warn('主题监听器执行失败:', error);
      }
    });
  }

  /**
   * 开始时间检查（用于自动模式）
   */
  private startTimeCheck(): void {
    // 每分钟检查一次时间，以便在自动模式下及时切换主题
    this.timeCheckInterval = setInterval(() => {
      if (this.preference === 'auto') {
        this.applyAndNotify();
      }
    }, 60000); // 60秒检查一次
  }

  /**
   * 监听系统主题变化
   */
  private watchSystemTheme(): void {
    this.systemThemeUnwatch = watchSystemTheme(() => {
      // 系统主题变化时，如果当前是自动模式，重新应用主题
      if (this.preference === 'auto') {
        this.applyAndNotify();
      }
    });
  }

  /**
   * 清理资源
   */
  destroy(): void {
    if (this.timeCheckInterval) {
      clearInterval(this.timeCheckInterval);
    }
    
    if (this.systemThemeUnwatch) {
      this.systemThemeUnwatch();
    }
    
    this.listeners.clear();
  }
}
