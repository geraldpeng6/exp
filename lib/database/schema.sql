-- 博客数据库结构
-- 使用 SQLite 作为轻量级数据库解决方案

-- 用户表（存储匿名用户身份信息）
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,                    -- 用户唯一标识
    nickname TEXT NOT NULL,                -- 用户昵称
    avatar_seed TEXT NOT NULL,             -- 头像种子（用于生成头像链接）
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),  -- 创建时间
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())   -- 更新时间
);

-- 文章表（存储文章基本信息）
CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,                    -- 文章ID（通常是文件名）
    title TEXT NOT NULL,                   -- 文章标题
    slug TEXT NOT NULL UNIQUE,             -- 文章路径标识
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 评论表（快照存储昵称与头像链接）
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,                    -- 评论唯一标识
    article_id TEXT NOT NULL,              -- 关联的文章ID
    user_id TEXT NOT NULL,                 -- 评论用户ID
    nickname TEXT NOT NULL,                -- 评论时的昵称快照
    avatar_url TEXT NOT NULL,              -- 评论时的头像链接快照
    content TEXT NOT NULL,                 -- 评论内容（已清理的安全内容）
    raw_content TEXT NOT NULL,             -- 原始内容（用于编辑）
    browser_fingerprint TEXT,              -- 浏览器指纹（用于删除权限验证）
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 点赞表
CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id TEXT NOT NULL,              -- 关联的文章ID
    user_id TEXT NOT NULL,                 -- 点赞用户ID
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    -- 确保同一用户对同一文章只能点赞一次
    UNIQUE(article_id, user_id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments(article_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_article_id ON likes(article_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);

-- 创建触发器自动更新 updated_at 字段
CREATE TRIGGER IF NOT EXISTS update_users_updated_at
    AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = unixepoch() WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_articles_updated_at
    AFTER UPDATE ON articles
BEGIN
    UPDATE articles SET updated_at = unixepoch() WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_comments_updated_at
    AFTER UPDATE ON comments
BEGIN
    UPDATE comments SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- 文章摘要缓存表
CREATE TABLE IF NOT EXISTS article_summaries (
    slug TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'openai',
    model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    summary TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (slug, provider, model)
);

CREATE INDEX IF NOT EXISTS idx_article_summaries_slug ON article_summaries(slug);


-- 访问与埋点
CREATE TABLE IF NOT EXISTS article_views (
    slug TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    views INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (slug, date)
);
CREATE INDEX IF NOT EXISTS idx_article_views_slug ON article_views(slug);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts INTEGER NOT NULL DEFAULT (unixepoch()),
    fp TEXT, -- browser fingerprint
    path TEXT,
    ref TEXT,
    utm TEXT,
    type TEXT NOT NULL,
    payload TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

-- 全站 AI 使用量（UTC 自然日）
CREATE TABLE IF NOT EXISTS ai_usage (
    day_start_utc INTEGER PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0
);
