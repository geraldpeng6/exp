// 统一站点域名配置
// 优先使用环境变量，以便在不同环境中灵活切换
// 若未配置，则默认使用生产域名 cheche.vercel.app
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cheche.vercel.app';

