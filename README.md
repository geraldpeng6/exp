# 极简博客（Next.js + 安全后端）

> 集成安全后端和轻量级数据库的极简博客系统，支持评论、点赞等交互功能。

## ✨ 功能特性

### 基础功能
- 🎨 简洁优雅的设计
- 📝 基于 Markdown 的内容管理
- 📱 响应式布局
- ⚡ 快速轻量

### 新增功能
- 💬 **评论系统** - 支持实时评论，数据持久化存储
- ❤️ **点赞功能** - 防重复点赞，实时统计
- 👤 **匿名用户系统** - 自动生成用户身份和头像
- 🔒 **安全防护** - 防 XSS、SQL 注入、频率限制
- 🗄️ **轻量级数据库** - SQLite 本地存储，无需额外服务
- 🚀 **API 接口** - RESTful API 支持前后端分离
- 🌙 **智能主题切换** - 自动时间判断 + 手动切换，太阳月亮动画效果
- 🎨 **Tailwind CSS** - 现代化 CSS 框架，支持深色模式

## 🛡️ 安全特性

- **数据验证**: 使用 Zod 进行严格的类型验证
- **内容清理**: 自动清理用户输入，防止 XSS 攻击
- **频率限制**: 防止恶意请求和滥用
- **SQL 注入防护**: 使用参数化查询
- **输入过滤**: 多层安全过滤机制

## 🌙 智能主题系统

### 自动时间判断
- **智能切换**: 根据本地时间自动判断白天/黑夜主题
- **时间范围**: 18:00-06:00 自动切换到深色模式
- **系统感知**: 支持系统主题偏好检测

### 手动控制
- **三种模式**: 浅色、深色、自动
- **一键切换**: 点击太阳/月亮图标即可切换
- **状态记忆**: 用户偏好自动保存到本地存储

### 动画效果
- **太阳升起**: 浅色模式时太阳从下方升起并旋转
- **月亮升起**: 深色模式时月亮从上方降下并旋转
- **平滑过渡**: 所有颜色和状态变化都有平滑过渡动画
- **状态指示**: 小圆点显示当前模式（自动/手动）

## 🚀 快速开始

### 1. 安装依赖
```bash
pnpm install
```

### 2. 初始化数据库
```bash
pnpm run init-db
```

### 3. 启动开发服务器
```bash
pnpm run dev     # 监听 0.0.0.0:3000，局域网可访问
```

### 4. 访问应用
打开 [http://localhost:3006](http://localhost:3006) 查看博客。

## 📁 项目结构

```
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── comments/      # 评论 API
│   │   ├── likes/         # 点赞 API
│   │   ├── users/         # 用户 API
│   │   └── health/        # 健康检查 API
│   ├── articles/          # 文章页面
│   └── globals.css        # 全局样式
├── components/            # React 组件
│   ├── Comments.tsx       # 评论组件
│   ├── LikeButton.tsx     # 点赞按钮
│   └── ...
├── lib/                   # 核心库
│   ├── database/          # 数据库相关
│   │   ├── connection.ts  # 数据库连接
│   │   └── schema.sql     # 数据库结构
│   ├── security/          # 安全模块
│   │   ├── validation.ts  # 数据验证
│   │   ├── sanitization.ts # 数据清理
│   │   └── rate-limit.ts  # 频率限制
│   └── services/          # 业务服务
│       ├── comment-service.ts # 评论服务
│       ├── like-service.ts    # 点赞服务
│       └── user-service.ts    # 用户服务
├── content/articles/      # Markdown 文章
├── data/                  # 数据库文件
└── scripts/               # 工具脚本
```

## 🔧 API 接口

### 评论 API
- `GET /api/comments?articleId=xxx` - 获取评论列表
- `POST /api/comments` - 创建新评论

### 点赞 API
- `GET /api/likes?articleId=xxx&userId=xxx` - 获取点赞状态
- `POST /api/likes` - 切换点赞状态

### 用户 API
- `GET /api/users?userId=xxx` - 获取用户信息
- `POST /api/users` - 创建用户
- `PUT /api/users` - 更新用户信息

### 系统 API
- `GET /api/health` - 健康检查
- `GET /api/health?stats=true` - 系统统计信息

## 🛠️ 开发命令

```bash
# 开发服务器
pnpm run dev

# 构建生产版本
pnpm run build

# 启动生产服务器
pnpm run start

# 代码检查
pnpm run lint

# 初始化数据库
pnpm run init-db

# 查看数据库统计
pnpm run db-stats
```

## 📝 添加内容

将 Markdown 文件添加到 `content/articles` 目录。文件结构将决定博客的 URL 结构。

## 🚀 部署

### Vercel 部署
1. 推送到 GitHub/GitLab
2. Vercel 导入此仓库，Framework 选择 Next.js
3. 添加环境变量（如需要）
4. 部署完成

**注意**: 数据库文件在 Vercel 等无状态环境中不会持久化。生产环境建议使用：
- Vercel Postgres
- PlanetScale
- 或其他云数据库服务

### 本地生产部署
```bash
pnpm run build
pnpm run start
```

## 🔒 安全说明

- 所有用户输入都经过严格验证和清理
- 实施了多层防护机制防止常见攻击
- 频率限制防止滥用
- 数据库使用参数化查询防止 SQL 注入

## 📊 监控

访问 `/api/health?stats=true` 查看系统状态和统计信息。

## 🤝 兼容性

- 新系统向后兼容原有的 localStorage 数据
- 如果后端不可用，会自动回退到 localStorage 模式
- 渐进式增强，确保基础功能始终可用

