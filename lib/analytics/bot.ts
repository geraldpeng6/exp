/**
 * 机器人/爬虫识别工具
 * 极简启发式判断，避免将机器人流量计入真实用户行为
 * 注意：该检测并不完美，仅用于“尽力过滤”，不作为安全边界
 */

/**
 * 判断 UA 是否疑似机器人
 * @param ua - 来自请求头的 user-agent 字符串（可能为 null/空）
 * @returns true 表示疑似机器人/爬虫
 */
export function isLikelyBot(ua: string | null | undefined): boolean {
  if (!ua) return true; // 没有 UA 基本可视为非真实浏览器
  const s = ua.toLowerCase();
  // 常见爬虫/工具/自动化框架关键词（可持续扩充）
  const patterns = [
    'bot', 'spider', 'crawl', 'slurp', 'bingpreview', 'baiduspider',
    'headless', 'phantomjs', 'selenium', 'playwright',
    'httpclient', 'python-requests', 'curl', 'wget', 'powershell', 'postman',
    'googlebot', 'duckduckbot', 'yandex', 'ahrefsbot', 'semrush', 'mj12bot',
    'uptimerobot', 'datanyze', 'sitechecker', 'monitor', 'facebookexternalhit',
  ];
  return patterns.some(p => s.includes(p));
}

/**
 * （可选）进一步判定：当 UA 疑似机器人，且未携带常见浏览器特征时更可信
 */
export function looksLikeRealBrowser(ua: string | null | undefined): boolean {
  if (!ua) return false;
  const s = ua.toLowerCase();
  // 常见真实浏览器标记
  return s.includes('chrome') || s.includes('safari') || s.includes('firefox') || s.includes('edg');
}

