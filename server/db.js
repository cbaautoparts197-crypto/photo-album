const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
// 确保 .env 在数据库初始化前加载（用于 storage_settings 默认值）
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const DB_PATH = path.resolve(__dirname, '..', 'data', 'database.sqlite');

// 确保 data 目录存在
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// 开启 WAL 模式提升性能
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ==================== 建表 ====================

// 分类表（支持多级）
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER DEFAULT NULL,
    name_zh TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_es TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
  );
`);

// 产品/图片表
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER DEFAULT NULL,
    name TEXT NOT NULL DEFAULT '',
    filename TEXT NOT NULL,
    qiniu_key TEXT NOT NULL,
    qiniu_url TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    mime_type TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    oe_number TEXT DEFAULT '',
    remark TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  );
`);

// 公司信息表
db.exec(`
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
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

// 初始化默认公司信息
const hasCompany = db.prepare('SELECT id FROM company_info WHERE id = 1').get();
if (!hasCompany) {
  db.prepare(`
    INSERT INTO company_info (id, company_name_zh, company_name_en, company_name_es)
    VALUES (1, 'RBS Auto Parts', 'RBS Auto Parts', 'RBS Auto Parts')
  `).run();
}

// 水印设置表（单行配置）
db.exec(`
  CREATE TABLE IF NOT EXISTS watermark_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    enabled INTEGER DEFAULT 0,
    text TEXT DEFAULT '',
    font TEXT DEFAULT 'sans-serif',
    font_size INTEGER DEFAULT 24,
    fill_color TEXT DEFAULT 'rgba(255,255,255,0.3)',
    dissolve INTEGER DEFAULT 70,
    gravity TEXT DEFAULT 'SouthEast',
    dx INTEGER DEFAULT 20,
    dy INTEGER DEFAULT 20,
    image_url TEXT DEFAULT '',
    mode TEXT DEFAULT 'text',
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

// 初始化默认水印设置
const hasWatermark = db.prepare('SELECT id FROM watermark_settings WHERE id = 1').get();
if (!hasWatermark) {
  db.prepare(`INSERT INTO watermark_settings (id) VALUES (1)`).run();
}

// 存储设置表（七牛云配置，单行）
db.exec(`
  CREATE TABLE IF NOT EXISTS storage_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    access_key TEXT DEFAULT '',
    secret_key TEXT DEFAULT '',
    bucket TEXT DEFAULT '',
    domain TEXT DEFAULT '',
    region TEXT DEFAULT 'z0',
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

// 初始化默认存储设置
const hasStorage = db.prepare('SELECT id FROM storage_settings WHERE id = 1').get();
if (!hasStorage) {
  // 从 .env 读取默认值填入
  const envAk = process.env.QINIU_ACCESS_KEY || '';
  const envSk = process.env.QINIU_SECRET_KEY || '';
  const envBucket = process.env.QINIU_BUCKET || '';
  const envDomain = (process.env.QINIU_DOMAIN || '').replace(/\/+$/, '');
  db.prepare(`
    INSERT INTO storage_settings (id, access_key, secret_key, bucket, domain, region)
    VALUES (1, ?, ?, ?, ?, 'z0')
  `).run(envAk, envSk, envBucket, envDomain);
}

// 创建索引
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
  CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
  CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
`);

module.exports = db;
