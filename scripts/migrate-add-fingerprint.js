/**
 * 数据库迁移脚本：添加浏览器指纹字段
 * 为现有的 comments 表添加 browser_fingerprint 字段
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'data', 'blog.db');

function migrateDatabase() {
  console.log('开始数据库迁移：添加浏览器指纹字段...');
  
  const db = new Database(DB_PATH);
  
  try {
    // 检查字段是否已存在
    const tableInfo = db.prepare("PRAGMA table_info(comments)").all();
    const hasFingerprint = tableInfo.some(column => column.name === 'browser_fingerprint');
    
    if (hasFingerprint) {
      console.log('浏览器指纹字段已存在，跳过迁移');
      return;
    }
    
    // 添加浏览器指纹字段
    db.prepare(`
      ALTER TABLE comments 
      ADD COLUMN browser_fingerprint TEXT
    `).run();
    
    console.log('✅ 成功添加浏览器指纹字段');
    
    // 验证字段是否添加成功
    const updatedTableInfo = db.prepare("PRAGMA table_info(comments)").all();
    const fingerprintField = updatedTableInfo.find(column => column.name === 'browser_fingerprint');
    
    if (fingerprintField) {
      console.log('✅ 字段验证成功:', fingerprintField);
    } else {
      console.error('❌ 字段验证失败');
    }
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  } finally {
    db.close();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  migrateDatabase();
}

module.exports = { migrateDatabase };
