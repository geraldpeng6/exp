// 支持通过环境变量 CONSOLE_ALLOW_IPS 配置额外白名单（逗号分隔）
function getEnvAllowedIps(): string[] {
  try {
    const raw = (typeof process !== 'undefined' ? process.env.CONSOLE_ALLOW_IPS : '') || '';
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function isLan(ip: string | null | undefined) {
  if (!ip) return false;
  // 环境白名单优先
  const allowed = getEnvAllowedIps();
  if (allowed.includes(ip)) return true;
  // IPv4: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8; IPv6: ::1, fc00::/7
  return (
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip) ||
    /^127\./.test(ip) ||
    ip === '::1' ||
    ip.startsWith('fc') ||
    ip.startsWith('fd')
  );
}

