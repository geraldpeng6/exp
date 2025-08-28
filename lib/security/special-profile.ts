import { sanitizeNickname } from './sanitization';
import { getRuleByName } from '@/lib/services/special-names-service';

// 后端专用的「昵称 -> 头像」绑定规则（不暴露给前端）
export function getSpecialAvatarForNickname(nickname: string | null | undefined): string | null {
  const name = sanitizeNickname(String(nickname || ''));
  if (!name) return null;
  const rule = getRuleByName(name);
  return rule?.avatarUrl || null;
}
