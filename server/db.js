const { createClient } = require('@libsql/client');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

// 优先使用 Turso 云数据库，降级到本地 SQLite 文件
const url = (process.env.TURSO_DATABASE_URL || '').trim();
const authToken = (process.env.TURSO_AUTH_TOKEN || '').trim();

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
        car_model TEXT,
        remark TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT (datetime('now', 'localtime'))
      )
    `);

    // 迁移：确保 car_model 字段存在
    try { await db.execute(`ALTER TABLE products ADD COLUMN car_model TEXT`); } catch(e) {}

    // 产品表索引优化
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_products_sort ON products(sort_order, created_at DESC)`);

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

    await db.execute(`
      CREATE TABLE IF NOT EXISTS supplier_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        oe_number TEXT NOT NULL,
        supplier_name TEXT NOT NULL,
        supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
        unit_price REAL DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        moq INTEGER DEFAULT 1,
        lead_time TEXT DEFAULT '',
        remark TEXT DEFAULT '',
        created_at DATETIME DEFAULT (datetime('now', 'localtime')),
        updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
      )
    `);
    // 迁移：为已有 supplier_prices 表添加 supplier_id 字段
    try { await db.execute(`ALTER TABLE supplier_prices ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL`); } catch(e) {}

    await db.execute(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        product_name TEXT DEFAULT '',
        oe_number TEXT DEFAULT '',
        category_name TEXT DEFAULT '',
        quantity INTEGER DEFAULT 1,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        customer_phone TEXT DEFAULT '',
        customer_company TEXT DEFAULT '',
        customer_message TEXT DEFAULT '',
        status TEXT DEFAULT 'new',
        admin_reply TEXT DEFAULT '',
        replied_at DATETIME,
        created_at DATETIME DEFAULT (datetime('now', 'localtime'))
      )
    `);

    // 创建索引加速查询
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_supplier_prices_oe ON supplier_prices(oe_number)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at)`);

    // 迁移：为已有 inquiries 表添加新字段
    try { await db.execute(`ALTER TABLE inquiries ADD COLUMN quantity INTEGER DEFAULT 1`); } catch(e) {}
    try { await db.execute(`ALTER TABLE inquiries ADD COLUMN customer_company TEXT DEFAULT ''`); } catch(e) {}

    // ==================== videos 表 ====================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL DEFAULT '',
        youtube_url TEXT NOT NULL DEFAULT '',
        youtube_id TEXT DEFAULT '',
        thumbnail_url TEXT DEFAULT '',
        description TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        is_published INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT (datetime('now', 'localtime')),
        updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
      )
    `);

    // ==================== news 表 ====================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL DEFAULT '',
        title_zh TEXT DEFAULT '',
        title_en TEXT DEFAULT '',
        title_es TEXT DEFAULT '',
        content TEXT DEFAULT '',
        content_zh TEXT DEFAULT '',
        content_en TEXT DEFAULT '',
        content_es TEXT DEFAULT '',
        cover_image TEXT DEFAULT '',
        summary TEXT DEFAULT '',
        summary_zh TEXT DEFAULT '',
        summary_en TEXT DEFAULT '',
        summary_es TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        is_published INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT (datetime('now', 'localtime')),
        updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
      )
    `);

    await db.execute(
      `CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL DEFAULT '',
        bank_account_name TEXT DEFAULT '',
        bank_card_number TEXT DEFAULT '',
        bank_name TEXT DEFAULT '',
        contact_person TEXT DEFAULT '',
        contact_phone TEXT DEFAULT '',
        car_models TEXT DEFAULT '',
        factory_catalogs TEXT DEFAULT '[]',
        priority TEXT DEFAULT 'normal',
        created_at DATETIME DEFAULT (datetime('now','localtime')),
        updated_at DATETIME DEFAULT (datetime('now','localtime'))
      )`
    );
    // 迁移：为已有 suppliers 表添加 priority 字段
    try { await db.execute(`ALTER TABLE suppliers ADD COLUMN priority TEXT DEFAULT 'normal'`); } catch(e) {}

    await db.execute(`CREATE INDEX IF NOT EXISTS idx_videos_published ON videos(is_published, sort_order)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_news_published ON news(is_published, sort_order)`);

    // ==================== quotations 表（报价管理）====================
    await db.execute(
      `CREATE TABLE IF NOT EXISTS quotations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT DEFAULT 'internal',
        customer_name TEXT DEFAULT '',
        customer_email TEXT DEFAULT '',
        customer_phone TEXT DEFAULT '',
        customer_company TEXT DEFAULT '',
        oe_number TEXT NOT NULL DEFAULT '',
        quantity INTEGER DEFAULT 1,
        unit_price REAL DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        supplier_name TEXT DEFAULT '',
        remark TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT (datetime('now','localtime')),
        updated_at DATETIME DEFAULT (datetime('now','localtime'))
      )`
    );

    await db.execute(`CREATE INDEX IF NOT EXISTS idx_quotations_oe ON quotations(oe_number)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_quotations_created ON quotations(created_at)`);
    // 为 quotations 表添加 customer_id 字段（已有表 ALTER）
    try { await db.execute(`ALTER TABLE quotations ADD COLUMN customer_id INTEGER`); } catch(e) {}
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id)`);

    // ==================== customers 表（客户管理）====================
    await db.execute(
      `CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL DEFAULT '',
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        company TEXT DEFAULT '',
        country TEXT DEFAULT '',
        address TEXT DEFAULT '',
        remark TEXT DEFAULT '',
        source TEXT DEFAULT 'manual',
        created_at DATETIME DEFAULT (datetime('now','localtime')),
        updated_at DATETIME DEFAULT (datetime('now','localtime'))
      )`
    );

    await db.execute(`CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company)`);

    // 迁移：为 quotations 和 inquiries 表添加 customer_id 字段
    try { await db.execute(`ALTER TABLE quotations ADD COLUMN customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL`); } catch(e) {}
    try { await db.execute(`ALTER TABLE inquiries ADD COLUMN customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL`); } catch(e) {}

    // ==================== orders 表（订单管理）====================
    await db.execute(
      `CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quotation_ids TEXT DEFAULT '',
        customer_name TEXT DEFAULT '',
        customer_email TEXT DEFAULT '',
        customer_phone TEXT DEFAULT '',
        customer_company TEXT DEFAULT '',
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        remark TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        total_amount REAL DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        created_at DATETIME DEFAULT (datetime('now','localtime')),
        updated_at DATETIME DEFAULT (datetime('now','localtime'))
      )`
    );
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)`);

    // ==================== order_items 表（订单明细）====================
    await db.execute(
      `CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        quotation_id INTEGER REFERENCES quotations(id) ON DELETE SET NULL,
        oe_number TEXT DEFAULT '',
        product_name TEXT DEFAULT '',
        quantity INTEGER DEFAULT 1,
        unit_price REAL DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        supplier_name TEXT DEFAULT '',
        remark TEXT DEFAULT '',
        created_at DATETIME DEFAULT (datetime('now','localtime'))
      )`
    );
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)`);

    // ==================== purchase_contracts 表（采购合同）====================
    await db.execute(
      `CREATE TABLE IF NOT EXISTS purchase_contracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_ids TEXT DEFAULT '',
        supplier_name TEXT NOT NULL DEFAULT '',
        remark TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        total_amount REAL DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        created_at DATETIME DEFAULT (datetime('now','localtime')),
        updated_at DATETIME DEFAULT (datetime('now','localtime'))
      )`
    );
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_purchase_contracts_status ON purchase_contracts(status)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_purchase_contracts_supplier ON purchase_contracts(supplier_name)`);

    // ==================== purchase_contract_items 表（采购合同明细）====================
    await db.execute(
      `CREATE TABLE IF NOT EXISTS purchase_contract_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contract_id INTEGER NOT NULL REFERENCES purchase_contracts(id) ON DELETE CASCADE,
        order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
        order_item_id INTEGER REFERENCES order_items(id) ON DELETE SET NULL,
        oe_number TEXT DEFAULT '',
        product_name TEXT DEFAULT '',
        quantity INTEGER DEFAULT 1,
        unit_price REAL DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        remark TEXT DEFAULT '',
        created_at DATETIME DEFAULT (datetime('now','localtime'))
      )`
    );
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_pc_items_contract ON purchase_contract_items(contract_id)`);

    // 迁移：inquiries 表添加 quotation_id 字段
    try { await db.execute(`ALTER TABLE inquiries ADD COLUMN quotation_id INTEGER REFERENCES quotations(id) ON DELETE SET NULL`); } catch(e) {}
    // 迁移：inquiries 表添加 group_id 字段（批量询盘分组）
    try { await db.execute(`ALTER TABLE inquiries ADD COLUMN group_id TEXT DEFAULT ''`); } catch(e) {}
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_inquiries_group ON inquiries(group_id)`);

    // 迁移：quotations 表添加 order_id 字段
    try { await db.execute(`ALTER TABLE quotations ADD COLUMN order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL`); } catch(e) {}

    // ==================== SEO/GEO 国际推广中心 ====================
    // 全局 SEO 配置（DeepSeek API Key 等）
    await db.execute(`
      CREATE TABLE IF NOT EXISTS seo_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        deepseek_api_key TEXT DEFAULT '',
        deepseek_base_url TEXT DEFAULT 'https://api.deepseek.com',
        deepseek_model TEXT DEFAULT 'deepseek-chat',
        default_language TEXT DEFAULT 'en',
        updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
      )
    `);
    await db.execute(`INSERT OR IGNORE INTO seo_settings (id) VALUES (1)`);

    // 目标市场
    await db.execute(`
      CREATE TABLE IF NOT EXISTS seo_target_markets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        country_code TEXT NOT NULL,
        country_name TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'en',
        status TEXT DEFAULT 'active',
        start_date TEXT DEFAULT '',
        end_date TEXT DEFAULT '',
        budget_monthly REAL DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        notes TEXT DEFAULT '',
        created_at DATETIME DEFAULT (datetime('now', 'localtime')),
        updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
      )
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_seo_markets_status ON seo_target_markets(status)`);

    // 目标关键词
    await db.execute(`
      CREATE TABLE IF NOT EXISTS seo_keywords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        market_id INTEGER NOT NULL REFERENCES seo_target_markets(id) ON DELETE CASCADE,
        keyword TEXT NOT NULL,
        search_intent TEXT DEFAULT 'informational',
        priority TEXT DEFAULT 'medium',
        current_rank TEXT DEFAULT '',
        target_rank TEXT DEFAULT 'top10',
        notes TEXT DEFAULT '',
        created_at DATETIME DEFAULT (datetime('now', 'localtime'))
      )
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_seo_keywords_market ON seo_keywords(market_id)`);

    // SEO 任务
    await db.execute(`
      CREATE TABLE IF NOT EXISTS seo_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        market_id INTEGER REFERENCES seo_target_markets(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        task_type TEXT DEFAULT 'optimization',
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        due_date TEXT DEFAULT '',
        completed_at DATETIME,
        created_at DATETIME DEFAULT (datetime('now', 'localtime')),
        updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
      )
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_seo_tasks_market ON seo_tasks(market_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_seo_tasks_status ON seo_tasks(status)`);

    // AI 内容生成日志
    await db.execute(`
      CREATE TABLE IF NOT EXISTS seo_content_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        market_id INTEGER REFERENCES seo_target_markets(id) ON DELETE SET NULL,
        content_type TEXT NOT NULL,
        target_url TEXT DEFAULT '',
        title TEXT DEFAULT '',
        content TEXT DEFAULT '',
        language TEXT DEFAULT 'en',
        model TEXT DEFAULT '',
        prompt_summary TEXT DEFAULT '',
        created_at DATETIME DEFAULT (datetime('now', 'localtime'))
      )
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_seo_content_market ON seo_content_log(market_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_seo_content_type ON seo_content_log(content_type)`);

    console.log('  Database tables initialized successfully');
  } catch (err) {
    console.error('  Database initialization failed:', err.message);
    // Don't throw — allow the server to start so the error is visible
  }
}

module.exports = db;
module.exports.initDatabase = initDatabase;
