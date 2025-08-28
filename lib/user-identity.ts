// 用户身份管理
const STORAGE_KEY = 'blog_user_identity';

export interface UserIdentity {
  id: string;
  nickname: string;
  avatarSeed: string;
  // 统一：前端本地身份也用 UTC 秒（number）
  createdAt: number;
  // 保留字段以兼容旧版本，但不再限制随机次数
  avatarRolls?: number; // 已随机次数（不再限制）
  avatarLocked?: boolean; // 仅在特殊激活或固定头像时为 true
  fixedAvatarUrl?: string | null; // 如果被后端规则固定，为该URL
  specialActivated?: boolean; // 是否已被特殊昵称激活
}

declare global {
  interface Window { __BLOG_USER_IDENTITY?: UserIdentity }
}

export function setUserIdentity(identity: UserIdentity) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
    try { (window as unknown as Window).__BLOG_USER_IDENTITY = identity; } catch {}
    try { window.dispatchEvent(new CustomEvent('user-identity-changed', { detail: identity })); } catch {}
  }
}

// 生成随机昵称（无副作用，可导出供前端使用）
export function generateRandomNickname(): string {
  const adjectives = [
    '快乐的', '聪明的', '勇敢的', '友善的', '活泼的',
    '温柔的', '阳光的', '神秘的', '优雅的', '幽默的',
    '睿智的', '热情的', '冷静的', '浪漫的', '自由的'
  ];

  const nouns = [
    '小猫', '小狗', '熊猫', '兔子', '狐狸',
    '海豚', '蝴蝶', '星星', '月亮', '云朵',
    '咖啡', '奶茶', '布丁', '饼干', '糖果',
    '诗人', '画家', '旅人', '梦想家', '探索者'
  ];

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  return `${adjective}${noun}`;
}

// 生成随机头像种子
function generateAvatarSeed(): string {
  return Math.random().toString(36).substring(2, 15);
}

// 生成唯一ID
function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// 读取并补全身份对象的默认字段
type MaybeIdentity = Partial<UserIdentity> | null | undefined;
function normalizeIdentity(id: MaybeIdentity): UserIdentity {
  const normalized: UserIdentity = {
    id: id?.id || generateUserId(),
    nickname: id?.nickname || generateRandomNickname(),
    avatarSeed: id?.avatarSeed || generateAvatarSeed(),
    // 兼容：若旧值为字符串 ISO 或毫秒，规范化为秒
    createdAt: typeof (id as Partial<UserIdentity> | undefined)?.createdAt === 'number'
      ? ((id as Partial<UserIdentity>).createdAt! < 1e12 ? (id as Partial<UserIdentity>).createdAt! : Math.floor((id as Partial<UserIdentity>).createdAt! / 1000))
      : (typeof (id as Partial<UserIdentity> | undefined)?.createdAt === 'string' ? Math.floor(Date.parse((id as Partial<UserIdentity>).createdAt as unknown as string)/1000) : Math.floor(Date.now()/1000)),
    avatarRolls: typeof id?.avatarRolls === 'number' ? id.avatarRolls : 0,
    avatarLocked: typeof id?.avatarLocked === 'boolean' ? id.avatarLocked : false,
    fixedAvatarUrl: id?.fixedAvatarUrl ?? null,
    specialActivated: typeof id?.specialActivated === 'boolean' ? id.specialActivated : false,
  };
  return normalized;
}

// 获取或创建用户身份
export function getUserIdentity(): UserIdentity {
  // 尝试从 localStorage 获取
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const normalized = normalizeIdentity(parsed);
        // 写回补全后的结构，保证后续读取一致
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        try { (window as unknown as Window).__BLOG_USER_IDENTITY = normalized; } catch {}
        return normalized;
      } catch (e) {
        console.error('Failed to parse user identity:', e);
      }
    }

    // 创建新身份（带默认字段）
    const newIdentity = normalizeIdentity(null);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newIdentity));
    try { (window as unknown as Window).__BLOG_USER_IDENTITY = newIdentity; } catch {}
    return newIdentity;
  }

  // SSR 时返回默认值（不持久化）
  return normalizeIdentity({ id: 'anonymous', nickname: '匿名用户', avatarSeed: 'default' });
}

// 重新生成昵称
export function regenerateNickname(): string {
  const identity = getUserIdentity();
  const newNickname = generateRandomNickname();
  identity.nickname = newNickname;
  setUserIdentity(identity);
  return newNickname;
}

// 头像随机次数剩余
export function getAvatarRollsLeft(): number {
  // 已取消次数限制，返回一个较大的数用于兼容调用方
  return Number.POSITIVE_INFINITY;
}

// 锁定头像（可选：指定固定URL）
export function lockAvatarWithUrl(url?: string) {
  const id = getUserIdentity();
  if (url) id.fixedAvatarUrl = url;
  id.avatarLocked = true;
  setUserIdentity(id);
}

// 重新生成头像（无限制；仅本地更新种子，不阻止特殊/固定状态的再次随机）
export function regenerateAvatar(): string {
  const identity = getUserIdentity();

  const newSeed = generateAvatarSeed();
  identity.avatarSeed = newSeed;
  // 不再限制次数，但保留计数兼容
  identity.avatarRolls = (identity.avatarRolls || 0) + 1;
  identity.avatarLocked = false;
  setUserIdentity(identity);
  return newSeed;
}

// 获取头像 URL：若已固定则返回固定URL，否则返回 DiceBear URL
export function getAvatarUrl(seed?: string): string {
  const id = getUserIdentity();
  if (id.fixedAvatarUrl) return id.fixedAvatarUrl;
  const avatarSeed = seed || id.avatarSeed;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}&size=32`;
}
