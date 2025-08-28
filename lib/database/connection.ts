import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * 数据库连接管理
 * 使用 SQLite 作为轻量级数据库解决方案
 * 自动处理数据库初始化和迁移
 */

let db: Database.Database | null = null;

/**
 * 获取数据库连接实例
 * 使用单例模式确保只有一个数据库连接
 */
export function getDatabase(): Database.Database {
  if (!db) {
    // 数据库文件路径（存储在项目根目录的 data 文件夹中）
    const dbPath = join(process.cwd(), 'data', 'blog.db');

    // 创建数据库连接
    db = new Database(dbPath);

    // 启用外键约束
    db.pragma('foreign_keys = ON');

    // 设置 WAL 模式以提高并发性能
    db.pragma('journal_mode = WAL');

    // 初始化数据库结构
    initializeDatabase(db);

    console.log('数据库连接已建立:', dbPath);
  }

  return db;
}

/**
 * 初始化数据库结构
 * 读取 schema.sql 文件并执行，并应用轻量迁移
 */
function initializeDatabase(database: Database.Database): void {
  try {
    // 读取数据库结构文件
    const schemaPath = join(process.cwd(), 'lib', 'database', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // 执行数据库结构创建
    database.exec(schema);

    // 轻量迁移：确保评论表包含快照列（nickname, avatar_url, raw_content, browser_fingerprint）
    applyMigrations(database);

    console.log('数据库结构初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw new Error('数据库初始化失败');
  }
}

function applyMigrations(database: Database.Database): void {
  try {
    // 迁移1：comments 表新增快照列兜底
    const cols = database.prepare(`PRAGMA table_info(comments)`).all() as Array<{ name: string }>;
    const colNames = new Set(cols.map(c => c.name));

    const toAdd: string[] = [];
    if (!colNames.has('nickname')) {
      toAdd.push("ADD COLUMN nickname TEXT NOT NULL DEFAULT '匿名用户'");
    }
    if (!colNames.has('avatar_url')) {
      toAdd.push("ADD COLUMN avatar_url TEXT NOT NULL DEFAULT ''");
    }
    if (!colNames.has('raw_content')) {
      toAdd.push("ADD COLUMN raw_content TEXT NOT NULL DEFAULT ''");
    }
    if (!colNames.has('browser_fingerprint')) {
      toAdd.push("ADD COLUMN browser_fingerprint TEXT");
    }

    for (const clause of toAdd) {
      database.exec(`ALTER TABLE comments ${clause};`);
    }

    // 迁移2：确保 article_summaries 表存在
    database.exec(`
      CREATE TABLE IF NOT EXISTS article_summaries (
        slug TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT 'openai',
        model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
        summary TEXT NOT NULL,
        system_prompt TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        PRIMARY KEY (slug, provider, model)
      );
      CREATE INDEX IF NOT EXISTS idx_article_summaries_slug ON article_summaries(slug);
    `);
  } catch (e) {

  // 迁移2.1：article_summaries 增加 system_prompt 列
  try {
    const smCols = database.prepare(`PRAGMA table_info(article_summaries)`).all() as Array<{ name: string }>;
    const hasPrompt = Array.isArray(smCols) && smCols.some((c) => (c as { name?: string }).name === 'system_prompt');
    if (!hasPrompt) {
      database.exec(`ALTER TABLE article_summaries ADD COLUMN system_prompt TEXT NOT NULL DEFAULT ''`);
    }
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('article_summaries 增加 system_prompt 列失败或不需要:', e instanceof Error ? e.message : e);
    }
  }

    if (process.env.NODE_ENV !== 'production') {
      console.warn('应用轻量迁移失败或不需要:', e instanceof Error ? e.message : e);
    }
  }

  try {
    // 迁移3：确保埋点表存在
    database.exec(`
      CREATE TABLE IF NOT EXISTS article_views (
        slug TEXT NOT NULL,
        day_start_utc INTEGER NOT NULL,
        views INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (slug, day_start_utc)
      );
      CREATE INDEX IF NOT EXISTS idx_article_views_slug ON article_views(slug);
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL DEFAULT (unixepoch()),
        fp TEXT,
        path TEXT,
        ref TEXT,
        utm TEXT,
        type TEXT NOT NULL,
        payload TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
    `);

    // 迁移3.1：若既有库缺少 day_start_utc 列，则补齐并填充
    try {
      const avCols = database.prepare(`PRAGMA table_info(article_views)`).all() as Array<{ name: string }>;
      const hasDay = Array.isArray(avCols) && avCols.some((c) => (c as { name?: string }).name === 'day_start_utc');
      if (!hasDay) {
        try { database.exec(`ALTER TABLE article_views ADD COLUMN day_start_utc INTEGER;`); } catch {}
        try { database.exec(`CREATE INDEX IF NOT EXISTS idx_article_views_day ON article_views(day_start_utc, slug);`); } catch {}
        try { database.exec(`UPDATE article_views SET day_start_utc = unixepoch(date || ' 00:00:00') WHERE day_start_utc IS NULL;`); } catch {}
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('article_views day_start_utc 迁移失败或不需要:', e instanceof Error ? e.message : e);
      }
    }

    // 迁移3.2：若旧表仍含 date 列，执行破坏性迁移为仅 day_start_utc 主键
    try {
      const cols2 = database.prepare(`PRAGMA table_info(article_views)`).all() as Array<{ name: string }>;
      const hasDate = Array.isArray(cols2) && cols2.some((c) => (c as { name?: string }).name === 'date');
      if (hasDate) {
        // 使用事务保证一致性
        database.exec('BEGIN');
        try {
          // 新表结构（无 date，主键为 slug+day_start_utc）
          database.exec(`
            CREATE TABLE IF NOT EXISTS article_views_new (
              slug TEXT NOT NULL,
              day_start_utc INTEGER NOT NULL,
              views INTEGER NOT NULL DEFAULT 0,
              PRIMARY KEY (slug, day_start_utc)
            );
          `);

          // 将旧表数据聚合拷贝到新表（将相同 slug+day_start_utc 的视图数累加）
          database.exec(`
            INSERT INTO article_views_new (slug, day_start_utc, views)
            SELECT slug,
                   COALESCE(day_start_utc, unixepoch(date || ' 00:00:00')) AS day_start_utc,
                   SUM(views) as views
            FROM article_views
            GROUP BY slug, day_start_utc
          `);

          // 替换旧表
          database.exec('DROP TABLE article_views;');
          database.exec('ALTER TABLE article_views_new RENAME TO article_views;');

          // 重建索引
          database.exec('CREATE INDEX IF NOT EXISTS idx_article_views_slug ON article_views(slug);');
          database.exec('CREATE INDEX IF NOT EXISTS idx_article_views_day ON article_views(day_start_utc, slug);');

          database.exec('COMMIT');
        } catch (err) {
          database.exec('ROLLBACK');
          if (process.env.NODE_ENV !== 'production') {
            console.warn('article_views 破坏性迁移失败，已回滚:', err instanceof Error ? err.message : err);
          }
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('检查/迁移 article_views(date->day_start_utc) 时出错:', e instanceof Error ? e.message : e);
      }
    }

  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('埋点表迁移失败或不需要:', e instanceof Error ? e.message : e);
    }
  }
}

/**
 * 关闭数据库连接
 * 通常在应用程序关闭时调用
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('数据库连接已关闭');
  }
}

/**
 * 数据库事务包装器
 * 自动处理事务的开始、提交和回滚
 */
export function withTransaction<T>(
  callback: (db: Database.Database) => T
): T {
  const database = getDatabase();
  const transaction = database.transaction(callback);
  return transaction(database);
}

/**
 * 数据库健康检查
 * 验证数据库连接和基本功能是否正常
 */
export function healthCheck(): boolean {
  try {
    const database = getDatabase();

    // 执行简单查询验证连接
    const result = database.prepare('SELECT 1 as test').get() as { test?: number } | undefined;

    return !!(result && result.test === 1);
  } catch (error) {
    console.error('数据库健康检查失败:', error);
    return false;
  }
}

/**
 * 获取数据库统计信息
 * 用于监控和调试
 */
export function getDatabaseStats() {
  const database = getDatabase();

  try {
    const userCount = database.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const commentCount = database.prepare('SELECT COUNT(*) as count FROM comments').get() as { count: number };
    const likeCount = database.prepare('SELECT COUNT(*) as count FROM likes').get() as { count: number };
    const articleCount = database.prepare('SELECT COUNT(*) as count FROM articles').get() as { count: number };

    return {
      users: userCount.count,
      comments: commentCount.count,
      likes: likeCount.count,
      articles: articleCount.count,
      healthy: true
    };
  } catch (error) {
    console.error('获取数据库统计信息失败:', error);
    return {
      users: 0,
      comments: 0,
      likes: 0,
      articles: 0,
      healthy: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}
