// 用户身份管理
const STORAGE_KEY = 'blog_user_identity';

export interface UserIdentity {
  id: string;
  nickname: string;
  avatarSeed: string;
  createdAt: string;
}

// 生成随机昵称
function generateRandomNickname(): string {
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

// 获取或创建用户身份
export function getUserIdentity(): UserIdentity {
  // 尝试从 localStorage 获取
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse user identity:', e);
      }
    }
    
    // 创建新身份
    const newIdentity: UserIdentity = {
      id: generateUserId(),
      nickname: generateRandomNickname(),
      avatarSeed: generateAvatarSeed(),
      createdAt: new Date().toISOString()
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newIdentity));
    return newIdentity;
  }
  
  // SSR 时返回默认值
  return {
    id: 'anonymous',
    nickname: '匿名用户',
    avatarSeed: 'default',
    createdAt: new Date().toISOString()
  };
}

// 重新生成昵称
export function regenerateNickname(): string {
  const identity = getUserIdentity();
  const newNickname = generateRandomNickname();
  identity.nickname = newNickname;
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  }
  
  return newNickname;
}

// 重新生成头像
export function regenerateAvatar(): string {
  const identity = getUserIdentity();
  const newSeed = generateAvatarSeed();
  identity.avatarSeed = newSeed;
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  }
  
  return newSeed;
}

// 获取 DiceBear 头像 URL
export function getAvatarUrl(seed?: string): string {
  const avatarSeed = seed || getUserIdentity().avatarSeed;
  // 使用 DiceBear API 生成头像
  // 使用 avataaars 风格，你也可以选择其他风格如 bottts, identicon 等
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}&size=32`;
}
