const fs = require('fs');
const path = require('path');
const db = require('../config/db');

// 마이그레이션 실행
async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');

    // SQL 파일 읽기
    const sqlPath = path.join(__dirname, '001_init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Run the entire SQL file in one call to preserve dollar-quoted functions
    await db.query(sql);
    console.log('✅ Executed migration SQL file');

    console.log('✅ All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// 직접 실행 시
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
