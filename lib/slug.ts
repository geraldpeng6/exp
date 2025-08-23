// 统一的 slug 生成函数（GitHub 风格的近似实现，兼容中文）
export function createSlug(text: string): string {
  if (!text) return 'section';
  return text
    .toLowerCase()
    .trim()
    .replace(/\./g, '-') // 点号转连接符
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '') // 仅保留字母/数字/中文/空格/连字符
    .replace(/\s+/g, '-') // 空格转连接符
    .replace(/-+/g, '-')   // 合并多个连字符
    .replace(/^-+|-+$/g, '') || 'section';
}

