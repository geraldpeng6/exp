#!/usr/bin/env node

/**
 * 数据库初始化脚本
 * 用于初始化 SQLite 数据库和基础数据
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 开始初始化数据库...');

try {
  // 确保数据目录存在
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('✅ 创建数据目录:', dataDir);
  }

  // 检查数据库文件是否已存在
  const dbPath = path.join(dataDir, 'blog.db');
  const dbExists = fs.existsSync(dbPath);
  
  if (dbExists) {
    console.log('⚠️  数据库文件已存在:', dbPath);
    console.log('如需重新初始化，请先删除现有数据库文件');
  } else {
    console.log('📝 数据库文件将创建在:', dbPath);
  }

  // 运行数据库连接测试（这会自动创建数据库和表结构）
  console.log('🔧 初始化数据库结构...');
  
  // 直接使用 Next.js 来初始化数据库
  console.log('使用 Next.js 环境初始化数据库...');

  // 创建一个简单的 API 调用来初始化数据库
  const testScript = `
    // 简单的数据库初始化脚本
    const Database = require('better-sqlite3');
    const fs = require('fs');
    const path = require('path');

    try {
      console.log('连接数据库...');

      // 数据库文件路径
      const dbPath = path.join(process.cwd(), 'data', 'blog.db');

      // 创建数据库连接
      const db = new Database(dbPath);

      // 启用外键约束
      db.pragma('foreign_keys = ON');

      // 设置 WAL 模式
      db.pragma('journal_mode = WAL');

      // 读取并执行数据库结构
      const schemaPath = path.join(process.cwd(), 'lib', 'database', 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf-8');

      db.exec(schema);

      console.log('✅ 数据库结构创建成功！');

      // 测试基本查询
      const result = db.prepare('SELECT 1 as test').get();
      if (result && result.test === 1) {
        console.log('✅ 数据库连接测试成功！');
      }

      // 获取统计信息
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
      const commentCount = db.prepare('SELECT COUNT(*) as count FROM comments').get();
      const likeCount = db.prepare('SELECT COUNT(*) as count FROM likes').get();
      const articleCount = db.prepare('SELECT COUNT(*) as count FROM articles').get();

      console.log('📊 数据库统计:');
      console.log('  用户数:', userCount.count);
      console.log('  评论数:', commentCount.count);
      console.log('  点赞数:', likeCount.count);
      console.log('  文章数:', articleCount.count);

      db.close();

    } catch (error) {
      console.error('❌ 数据库初始化失败:', error.message);
      process.exit(1);
    }
  `;

  // 写入临时测试文件
  const tempTestFile = path.join(process.cwd(), 'temp-db-test.js');
  fs.writeFileSync(tempTestFile, testScript);

  try {
    // 执行测试脚本
    execSync(`node ${tempTestFile}`, { stdio: 'inherit' });

    // 删除临时文件
    fs.unlinkSync(tempTestFile);
    
    console.log('\n🎉 数据库初始化完成！');
    console.log('\n📋 接下来你可以：');
    console.log('1. 运行 npm run dev 启动开发服务器');
    console.log('2. 访问 http://localhost:3000/api/health?stats=true 查看系统状态');
    console.log('3. 开始使用评论和点赞功能');
    
  } catch (error) {
    // 清理临时文件
    if (fs.existsSync(tempTestFile)) {
      fs.unlinkSync(tempTestFile);
    }
    throw error;
  }

} catch (error) {
  console.error('\n❌ 初始化失败:', error.message);
  console.error('\n🔧 请检查：');
  console.error('1. Node.js 版本是否支持（建议 18+）');
  console.error('2. 依赖是否正确安装（运行 npm install）');
  console.error('3. 文件权限是否正确');
  process.exit(1);
}
