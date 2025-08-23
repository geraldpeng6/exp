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
  } catch (e) {
    console.warn('应用轻量迁移失败或不需要:', e instanceof Error ? e.message : e);
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
    const result = database.prepare('SELECT 1 as test').get();

    return !!(result && (result as any).test === 1);
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
