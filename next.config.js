/** @type {import('next').NextConfig} */
// 使用 App Router，尽可能静态化生成
const nextConfig = {
  reactStrictMode: true,
  // 静态导出能力在 Vercel 上不必强制设置 output: 'export'
  // 为了兼容本地/局域网运行与图片无需外链配置，禁用 next/image 优化
  images: { unoptimized: true },
  // Next 15: 将 typedRoutes 移至顶层
  typedRoutes: true,
};

module.exports = nextConfig;

