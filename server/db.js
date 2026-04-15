const { createClient } = require('@libsql/client');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

// 优先使用 Turso 云数据库，降级到本地 SQLite 文件
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  throw new Error('TURSO_DATABASE_URL is required. Please set it in .env or Vercel environment variables.');
}

const db = createClient({
  url,
  authToken: authToken || undefined,
});

// 建表初始化
async function initDatabase() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        name_zh TEXT NOT NULL,
        name_en TEXT NOT NULL,
        name_es TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT (datetime('now', 'localtime'))
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        filename TEXT,
        qiniu_key TEXT,
        qiniu_url TEXT,
        file_size INTEGER DEFAULT 0,
        mime_type TEXT,
        oe_number TEXT,
        remark TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT (datetime('now', 'localtime'))
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS company_info (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        company_name_zh TEXT DEFAULT '',
        company_name_en TEXT DEFAULT '',
        company_name_es TEXT DEFAULT '',
        logo_url TEXT DEFAULT '',
        description_zh TEXT DEFAULT '',
        description_en TEXT DEFAULT '',
        description_es TEXT DEFAULT '',
        address TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        email TEXT DEFAULT '',
        whatsapp TEXT DEFAULT '',
        website TEXT DEFAULT '',
        seo_title_zh TEXT DEFAULT '',
        seo_title_en TEXT DEFAULT '',
        seo_title_es TEXT DEFAULT '',
        seo_keywords TEXT DEFAULT '',
        created_at DATETIME DEFAULT (datetime('now', 'localtime')),
        updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
      )
    `);

    // 初始化公司信息默认行
    await db.execute(`INSERT OR IGNORE INTO company_info (id) VALUES (1)`);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS watermark_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        enabled INTEGER DEFAULT 0,
        text TEXT DEFAULT '',
        font TEXT DEFAULT 'sans-serif',
        font_size INTEGER DEFAULT 360,
        fill_color TEXT DEFAULT 'rgba(255,255,255,0.3)',
        dissolve INTEGER DEFAULT 50,
        gravity TEXT DEFAULT 'SouthEast',
        dx INTEGER DEFAULT 20,
        dy INTEGER DEFAULT 20,
        image_url TEXT DEFAULT '',
        mode TEXT DEFAULT 'text',
        updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
      )
    `);

    await db.execute(`INSERT OR IGNORE INTO watermark_settings (id) VALUES (1)`);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS storage_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        access_key TEXT DEFAULT '',
        secret_key TEXT DEFAULT '',
        bucket TEXT DEFAULT '',
        domain TEXT DEFAULT '',
        region TEXT DEFAULT 'z0',
        updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
      )
    `);

    await db.execute(`INSERT OR IGNORE INTO storage_settings (id) VALUES (1)`);

    console.log('  Database tables initialized successfully');
  } catch (err) {
    console.error('  Database initialization failed:', err.message);
    // Don't throw — allow the server to start so the error is visible
  }
}

module.exports = db;
module.exports.initDatabase = initDatabase;
