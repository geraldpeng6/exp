/**
 * 数据清理和安全处理模块
 * 防止 XSS 攻击和其他安全问题
 * 注意：由于 DOMPurify 主要用于浏览器环境，这里使用服务器端的替代方案
 */

/**
 * HTML 实体编码映射
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;'
};

/**
 * 转义 HTML 特殊字符
 * 防止 XSS 攻击的基础方法
 */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"'\/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * 反转义 HTML 实体
 * 用于显示时恢复原始字符
 */
export function unescapeHtml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

/**
 * 清理用户输入的文本内容
 * 移除潜在的恶意代码和不安全的内容
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  let cleaned = input;
  
  // 1. 移除或转义 HTML 标签
  cleaned = escapeHtml(cleaned);
  
  // 2. 移除控制字符（除了常见的空白字符）
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // 3. 标准化空白字符
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // 4. 移除可能的 Unicode 控制字符
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  return cleaned;
}

/**
 * 清理用户昵称
 * 特殊处理昵称的清理规则
 */
export function sanitizeNickname(nickname: string): string {
  if (!nickname || typeof nickname !== 'string') {
    return '';
  }
  
  let cleaned = nickname;
  
  // 移除 HTML 标签
  cleaned = escapeHtml(cleaned);
  
  // 移除前后空白
  cleaned = cleaned.trim();
  
  // 移除连续的空格
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // 移除特殊字符（保留基本的标点符号）
  cleaned = cleaned.replace(/[^\w\s\u4e00-\u9fff\u3400-\u4dbf\-_.]/g, '');
  
  return cleaned;
}

/**
 * 清理评论内容
 * 允许基本的文本格式，但移除危险内容
 */
export function sanitizeComment(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  let cleaned = content;
  
  // 1. 移除脚本标签和内容
  cleaned = cleaned.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  
  // 2. 移除样式标签和内容
  cleaned = cleaned.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
  
  // 3. 移除事件处理器
  cleaned = cleaned.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // 4. 移除 javascript: 协议
  cleaned = cleaned.replace(/javascript\s*:/gi, '');
  
  // 5. 移除 data: 协议（除了安全的图片）
  cleaned = cleaned.replace(/data\s*:\s*(?!image\/[a-z]+;base64,)[^;,\s]*/gi, '');
  
  // 6. 转义剩余的 HTML 特殊字符
  cleaned = escapeHtml(cleaned);
  
  // 7. 标准化换行符
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // 8. 限制连续换行符
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // 9. 移除前后空白
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * 验证和清理文件路径
 * 防止路径遍历攻击
 */
export function sanitizePath(path: string): string {
  if (!path || typeof path !== 'string') {
    return '';
  }
  
  let cleaned = path;
  
  // 移除路径遍历字符
  cleaned = cleaned.replace(/\.\./g, '');
  cleaned = cleaned.replace(/[\\]/g, '/');
  
  // 移除多余的斜杠
  cleaned = cleaned.replace(/\/+/g, '/');
  
  // 移除前导斜杠
  cleaned = cleaned.replace(/^\/+/, '');
  
  // 只允许安全的字符
  cleaned = cleaned.replace(/[^a-zA-Z0-9\-_./]/g, '');
  
  return cleaned;
}

/**
 * 清理 URL
 * 确保 URL 的安全性
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  const cleaned = url.trim();
  
  // 只允许 http、https 和相对路径
  const allowedProtocols = /^(https?:\/\/|\/)/i;
  
  if (!allowedProtocols.test(cleaned)) {
    return '';
  }
  
  // 移除 javascript: 协议
  if (/javascript\s*:/i.test(cleaned)) {
    return '';
  }
  
  // 移除 data: 协议
  if (/data\s*:/i.test(cleaned)) {
    return '';
  }
  
  return cleaned;
}

/**
 * 通用的输入清理函数
 * 根据输入类型选择合适的清理方法
 */
export function sanitizeInput(
  input: string,
  type: 'text' | 'nickname' | 'comment' | 'path' | 'url' = 'text'
): string {
  switch (type) {
    case 'nickname':
      return sanitizeNickname(input);
    case 'comment':
      return sanitizeComment(input);
    case 'path':
      return sanitizePath(input);
    case 'url':
      return sanitizeUrl(input);
    case 'text':
    default:
      return sanitizeText(input);
  }
}

/**
 * 批量清理对象中的字符串字段
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  fieldTypes: Partial<Record<keyof T, 'text' | 'nickname' | 'comment' | 'path' | 'url'>> = {}
): T {
  const sanitized: Record<string, unknown> = { ...obj };

  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      const type = fieldTypes[key as keyof T] || 'text';
      sanitized[key] = sanitizeInput(value, type);
    }
  }

  return sanitized as T;
}
