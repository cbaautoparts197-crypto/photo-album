import { Hono } from 'hono';
import { getDb, authMiddleware } from '../middleware/auth';
import { getWanConfig, getAiSettings, callWanImageEdit, pollWanTask, callWanImageToVideo, pollWanVideoTask, downloadImageAsBuffer, generateStoryboard, stripJpegMetadata } from '../utils/ai';
import { uploadImageToVOD, buildSlideshowTimeline, produceSlideshowVideo, getVodPlayUrl } from '../utils/vod';
import { setupR2, uploadToR2 } from '../utils/r2';
import { recordApiUsage } from '../utils/api_usage';

const app = new Hono();

const SITE_ORIGIN = 'https://rbs-autoparts.com';

// Helper: download from external URL and upload to R2
async function downloadAndUploadToR2(url: string, key: string, contentType: string): Promise<void> {
  const buffer = await downloadImageAsBuffer(url);
  await uploadToR2(key, buffer, contentType);
}

/**
 * Compress product image to ≤3.5MB for Wan/DashScope API (max 4MB limit).
 * Strategies: strip JPEG metadata → try WebP from origin → fallback error.
 * Returns the (possibly new) image URL.
 */
async function compressImageForWan(imageUrl: string): Promise<string> {
  const resp = await fetch(imageUrl);
  if (!resp.ok) throw new Error(`Failed to fetch image: HTTP ${resp.status}`);

  const contentType = resp.headers.get('content-type') || 'image/jpeg';
  const buffer = await resp.arrayBuffer();
  const limit = 3.5 * 1024 * 1024; // 3.5MB — leave headroom below 4MB API limit

  if (buffer.byteLength <= limit) return imageUrl; // Already small enough

  // Strategy 1: Strip JPEG metadata (EXIF, ICC, XMP) — saves 0.5-2MB typically
  if (contentType.includes('jpeg') || contentType.includes('jpg')) {
    const stripped = stripJpegMetadata(buffer);
    if (stripped.byteLength <= limit) {
      const key = `social-media/compressed/${crypto.randomUUID()}.jpg`;
      await uploadToR2(key, stripped, 'image/jpeg');
      return `https://rbs-autoparts.com/r2-files/${encodeURIComponent(key)}`;
    }
  }

  // Strategy 2: Try to get WebP version from origin
  try {
    const webpResp = await fetch(imageUrl, {
      headers: { 'Accept': 'image/webp,image/*;q=0.8' },
    });
    if (webpResp.ok) {
      const webpBuffer = await webpResp.arrayBuffer();
      if (webpBuffer.byteLength <= limit) {
        const key = `social-media/compressed/${crypto.randomUUID()}.webp`;
        await uploadToR2(key, webpBuffer, 'image/webp');
        return `https://rbs-autoparts.com/r2-files/${encodeURIComponent(key)}`;
      }
    }
  } catch { /* fall through */ }

  throw new Error(
    `Image too large: ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB (max 3.5MB). ` +
    `Metadata stripping result still over limit. Try uploading a smaller product image.`
  );
}

/** 将内部相对路径转为完整公网 URL，已是完整 URL 则原样返回 */
function toPublicUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return SITE_ORIGIN + url;
  return SITE_ORIGIN + '/' + url;
}

// ==================== 数据库表自动迁移 ====================
const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS social_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  postforme_api_key TEXT DEFAULT '',
  postforme_webhook_secret TEXT DEFAULT '',
  deepseek_api_key TEXT DEFAULT '',
  deepseek_base_url TEXT DEFAULT 'https://api.deepseek.com',
  deepseek_model TEXT DEFAULT 'deepseek-v4-flash',
  default_language TEXT DEFAULT 'en',
  auto_publish_enabled INTEGER DEFAULT 0,
  daily_post_limit INTEGER DEFAULT 5,
  min_interval_minutes INTEGER DEFAULT 60,
  quiet_hours_start TEXT DEFAULT '23:00',
  quiet_hours_end TEXT DEFAULT '07:00',
  default_target_markets TEXT DEFAULT '["us","eu"]',
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS social_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  postforme_account_id TEXT UNIQUE NOT NULL,
  platform TEXT NOT NULL,
  platform_username TEXT DEFAULT '',
  platform_display_name TEXT DEFAULT '',
  platform_avatar_url TEXT DEFAULT '',
  is_active INTEGER DEFAULT 1,
  synced_at TEXT DEFAULT (datetime('now', 'localtime')),
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS social_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER,
  product_name TEXT DEFAULT '',
  product_oe TEXT DEFAULT '',
  platform TEXT NOT NULL,
  account_id INTEGER,
  postforme_account_id TEXT DEFAULT '',
  postforme_post_id TEXT DEFAULT '',
  caption TEXT DEFAULT '',
  media_urls TEXT DEFAULT '[]',
  title TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  privacy_status TEXT DEFAULT '',
  made_for_kids INTEGER DEFAULT 0,
  hashtags TEXT DEFAULT '',
  language TEXT DEFAULT 'en',
  target_market TEXT DEFAULT 'us',
  status TEXT DEFAULT 'draft',
  postforme_status TEXT DEFAULT '',
  scheduled_at TEXT,
  published_at TEXT,
  post_url TEXT DEFAULT '',
  error_message TEXT DEFAULT '',
  auto_generated INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS social_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  template_name TEXT DEFAULT '',
  caption_template TEXT DEFAULT '',
  hashtag_template TEXT DEFAULT '',
  tone TEXT DEFAULT 'professional',
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS social_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  platform TEXT DEFAULT '',
  language TEXT DEFAULT 'en',
  search_volume INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS social_publish_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER,
  platform TEXT,
  account_id INTEGER,
  action TEXT DEFAULT 'publish',
  status TEXT DEFAULT 'pending',
  postforme_post_id TEXT DEFAULT '',
  post_url TEXT DEFAULT '',
  response_data TEXT DEFAULT '',
  error_message TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);
`;

// 运行迁移
async function ensureTables(db: any) {
  // 分开执行避免 Workers 子请求限制
  const statements = MIGRATION_SQL.split(';').filter(s => s.trim());
  for (const sql of statements) {
    try { await db.execute(sql.trim()); } catch {}
  }
  // 确保 social_keywords 的 keyword 列有唯一约束（ON CONFLICT 需要）
  try {
    await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_social_keywords_keyword ON social_keywords(keyword)');
  } catch {}
  // 确保 social_settings 有默认行
  try {
    await db.execute(`INSERT OR IGNORE INTO social_settings (id) VALUES (1)`);
  } catch {}
  // 迁移：social_posts 表新增 YouTube 字段
  const ytmigrations = [
    "ALTER TABLE social_posts ADD COLUMN title TEXT DEFAULT ''",
    "ALTER TABLE social_posts ADD COLUMN thumbnail_url TEXT DEFAULT ''",
    "ALTER TABLE social_posts ADD COLUMN privacy_status TEXT DEFAULT ''",
    "ALTER TABLE social_posts ADD COLUMN made_for_kids INTEGER DEFAULT 0",
  ];
  for (const sql of ytmigrations) {
    try { await db.execute(sql); } catch {}
  }
  // 迁移：social_settings 新增 VOD 字段
  const vodMigrations = [
    "ALTER TABLE social_settings ADD COLUMN vod_access_key_id TEXT DEFAULT ''",
    "ALTER TABLE social_settings ADD COLUMN vod_access_key_secret TEXT DEFAULT ''",
  ];
  for (const sql of vodMigrations) {
    try { await db.execute(sql); } catch {}
  }
  // 迁移：social_settings 新增 qwen/Wan 字段 (2026-06-12)
  const wanMigrations = [
    "ALTER TABLE social_settings ADD COLUMN qwen_api_key TEXT DEFAULT ''",
    "ALTER TABLE social_settings ADD COLUMN qwen_base_url TEXT DEFAULT 'https://dashscope.aliyuncs.com'",
  ];
  for (const sql of wanMigrations) {
    try { await db.execute(sql); } catch {}
  }
  // 确保 social_settings 与 seo_settings 的 qwen_api_key 同步（只同步一次：social 为空且 seo 有值时）
  try {
    const social = await db.execute('SELECT qwen_api_key FROM social_settings WHERE id = 1');
    const sKey = (social.rows[0] as any)?.qwen_api_key || '';
    if (!sKey) {
      const seo = await db.execute('SELECT qwen_api_key FROM seo_settings WHERE id = 1');
      const seoKey = (seo.rows[0] as any)?.qwen_api_key || '';
      if (seoKey) {
        await db.execute('UPDATE social_settings SET qwen_api_key = ? WHERE id = 1', [seoKey]);
      }
    }
  } catch {}
}

// ==================== 设置管理 ====================

// GET /settings
app.get('/settings', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    await ensureTables(db);
    const result = await db.execute('SELECT * FROM social_settings WHERE id = 1');
    return c.json({ success: true, data: result.rows[0] || {} });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// PUT /settings
app.put('/settings', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    const body = await c.req.json();
    const fields: string[] = [];
    const params: any[] = [];

    const allowedFields = [
      'postforme_api_key', 'postforme_webhook_secret',
      'deepseek_api_key', 'deepseek_base_url', 'deepseek_model',
      'default_language', 'auto_publish_enabled', 'daily_post_limit',
      'min_interval_minutes', 'quiet_hours_start', 'quiet_hours_end',
      'default_target_markets',
      'vod_access_key_id', 'vod_access_key_secret',
      'qwen_api_key', 'qwen_base_url',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(String(body[field]));
      }
    }

    if (fields.length === 0) {
      return c.json({ success: false, message: 'No fields to update' }, 400);
    }

    fields.push(`updated_at = datetime('now', 'localtime')`);

    await db.execute(`UPDATE social_settings SET ${fields.join(', ')} WHERE id = 1`, params);
    const result = await db.execute('SELECT * FROM social_settings WHERE id = 1');
    return c.json({ success: true, data: result.rows[0], message: 'Settings saved' });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// ==================== Post For Me 账号同步 ====================

// POST /sync-accounts - 从 Post For Me 拉取已绑定的社媒账号
app.post('/sync-accounts', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    await ensureTables(db);

    const settings = await db.execute('SELECT * FROM social_settings WHERE id = 1');
    const apiKey = (settings.rows[0] as any)?.postforme_api_key;
    if (!apiKey) {
      return c.json({ success: false, message: 'Please configure Post For Me API Key first' }, 400);
    }

    // 调用 Post For Me API 获取已绑定账号
    const response = await fetch('https://api.postforme.dev/v1/social-accounts', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errBody = await response.text();
      return c.json({ success: false, message: `Post For Me API error: ${response.status} - ${errBody}` }, 400);
    }

    const accounts = await response.json();
    let synced = 0;
    const activeIds = new Set<string>();

    for (const acct of (Array.isArray(accounts) ? accounts : (accounts.data || []))) {
      const pfmId = acct.id || acct.account_id;
      const platform = acct.platform || acct.provider || '';
      if (!pfmId || !platform) continue;
      activeIds.add(pfmId);

      await db.execute(
        `INSERT INTO social_accounts (postforme_account_id, platform, platform_username, platform_display_name, platform_avatar_url, synced_at)
         VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
         ON CONFLICT(postforme_account_id) DO UPDATE SET
           platform_username = COALESCE(excluded.platform_username, platform_username),
           platform_display_name = COALESCE(excluded.platform_display_name, platform_display_name),
           platform_avatar_url = COALESCE(excluded.platform_avatar_url, platform_avatar_url),
           synced_at = datetime('now', 'localtime'),
           is_active = 1`,
        [
          pfmId, platform,
          acct.username || acct.name || '',
          acct.display_name || acct.name || '',
          acct.avatar_url || acct.picture || acct.image || '',
        ]
      );
      synced++;
    }

    // 禁用 PFM 中已不存在的旧账号（避免选到失效的 account ID）
    if (activeIds.size > 0) {
      const placeholders = Array.from(activeIds).map(() => '?').join(',');
      await db.execute(
        `UPDATE social_accounts SET is_active = 0 WHERE postforme_account_id NOT IN (${placeholders})`,
        [...activeIds]
      );
    }

    // 获取同步后的账号列表
    const result = await db.execute('SELECT * FROM social_accounts ORDER BY platform, platform_username');
    return c.json({ success: true, data: result.rows, synced });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// GET /accounts - 获取已同步的社媒账号
app.get('/accounts', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    await ensureTables(db);
    const result = await db.execute(
      'SELECT * FROM social_accounts WHERE is_active = 1 ORDER BY platform, platform_username'
    );
    return c.json({ success: true, data: result.rows });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// PUT /accounts/:id/toggle - 启用/禁用账号
app.put('/accounts/:id/toggle', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    const id = c.req.param('id');
    await db.execute(
      'UPDATE social_accounts SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?',
      [id]
    );
    return c.json({ success: true, message: 'Account toggled' });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// ==================== 产品选择（供发布用） ====================

// GET /products-for-publish - 获取可选产品（分页、搜索）
app.get('/products-for-publish', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    await ensureTables(db);
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const search = c.req.query('search') || '';
    const categoryId = c.req.query('category_id') || '';
    const offset = (page - 1) * limit;

    let where = '1=1';
    const params: any[] = [];

    if (search) {
      where += ' AND (p.name LIKE ? OR p.oe_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (categoryId) {
      where += ' AND p.category_id = ?';
      params.push(categoryId);
    }

    // 排除今天已自动发布的
    where += ` AND p.id NOT IN (
      SELECT product_id FROM social_posts
      WHERE product_id IS NOT NULL
        AND auto_generated = 1
        AND date(created_at) = date('now', 'localtime')
    )`;

    const countResult = await db.execute(`SELECT COUNT(*) as total FROM products p WHERE ${where}`, params);
    const total = (countResult.rows[0] as any)?.total || 0;

    const result = await db.execute(
      `SELECT p.id, p.name, p.oe_number, p.qiniu_url, p.category_id,
              c.name_en as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE ${where}
       ORDER BY p.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return c.json({
      success: true,
      data: {
        items: result.rows,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// ==================== AI 智能推荐产品 ====================

// POST /ai-suggest-products - AI 根据目标市场/平台推荐适合发布的产品
app.post('/ai-suggest-products', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    await ensureTables(db);
    const { target_market, platforms, language, count = 5 } = await c.req.json();

    // 获取 DeepSeek API Key
    const settings = await db.execute('SELECT * FROM social_settings WHERE id = 1');
    const s = settings.rows[0] as any;
    const apiKey = s?.deepseek_api_key;
    if (!apiKey) {
      return c.json({ success: false, message: 'Please configure DeepSeek API Key in settings' }, 400);
    }
    const baseUrl = s?.deepseek_base_url || 'https://api.deepseek.com';
    const model = s?.deepseek_model || 'deepseek-v4-flash';
    const lang = language || s?.default_language || 'en';

    // 获取产品候选池：排除今天已自动发布的，从所有有图片的产品中随机选取 100 个
    const candidateResult = await db.execute(
      `SELECT p.id, p.name, p.oe_number, p.category_id, c.name_en as category_name, c.name_zh,
              (SELECT COUNT(*) FROM social_posts sp WHERE sp.product_id = p.id AND sp.status = 'published') as publish_count,
              (SELECT sp.created_at FROM social_posts sp WHERE sp.product_id = p.id ORDER BY sp.created_at DESC LIMIT 1) as last_published
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id NOT IN (
         SELECT product_id FROM social_posts
         WHERE product_id IS NOT NULL AND auto_generated = 1 AND date(created_at) = date('now', 'localtime')
       )
       AND p.qiniu_url IS NOT NULL AND p.qiniu_url != ''
       ORDER BY RANDOM()
       LIMIT 100`
    );

    if (!candidateResult.rows.length) {
      return c.json({ success: true, data: [], message: 'No unpublished products available' });
    }

    // 获取已发布统计（按分类统计最近 7 天发布次数，避免重复）
    const statsResult = await db.execute(
      `SELECT p.category_id, c.name_en as category_name, COUNT(*) as cnt
       FROM social_posts sp
       JOIN products p ON sp.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE sp.created_at >= datetime('now', 'localtime', '-7 days')
         AND sp.status IN ('published', 'scheduled')
       GROUP BY p.category_id
       ORDER BY cnt DESC`
    );
    const categoryStats = statsResult.rows.map((r: any) => `${r.category_name || r.category_id}: ${r.cnt} posts in last 7 days`).join('; ');

    // 构建产品列表摘要给 AI
    const productSummary = candidateResult.rows.map((r: any, i: number) =>
      `[${i}] ID:${r.id} "${r.name}" OE:${r.oe_number} Cat:${r.category_name || r.name_zh || ''} Published:${r.publish_count}x Last:${r.last_published || 'never'}`
    ).join('\n');

    const marketNames: Record<string, string> = {
      us: 'US/North America', eu: 'Europe', me: 'Middle East',
      sa: 'South America', af: 'Africa', sea: 'Southeast Asia',
    };
    const targetMkt = marketNames[target_market] || target_market || 'global';
    const platformList = platforms?.length ? platforms.join(', ') : 'all platforms';

    const prompt = `You are a social media strategist for RBS AutoParts, an auto parts B2B wholesale company (https://rbs-autoparts.com).

Your task: Select the BEST products to post about on social media RIGHT NOW.

Context:
- Target market: ${targetMkt}
- Target platforms: ${platformList}
- Content language: ${lang === 'en' ? 'English' : lang === 'es' ? 'Spanish' : lang === 'ar' ? 'Arabic' : lang}
- Number to recommend: ${count}

Recent posting frequency by category (last 7 days):
${categoryStats || 'No posts in last 7 days'}

Available products (ID, name, OE number, category, times published, last published date):
${productSummary}

Selection criteria:
1. PREFER products that haven't been posted recently (or at all) - freshness matters
2. BALANCE across categories - avoid recommending all from same category
3. CONSIDER market relevance - popular brands/models for the target market
4. PRIORITIZE products with images available
5. VARIETY is key - don't pick too many similar products

Respond in this exact JSON format (no markdown, no code blocks):
{
  "recommendations": [
    {"product_index": 0, "reason": "brief reason why this product is a good pick right now"},
    {"product_index": 3, "reason": "brief reason"}
  ]
}

IMPORTANT: product_index must be the exact [index] number from the product list above.`;

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      return c.json({ success: false, message: `AI API error: ${response.status}` }, 500);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || '';

    let parsed: any = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      parsed = { recommendations: [] };
    }

    // 根据 AI 推荐的 index 映射回产品数据
    const recommendations = (parsed.recommendations || [])
      .slice(0, count)
      .map((r: any) => {
        const product = candidateResult.rows[r.product_index];
        if (!product) return null;
        return {
          id: product.id,
          name: product.name,
          oe_number: product.oe_number,
          qiniu_url: product.qiniu_url,
          category_name: product.category_name || product.name_zh,
          publish_count: product.publish_count,
          reason: r.reason || '',
        };
      })
      .filter(Boolean);

    return c.json({ success: true, data: recommendations });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// ==================== AI 文案生成 ====================

// POST /generate-content - 为选定产品生成各平台文案
app.post('/generate-content', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    await ensureTables(db);
    const {
      product_id, product_name, oe_number, category_name,
      platforms, language, target_market,
      product_image, // 新增：产品图片 URL
    } = await c.req.json();

    if (!product_id && !product_name) {
      return c.json({ success: false, message: 'Product required' }, 400);
    }

    // 获取 DeepSeek API Key
    const settings = await db.execute('SELECT * FROM social_settings WHERE id = 1');
    const s = settings.rows[0] as any;
    const apiKey = s?.deepseek_api_key;
    if (!apiKey) {
      return c.json({ success: false, message: 'Please configure DeepSeek API Key in settings' }, 400);
    }

    const baseUrl = s?.deepseek_base_url || 'https://api.deepseek.com';
    const model = s?.deepseek_model || 'deepseek-v4-flash';
    const lang = language || s?.default_language || 'en';

    // 获取关键词库
    const kwResult = await db.execute(
      'SELECT keyword FROM social_keywords WHERE is_active = 1 ORDER BY search_volume DESC LIMIT 30'
    );
    const keywords = kwResult.rows.map((r: any) => r.keyword).join(', ');

    // 获取产品图片（优先使用前端传递的 URL）
    let productImage = product_image || '';
    if (!productImage && product_id) {
      const imgResult = await db.execute(
        'SELECT qiniu_url FROM products WHERE id = ?',
        [product_id]
      );
      if (imgResult.rows.length > 0) {
        productImage = (imgResult.rows[0] as any).qiniu_url || '';
      }
    }
    productImage = toPublicUrl(productImage);

    const targetPlatforms = platforms || ['facebook', 'instagram', 'tiktok', 'linkedin', 'youtube', 'x', 'pinterest', 'threads', 'bluesky'];
    const results: any[] = [];

    for (const platform of targetPlatforms) {
      const platformGuide = getPlatformGuide(platform);

      const hasImage = !!productImage;

      const prompt = `You are a professional social media content creator for an auto parts B2B wholesale company.

Generate a ${platformGuide.name} post for the following product:
- Product Name: ${product_name || ''}
- OE Number: ${oe_number || ''}
- Category: ${category_name || 'Auto Parts'}
- Company: RBS AutoParts (https://rbs-autoparts.com)
${hasImage ? `- Product Image: ${productImage} (the product image is available, describe it in the post naturally and highlight the product's visual quality)` : ''}

Language: ${lang === 'en' ? 'English' : lang === 'es' ? 'Spanish' : lang === 'ar' ? 'Arabic' : lang}
Target Market: ${target_market || 'global'}

Platform-specific requirements:
${platformGuide.requirements}

${keywords ? `Try to naturally incorporate some of these keywords: ${keywords}` : ''}

Important rules:
- Be professional but engaging
- Include a product link at the end: https://rbs-autoparts.com/products/${product_id || ''} (label it naturally, e.g. "Shop now", "View product", or "Request a quote")
- Highlight quality, compatibility, and wholesale availability
- Keep it concise and impactful
- Do NOT use emoji excessively (max 3-4)
${hasImage ? '- The product image will be included with this post, so your caption should complement the visual content' : ''}
- For the media_suggestion field, give a specific suggestion like "Product photo showing engine mount installed on Toyota Camry" or "Short video demonstrating the mount's flexibility"
${platform === 'youtube' ? '- Also generate a compelling video title (50-100 characters, keyword-rich)' : ''}
${platform === 'x' ? '- Keep it SHORT and punchy, ideally under 280 characters for best engagement, MUST include the product link' : ''}
${platform === 'pinterest' ? '- MUST include the product link prominently for pin clicks' : ''}

Respond in this exact JSON format (no markdown, no code blocks):
${platform === 'youtube'
  ? `{
  "caption": "the post caption text",
  "title": "compelling video title (50-100 chars)",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "media_suggestion": "brief suggestion for image/video to accompany"
}`
  : `{
  "caption": "the post caption text",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "media_suggestion": "brief suggestion for image/video to accompany"
}`}`;

      try {
        const response = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 800,
          }),
        });

        if (!response.ok) {
          results.push({
            platform,
            status: 'error',
            error: `AI API error: ${response.status}`,
            caption: '',
            hashtags: [],
          });
          continue;
        }

        const aiResult = await response.json();
        const content = aiResult.choices?.[0]?.message?.content || '';

        // 解析 AI 返回的 JSON
        let parsed: any = {};
        try {
          // 尝试提取 JSON（可能被包裹在 markdown 代码块中）
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        } catch {
          parsed = { caption: content, hashtags: [] };
        }

        // 安全提取 caption：如果 caption 本身又是 JSON 字符串，再解析一层
        let captionText = parsed.caption || '';
        if (typeof captionText === 'string' && captionText.startsWith('{')) {
          try {
            const inner = JSON.parse(captionText);
            if (typeof inner.caption === 'string') captionText = inner.caption;
            else if (typeof inner.text === 'string') captionText = inner.text;
          } catch { /* 不是有效 JSON，保留原值 */ }
        }

        results.push({
          platform,
          status: 'generated',
          caption: captionText,
          title: parsed.title || '',
          hashtags: parsed.hashtags || [],
          media_suggestion: parsed.media_suggestion || '',
        });
      } catch (err: any) {
        results.push({
          platform,
          status: 'error',
          error: err.message,
          caption: '',
          hashtags: [],
        });
      }
    }

    // 保存生成的文案到 social_posts（状态为 draft）
    const savedPosts: any[] = [];
    const mediaUrls = productImage ? JSON.stringify([productImage]) : '[]';
    for (const r of results) {
      if (r.status !== 'generated') continue;
      const postResult = await db.execute(
        `INSERT INTO social_posts (product_id, product_name, product_oe, platform, caption, title, hashtags, media_urls, language, target_market, status, auto_generated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1)`,
        [
          product_id || null,
          product_name || '',
          oe_number || '',
          r.platform,
          r.caption,
          r.title || '',
          JSON.stringify(r.hashtags),
          mediaUrls,
          lang,
          target_market || 'us',
        ]
      );
      savedPosts.push({
        ...r,
        id: Number(postResult.lastInsertRowid),
        title: r.title || '',
        media_urls: productImage ? [productImage] : [],
      });
    }

    return c.json({ success: true, data: savedPosts });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// ===== 视频生成流水线辅助函数 =====

/** 从 social_settings 获取 Wan 配置 */
async function getWanConfigFromSocialSettings(db: any) {
  const settings = await db.execute('SELECT * FROM social_settings WHERE id = 1');
  const s = settings.rows[0] as any;
  // 优先从 social_settings 的 qwen_api_key，fallback 到 seo_settings
  let apiKey = s?.qwen_api_key || '';
  if (!apiKey) {
    const aiSettings = await getAiSettings(db);
    apiKey = aiSettings.qwen_api_key || '';
  }
  return { apiKey, baseUrl: s?.qwen_base_url || 'https://dashscope.aliyuncs.com', model: 'wan2.7-image-pro' };
}

/** 从 social_settings 获取 VOD 配置 */
async function getVodConfig(db: any) {
  const settings = await db.execute('SELECT * FROM social_settings WHERE id = 1');
  const s = settings.rows[0] as any;
  return {
    accessKeyId: s?.vod_access_key_id || '',
    accessKeySecret: s?.vod_access_key_secret || '',
  };
}

// POST /generate-content-stream - SSE 流式为选定产品生成各平台文案
app.post('/generate-content-stream', authMiddleware, async (c) => {
  const db = getDb(c);
  await ensureTables(db);
  const {
    product_id, product_name, oe_number, category_name,
    platforms, language, target_market,
    product_image, tone,
  } = await c.req.json();

  if (!product_id && !product_name) {
    return c.json({ success: false, message: 'Product required' }, 400);
  }

  const settings = await db.execute('SELECT * FROM social_settings WHERE id = 1');
  const s = settings.rows[0] as any;
  const apiKey = s?.deepseek_api_key;
  if (!apiKey) {
    return c.json({ success: false, message: 'Please configure DeepSeek API Key in settings' }, 400);
  }

  const baseUrl = s?.deepseek_base_url || 'https://api.deepseek.com';
  const model = s?.deepseek_model || 'deepseek-v4-flash';
  const lang = language || s?.default_language || 'en';

  const kwResult = await db.execute(
    'SELECT keyword FROM social_keywords WHERE is_active = 1 ORDER BY search_volume DESC LIMIT 30'
  );
  const keywords = kwResult.rows.map((r: any) => r.keyword).join(', ');

  let productImage = product_image || '';
  let car_model = '';
  let product_description = '';
  if (product_id) {
    const prodResult = await db.execute(
      'SELECT qiniu_url, car_model, remark FROM products WHERE id = ?', [product_id]
    );
    if (prodResult.rows.length > 0) {
      const row = prodResult.rows[0] as any;
      if (!productImage) productImage = row.qiniu_url || '';
      car_model = row.car_model || '';
      product_description = row.remark || '';
    }
  }
  productImage = toPublicUrl(productImage);

  const targetPlatforms = platforms || ['facebook', 'instagram', 'tiktok', 'linkedin', 'youtube', 'x', 'pinterest', 'threads', 'bluesky'];

  // SSE stream helper — uses ReadableStreamDefaultController.enqueue(), NOT .write()
  const encoder = new TextEncoder();
  const sendSSE = (ctrl: ReadableStreamDefaultController, eventType: string, data: any) => {
    const lines = [`event: ${eventType}`, `data: ${JSON.stringify(data)}`, '', ''];
    ctrl.enqueue(encoder.encode(lines.join('\n')));
  };

  const stream = new ReadableStream({
    async start(controller) {
      let totalTokens = 0;
      const allResults: any[] = [];
      try {
        for (let i = 0; i < targetPlatforms.length; i++) {
          const platform = targetPlatforms[i];
          const platformGuide = getPlatformGuide(platform);
          const hasImage = !!productImage;

          const prompt = `You are a professional social media content creator for an auto parts B2B wholesale company.

Generate a ${platformGuide.name} post for the following product:
- Product Name: ${product_name || ''}
- OE Number: ${oe_number || ''}
- Category: ${category_name || 'Auto Parts'}
- Company: RBS AutoParts (https://rbs-autoparts.com)
${hasImage ? `- Product Image: ${productImage} (the product image is available, describe it in the post naturally and highlight the product's visual quality)` : ''}
${tone ? `- Tone: ${tone}` : ''}

Language: ${lang === 'en' ? 'English' : lang === 'es' ? 'Spanish' : lang === 'ar' ? 'Arabic' : lang}
Target Market: ${target_market || 'global'}

Platform-specific requirements:
${platformGuide.requirements}

${keywords ? `Try to naturally incorporate some of these keywords: ${keywords}` : ''}

Important rules:
- Be professional but engaging
- Include a product link: https://rbs-autoparts.com/products/${product_id || ''}
- Highlight quality, compatibility, and wholesale availability
- Keep it concise and impactful
- Do NOT use emoji excessively (max 3-4)
${hasImage ? '- The product image will be included with this post, so your caption should complement the visual content' : ''}
${platform === 'x' ? '- Keep it SHORT and punchy, ideally under 280 characters, MUST include the product link' : ''}

Respond in this exact JSON format (no markdown, no code blocks):
${platform === 'youtube'
  ? `{"caption":"...","title":"video title (50-100 chars)","hashtags":["#tag1","#tag2"],"media_suggestion":"..."}`
  : `{"caption":"...","hashtags":["#tag1","#tag2"],"media_suggestion":"..."}`}`;

          try {
            const response = await fetch(`${baseUrl}/v1/chat/completions`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 800,
              }),
            });

            if (!response.ok) {
              allResults.push({ platform, status: 'error', error: `AI API error: ${response.status}`, caption: '', hashtags: [] });
              const errProgress = Math.round(((i + 1) / targetPlatforms.length) * 100);
              sendSSE(controller, 'progress', {
                stage: true,
                progress: errProgress,
                percent: errProgress,
                step: 1,
                platform,
                message: `${platformGuide.name}: AI API error ${response.status}`,
                error: true,
              });
              continue;
            }

            const aiResult = await response.json() as any;
            const content = aiResult.choices?.[0]?.message?.content || '';
            const usage = aiResult.usage;
            if (usage?.total_tokens) totalTokens += usage.total_tokens;

            let parsed: any = {};
            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            } catch {
              parsed = { caption: content, hashtags: [] };
            }

            let captionText = parsed.caption || '';
            if (typeof captionText === 'string' && captionText.startsWith('{')) {
              try {
                const inner = JSON.parse(captionText);
                if (typeof inner.caption === 'string') captionText = inner.caption;
                else if (typeof inner.text === 'string') captionText = inner.text;
              } catch { /* keep original */ }
            }

            allResults.push({
              platform,
              status: 'generated',
              caption: captionText,
              title: parsed.title || '',
              hashtags: parsed.hashtags || [],
              media_suggestion: parsed.media_suggestion || '',
            });

            const progress = Math.round(((i + 1) / targetPlatforms.length) * 100);
            sendSSE(controller, 'progress', {
              stage: true,
              progress,
              percent: progress,
              step: 1,
              platform,
              message: `Generated ${platformGuide.name} content (${i + 1}/${targetPlatforms.length})`,
              partial: {
                platform,
                caption: captionText,
                title: parsed.title || '',
                hashtags: parsed.hashtags || [],
                media_suggestion: parsed.media_suggestion || '',
              },
            });
          } catch (err: any) {
            allResults.push({ platform, status: 'error', error: err.message, caption: '', hashtags: [] });
            const errProgress = Math.round(((i + 1) / targetPlatforms.length) * 100);
            sendSSE(controller, 'progress', {
              stage: true,
              progress: errProgress,
              percent: errProgress,
              step: 1,
              platform,
              message: `${platformGuide.name}: ${err.message}`,
              error: true,
            });
          }
        }

        // ===== Generate scene image for all platforms =====
        let sceneImageUrl = '';
        const imagePlatforms = ['facebook', 'instagram', 'linkedin', 'x', 'pinterest', 'threads', 'bluesky'];
        const videoPlatforms = ['tiktok', 'youtube'];
        const needsImage = targetPlatforms.some((p: string) => imagePlatforms.includes(p));
        const needsVideo = targetPlatforms.some((p: string) => videoPlatforms.includes(p));

        if (productImage) {
          try {
            const scenePrompt = allResults.find(r => r.media_suggestion)?.media_suggestion
              || 'Professional auto parts product photography, clean white studio background, soft commercial lighting';

            sendSSE(controller, 'progress', {
              stage: true, percent: 100, progress: 100, step: 2,
              message: 'Generating scene image...',
            });

            const wanConfig = await getWanConfigFromSocialSettings(db);
            if (!wanConfig.apiKey) {
              sendSSE(controller, 'progress', {
                stage: true, percent: 100, progress: 100, step: 2,
                message: '⚠️ Wan/DashScope API key not configured. Please set "阿里云 API Key" in SEO settings or social media settings.',
                error: true,
              });
              // Don't throw — continue to text-only post generation
            } else {
              // Compress image if >3.5MB for Wan API limit
              let compressedProductImage = productImage;
              try {
                compressedProductImage = await compressImageForWan(productImage);
              } catch (compressErr: any) {
                sendSSE(controller, 'progress', {
                  stage: true, percent: 100, progress: 100, step: 2,
                  message: `Image compression failed: ${compressErr.message}`,
                  error: true,
                });
                throw compressErr; // re-throw to outer catch
              }

              const wanResult = await callWanImageEdit({
                apiKey: wanConfig.apiKey,
                refImageUrl: compressedProductImage,
                prompt: scenePrompt,
              });
              c.executionCtx?.waitUntil(recordApiUsage(db, 'qwen', 0.20));

              if (wanResult.taskId) {
                const pollResult = await pollWanTask({ apiKey: wanConfig.apiKey, taskId: wanResult.taskId, maxAttempts: 30, intervalMs: 2000 });
                if (pollResult.resultUrl) {
                  const imageKey = `social-media/images/${crypto.randomUUID()}.webp`;
                  await downloadAndUploadToR2(pollResult.resultUrl, imageKey, 'image/webp');
                  sceneImageUrl = `/r2-files/${encodeURIComponent(imageKey)}`;
                }
              }
            }
          } catch (imgErr: any) {
            console.error('SSE scene image generation failed:', imgErr.message);
            sendSSE(controller, 'progress', {
              stage: true, percent: 100, progress: 100, step: 2,
              message: `Scene image failed: ${imgErr.message}. Check Wan/DashScope API key in social settings.`,
              error: true,
            });
          }
        }

        // ===== AI 分镜 + VOD 幻灯片视频 (TikTok/YouTube) =====
        let videoUrl = '';
        let storyboard: any = null;
        if (needsVideo && productImage) {
          try {
            // Step 3: AI 生成分镜脚本
            sendSSE(controller, 'progress', {
              stage: true, percent: 100, progress: 100, step: 3,
              message: 'AI generating video storyboard...',
            });

            const videoPlatform = targetPlatforms.find((p: string) => videoPlatforms.includes(p)) || 'youtube';
            storyboard = await generateStoryboard({
              apiKey,
              baseUrl,
              productName: product_name || '',
              oeNumber: oe_number || '',
              carModel: car_model || '',
              description: product_description || '',
              features: '',
              targetPlatform: videoPlatform,
              lang,
            });

            sendSSE(controller, 'progress', {
              stage: true, percent: 100, progress: 100, step: 3,
              message: `Storyboard: ${storyboard.shots.length} shots created`,
              storyboard,
            });

            // Step 4: 逐镜生成场景图 → 上传 VOD / R2
            const wanConfig = await getWanConfigFromSocialSettings(db);
            const vodConfig = await getVodConfig(db);
            const hasVod = !!(vodConfig.accessKeyId && vodConfig.accessKeySecret);
            const vodClips: Array<{ mediaId: string; duration: number; transition: string; textOverlay: string }> = [];
            const shotImageUrls: string[] = [];

            if (!wanConfig.apiKey) {
              sendSSE(controller, 'progress', {
                stage: true, percent: 100, progress: 100, step: 4,
                message: '⚠️ Wan/DashScope API key missing — skipping shot image generation.',
                error: true,
              });
            } else {

            // Compress reference image before the loop (only if using original product image)
            let shotRefImage = sceneImageUrl || productImage;
            if (!sceneImageUrl) {
              try {
                shotRefImage = await compressImageForWan(productImage);
              } catch (compressErr: any) {
                sendSSE(controller, 'progress', {
                  stage: true, percent: 100, progress: 100, step: 4,
                  message: `Image compression failed: ${compressErr.message}`,
                  error: true,
                });
                throw compressErr;
              }
            }

            for (let si = 0; si < storyboard.shots.length; si++) {
              const shot = storyboard.shots[si];
              sendSSE(controller, 'progress', {
                stage: true,
                percent: Math.round(((si + 1) / storyboard.shots.length) * 100),
                progress: Math.round(((si + 1) / storyboard.shots.length) * 100),
                step: 4,
                message: `Shot ${shot.shot_number}/${storyboard.shots.length}: ${shot.camera_angle}`,
              });

              try {
                const wanResult = await callWanImageEdit({
                  apiKey: wanConfig.apiKey,
                  refImageUrl: shotRefImage,
                  prompt: shot.image_prompt,
                });

                if (wanResult.taskId) {
                  const pollResult = await pollWanTask({ apiKey: wanConfig.apiKey, taskId: wanResult.taskId, maxAttempts: 20, intervalMs: 2000 });
                  if (pollResult.resultUrl) {
                    // 保存到 R2
                    const shotKey = `social-media/storyboard/${crypto.randomUUID()}.png`;
                    await downloadAndUploadToR2(pollResult.resultUrl, shotKey, 'image/png');
                    const shotR2Url = `/r2-files/${encodeURIComponent(shotKey)}`;
                    shotImageUrls.push(shotR2Url);

                    // 上传到 VOD
                    if (hasVod) {
                      try {
                        const imgResp = await fetch(pollResult.resultUrl);
                        if (imgResp.ok) {
                          const imgBuffer = await imgResp.arrayBuffer();
                          const vodResult = await uploadImageToVOD({
                            accessKeyId: vodConfig.accessKeyId,
                            accessKeySecret: vodConfig.accessKeySecret,
                            imageBuffer: imgBuffer,
                            contentType: 'image/png',
                            title: `${product_name} - Shot ${shot.shot_number}`,
                          });
                          if (vodResult.imageId) {
                            vodClips.push({
                              mediaId: vodResult.imageId,
                              duration: shot.duration_seconds,
                              transition: shot.transition,
                              textOverlay: shot.text_overlay,
                            });
                          }
                        }
                      } catch (vodErr: any) {
                        console.error(`VOD upload shot ${si}:`, vodErr.message);
                      }
                    }
                  }
                }
              } catch (shotErr: any) {
                console.error(`Shot ${si} failed:`, shotErr.message);
                sendSSE(controller, 'progress', {
                  stage: true,
                  percent: Math.round(((si + 1) / storyboard.shots.length) * 100),
                  progress: Math.round(((si + 1) / storyboard.shots.length) * 100),
                  step: 4,
                  message: `Shot ${shot.shot_number} failed: ${shotErr.message}`,
                  error: true,
                });
              }
            }

            } // end else (wanConfig.apiKey exists)

            // Step 5: VOD 幻灯片合成（如果 VOD 已配置且至少 2 个镜头）
            if (hasVod && vodClips.length >= 2) {
              sendSSE(controller, 'progress', {
                stage: true, percent: 100, progress: 100, step: 5,
                message: 'Composing slideshow with Ken Burns + transitions...',
              });

              const timeline = buildSlideshowTimeline(vodClips.map(c => ({
                mediaId: c.mediaId,
                duration: c.duration,
                transitionIn: c.transition,
                textOverlay: c.textOverlay,
              })));

              const syncResult = await produceSlideshowVideo({
                accessKeyId: vodConfig.accessKeyId,
                accessKeySecret: vodConfig.accessKeySecret,
                timeline,
                title: storyboard.title || `${product_name} Video`,
              });

              // 获取播放地址并下载到 R2
              const playInfo = await getVodPlayUrl({
                accessKeyId: vodConfig.accessKeyId,
                accessKeySecret: vodConfig.accessKeySecret,
                mediaId: syncResult.mediaId,
              });

              if (playInfo.playURL) {
                const videoKey = `social-media/videos/${crypto.randomUUID()}.mp4`;
                await downloadAndUploadToR2(playInfo.playURL, videoKey, 'video/mp4');
                videoUrl = `/r2-files/${encodeURIComponent(videoKey)}`;
              }

              sendSSE(controller, 'progress', {
                stage: true, percent: 100, progress: 100, step: 5,
                message: 'Video generated successfully!',
              });
            } else if (!hasVod) {
              // Fallback: 无 VOD 配置时，使用 Wan i2v 单图生视频
              if (!wanConfig.apiKey) {
                sendSSE(controller, 'progress', {
                  stage: true, percent: 100, progress: 100, step: 5,
                  message: '⚠️ Wan/DashScope API key missing — cannot generate video. Please configure in settings.',
                  error: true,
                });
              } else {
              sendSSE(controller, 'progress', {
                stage: true, percent: 100, progress: 100, step: 5,
                message: 'VOD not configured, falling back to single-shot video...',
              });

              const videoPrompt = storyboard?.shots?.map((s: any) => s.visual_description).join('. ') || 'Professional product showcase';
              const videoTask = await callWanImageToVideo({
                apiKey: wanConfig.apiKey,
                imageUrl: sceneImageUrl || productImage,
                prompt: videoPrompt,
                duration: Math.min(storyboard?.total_duration || 8, 15),
                resolution: '720P',
              });
              const videoResult = await pollWanVideoTask({
                apiKey: wanConfig.apiKey,
                taskId: videoTask.taskId,
                maxAttempts: 30,
                intervalMs: 10000,
              });
              if (videoResult.videoUrl) {
                const videoKey = `social-media/videos/${crypto.randomUUID()}.mp4`;
                await downloadAndUploadToR2(videoResult.videoUrl, videoKey, 'video/mp4');
                videoUrl = `/r2-files/${encodeURIComponent(videoKey)}`;
              } else {
                sendSSE(controller, 'progress', {
                  stage: true, percent: 100, progress: 100, step: 5,
                  message: 'Wan i2v task completed but no video URL returned',
                  error: true,
                });
              }
            } // end else (wanConfig.apiKey exists for i2v fallback)
            } else {
              sendSSE(controller, 'progress', {
                stage: true, percent: 100, progress: 100, step: 5,
                message: `Only ${vodClips.length} shots uploaded to VOD, need >= 2`,
                error: true,
              });
            }
          } catch (vidErr: any) {
            console.error('SSE video pipeline failed:', vidErr.message);
            sendSSE(controller, 'progress', {
              stage: true, percent: 100, progress: 100, step: 5,
              message: `Video failed: ${vidErr.message}`,
              error: true,
            });
          }
        }

        // ===== Save generated posts to DB with correct media URLs =====
        const savedPosts: any[] = [];
        const effectiveImageUrl = sceneImageUrl || productImage;
        for (const r of allResults) {
          if (r.status !== 'generated') continue;

          const isVideoPlatform = videoPlatforms.includes(r.platform);
          const mediaUrl = isVideoPlatform && videoUrl ? videoUrl : effectiveImageUrl;
          const mediaUrlsJson = mediaUrl ? JSON.stringify([mediaUrl]) : '[]';

          const postResult = await db.execute(
            `INSERT INTO social_posts (product_id, product_name, product_oe, platform, caption, title, hashtags, media_urls, language, target_market, status, auto_generated)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1)`,
            [
              product_id || null,
              product_name || '',
              oe_number || '',
              r.platform,
              r.caption,
              r.title || '',
              JSON.stringify(r.hashtags),
              mediaUrlsJson,
              lang,
              target_market || 'us',
            ]
          );
          savedPosts.push({
            ...r,
            id: Number(postResult.lastInsertRowid),
            title: r.title || '',
            media_urls: mediaUrl ? [mediaUrl] : [],
            media_type: isVideoPlatform ? 'video' : 'image',
          });
        }

        sendSSE(controller, 'done', {
          success: true,
          data: savedPosts,
          generatedImage: sceneImageUrl || null,
          generatedVideo: videoUrl || null,
          storyboard: storyboard || null,
          cost: {
            amount: totalTokens * 0.14 / 1000000,
            currency: 'CNY',
            prompt_tokens: 0,
            completion_tokens: totalTokens,
          },
          usage: {
            cost: (totalTokens * 0.14 / 1000000).toFixed(6),
            currency: 'CNY',
            promptTokens: 0,
            completionTokens: totalTokens,
          },
        });
      } catch (err: any) {
        sendSSE(controller, 'error', {
          message: err.message || 'Stream generation failed',
        });
      } finally {
        try { controller.close(); } catch {}
      }
    },
  });

  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');
  c.header('X-Accel-Buffering', 'no');
  return c.body(stream);
});

// 平台文案指南
function getPlatformGuide(platform: string) {
  const guides: Record<string, { name: string; requirements: string }> = {
    facebook: {
      name: 'Facebook',
      requirements: `- Long-form post (150-300 words) with product features and benefits
- Professional B2B tone highlighting quality and compatibility
- Include 3-5 relevant hashtags at the end
- Call-to-action: "Contact us for wholesale pricing" or "Request a quote"
- Mention OE numbers and vehicle compatibility`,
    },
    instagram: {
      name: 'Instagram',
      requirements: `- Short, punchy caption (100-150 words)
- Visually focused - the image is the star
- 10-15 relevant hashtags (mix of broad and niche)
- Use line breaks for readability
- End with a clear CTA like "DM us for pricing"`,
    },
    tiktok: {
      name: 'TikTok',
      requirements: `- Short video script or hook caption (50-100 words)
- Trendy, casual tone that grabs attention in 2 seconds
- Include trending hashtags relevant to auto parts/car content
- Suggest a visual hook: "Watch this [product feature] in action!"
- Keep it fun but informative`,
    },
    linkedin: {
      name: 'LinkedIn',
      requirements: `- Professional B2B tone (200-400 words)
- Focus on business value: quality assurance, MOQ, supply chain reliability
- Industry insights or market positioning
- Minimal hashtags (3-5 professional ones)
- CTA: "Let's discuss how we can support your auto parts distribution"`,
    },
    pinterest: {
      name: 'Pinterest',
      requirements: `- SEO-optimized description (100-200 words)
- Rich in keywords for searchability
- 5-10 niche hashtags
- Focus on product use case and solution
- Include vehicle applications in the description`,
    },
    youtube: {
      name: 'YouTube',
      requirements: `- Video title (compelling, 50-100 characters, keyword-rich for search)
- Video description (150-300 words) with product details, OE numbers, vehicle compatibility
- Include timestamps if demonstrating multiple features
- 3-5 relevant hashtags
- Call-to-action: "Subscribe for more auto parts reviews" and link to product page
- Mention the video title separately from the description`,
    },
    x: {
      name: 'X (Twitter)',
      requirements: `- Concise and punchy (under 280 characters ideal, but X Premium allows longer)
- Lead with a strong hook or product benefit
- 1-3 hashtags maximum
- Include a clear CTA with a link
- Professional but conversational tone
- Can use threads for longer product reviews`,
    },
    threads: {
      name: 'Threads',
      requirements: `- Conversational and authentic tone (100-200 words)
- Community-oriented, less salesy than other platforms
- 5-8 relevant hashtags
- Engage with questions or prompts: "What do you think about this?"
- Focus on storytelling around the product
- Can start a thread for detailed product features`,
    },
    bluesky: {
      name: 'Bluesky',
      requirements: `- Professional and conversational (100-200 words)
- Focus on quality and technical details
- 3-5 hashtags
- Good for B2B networking and industry discussions
- Include OE numbers and compatibility info
- Link to product page or website`,
    },
  };
  return guides[platform] || guides.facebook;
}

// ==================== 发布任务管理 ====================

// GET /posts - 获取发布任务列表
app.get('/posts', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    await ensureTables(db);
    const { status, platform, page = '1', limit = '20' } = c.req.query();
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let where = '1=1';
    const params: any[] = [];

    if (status && status !== 'all') {
      where += ' AND sp.status = ?';
      params.push(status);
    }
    if (platform && platform !== 'all') {
      where += ' AND sp.platform = ?';
      params.push(platform);
    }

    const countResult = await db.execute(`SELECT COUNT(*) as total FROM social_posts sp WHERE ${where}`, params);
    const total = (countResult.rows[0] as any)?.total || 0;

    const result = await db.execute(
      `SELECT sp.*, sa.platform_username, sa.platform_display_name
       FROM social_posts sp
       LEFT JOIN social_accounts sa ON sp.account_id = sa.id
       WHERE ${where}
       ORDER BY sp.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    return c.json({
      success: true,
      data: {
        items: result.rows,
        pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
      },
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// PUT /posts/:id - 更新发布任务（编辑文案、设置账号、排期）
app.put('/posts/:id', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    const id = c.req.param('id');
    const body = await c.req.json();

    const fields: string[] = [];
    const params: any[] = [];

    const allowedFields = [
      'caption', 'hashtags', 'media_urls', 'language', 'target_market',
      'platform', 'account_id', 'postforme_account_id', 'scheduled_at',
      'status', 'title', 'thumbnail_url', 'privacy_status', 'made_for_kids',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        fields.push(`${field} = ?`);
        if (typeof body[field] === 'object') {
          params.push(JSON.stringify(body[field]));
        } else {
          params.push(String(body[field]));
        }
      }
    }

    if (fields.length === 0) {
      return c.json({ success: false, message: 'No fields to update' }, 400);
    }

    fields.push(`updated_at = datetime('now', 'localtime')`);
    params.push(id);

    await db.execute(`UPDATE social_posts SET ${fields.join(', ')} WHERE id = ?`, params);
    const result = await db.execute('SELECT * FROM social_posts WHERE id = ?', [id]);
    return c.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// POST /posts/batch-update - 批量更新（设置账号、排期等）
app.post('/posts/batch-update', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    const { ids, updates } = await c.req.json();
    if (!ids || !ids.length) {
      return c.json({ success: false, message: 'No IDs provided' }, 400);
    }

    for (const id of ids) {
      const fields: string[] = [];
      const params: any[] = [];
      for (const [key, val] of Object.entries(updates)) {
        fields.push(`${key} = ?`);
        params.push(typeof val === 'object' ? JSON.stringify(val) : String(val));
      }
      fields.push(`updated_at = datetime('now', 'localtime')`);
      params.push(id);
      await db.execute(`UPDATE social_posts SET ${fields.join(', ')} WHERE id = ?`, params);
    }

    return c.json({ success: true, message: `Updated ${ids.length} posts` });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// DELETE /posts/:id
app.delete('/posts/:id', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    const id = c.req.param('id');
    await db.execute('DELETE FROM social_posts WHERE id = ?', [id]);
    return c.json({ success: true, message: 'Deleted' });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// POST /posts/batch-delete
app.post('/posts/batch-delete', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    const { ids } = await c.req.json();
    if (!ids || !ids.length) {
      return c.json({ success: false, message: 'No IDs' }, 400);
    }
    const placeholders = ids.map(() => '?').join(',');
    await db.execute(`DELETE FROM social_posts WHERE id IN (${placeholders})`, ids);
    return c.json({ success: true, message: `Deleted ${ids.length} posts` });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// ==================== 发布到 Post For Me ====================

// POST /publish - 将草稿/已排期的帖子推送到 Post For Me
app.post('/publish', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    await ensureTables(db);
    const { post_ids, publish_now } = await c.req.json();

    if (!post_ids || !post_ids.length) {
      return c.json({ success: false, message: 'No post IDs provided' }, 400);
    }

    const settings = await db.execute('SELECT * FROM social_settings WHERE id = 1');
    const s = settings.rows[0] as any;
    const apiKey = s?.postforme_api_key;
    if (!apiKey) {
      return c.json({ success: false, message: 'Please configure Post For Me API Key' }, 400);
    }

    const results: any[] = [];

    for (const postId of post_ids) {
      const postResult = await db.execute('SELECT * FROM social_posts WHERE id = ?', [postId]);
      if (!postResult.rows.length) {
        results.push({ id: postId, success: false, error: 'Post not found' });
        continue;
      }

      const post = postResult.rows[0] as any;

      // 解析媒体 URL
      const mediaUrls = typeof post.media_urls === 'string'
        ? JSON.parse(post.media_urls || '[]')
        : (post.media_urls || []);

      // YouTube 不支持图片帖子，跳过并记录
      if (post.platform === 'youtube' && mediaUrls.length > 0) {
        const isVideo = mediaUrls.some((u: string) => /\.(mp4|mov|avi|mkv|webm)(\?|$)/i.test(u));
        if (!isVideo) {
          results.push({ id: postId, success: false, skipped: true, error: 'YouTube 不支持发布图片帖子，请提供视频链接' });
          await db.execute(
            `INSERT INTO social_publish_log (post_id, platform, action, status, error_message)
             VALUES (?, ?, 'publish', 'skipped', ?)`,
            [postId, post.platform, 'YouTube 不支持发布图片帖子，请提供视频链接']
          );
          continue;
        }
      }

      let accountIds: string[] = [];

      // 获取 Post For Me 账号 ID
      if (post.postforme_account_id) {
        accountIds = [post.postforme_account_id];
      } else if (post.account_id) {
        const acctResult = await db.execute(
          'SELECT postforme_account_id FROM social_accounts WHERE id = ? AND is_active = 1',
          [post.account_id]
        );
        if (acctResult.rows.length) {
          accountIds = [(acctResult.rows[0] as any).postforme_account_id];
        }
      } else {
        // 自动匹配平台对应的第一个活跃账号
        const acctResult = await db.execute(
          'SELECT postforme_account_id FROM social_accounts WHERE platform = ? AND is_active = 1 LIMIT 1',
          [post.platform]
        );
        if (acctResult.rows.length) {
          accountIds = [(acctResult.rows[0] as any).postforme_account_id];
        }
      }

      if (!accountIds.length) {
        results.push({ id: postId, success: false, error: `No active ${post.platform} account linked` });
        // 记录日志
        await db.execute(
          `INSERT INTO social_publish_log (post_id, platform, action, status, error_message)
           VALUES (?, ?, 'publish', 'failed', ?)`,
          [postId, post.platform, `No active ${post.platform} account linked`]
        );
        continue;
      }

      // 构建 Post For Me 请求
      const hashtags = typeof post.hashtags === 'string'
        ? JSON.parse(post.hashtags)
        : (post.hashtags || []);

      // mediaUrls 已在上方 YouTube 检查时解析，这里仅补充 fallback
      if (!mediaUrls.length && post.product_id) {
        const imgResult = await db.execute('SELECT qiniu_url FROM products WHERE id = ?', [post.product_id]);
        if (imgResult.rows.length) {
          const url = (imgResult.rows[0] as any).qiniu_url || '';
          if (url) mediaUrls.push(url);
        }
      }

      // 安全提取 caption：如果数据库中存储的 caption 是 JSON 字符串，提取其中的文本
      let captionText = post.caption || '';
      if (typeof captionText === 'string' && captionText.startsWith('{')) {
        try {
          const inner = JSON.parse(captionText);
          if (typeof inner.caption === 'string') captionText = inner.caption;
          else if (typeof inner.text === 'string') captionText = inner.text;
        } catch { /* 不是有效 JSON，保留原值 */ }
      }

      const caption = captionText + (hashtags.length ? '\n\n' + hashtags.join(' ') : '');

      const requestBody: any = {
        caption,
        social_accounts: accountIds,
        media: mediaUrls.length ? mediaUrls.map((url: string) => ({ url: toPublicUrl(url) })) : null,
        webhook_url: `${SITE_ORIGIN}/api/social/webhook/postforme`,
      };

      // 排期：如果设置了 scheduled_at 且不是立即发布
      if (post.scheduled_at && !publish_now) {
        requestBody.scheduled_at = post.scheduled_at;
      }

      // YouTube 特有字段
      if (post.platform === 'youtube') {
        if (post.title) requestBody.title = post.title;
        if (post.thumbnail_url) requestBody.thumbnail = [{ url: post.thumbnail_url }];
        if (post.privacy_status) requestBody.privacy_status = post.privacy_status;
        if (post.made_for_kids) requestBody.made_for_kids = true;
      }

      // DEBUG: 记录请求体
      console.log(`[PFM PUBLISH] postId=${postId} body=${JSON.stringify(requestBody).substring(0, 2000)}`);

      try {
        const response = await fetch('https://api.postforme.dev/v1/social-posts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const responseText = await response.text();
        let responseData: any = {};
        try { responseData = JSON.parse(responseText); } catch { responseData = { raw: responseText }; }

        // 详细日志：记录完整请求体和响应体
        const debugLog = JSON.stringify({
          request: { url: 'https://api.postforme.dev/v1/social-posts', method: 'POST', body: requestBody },
          response: responseData,
          http_status: response.status,
        }).substring(0, 4000);

        if (response.ok) {
          const pfmPostId = responseData.id || '';
          const newStatus = requestBody.scheduled_at ? 'scheduled' : 'publishing';
          const pfmStatus = responseData.status || 'processing';
          // 如果 PFM 初始返回就包含错误信息，记录下来
          const pfmError = responseData.error?.message || responseData.failure_reason || '';

          await db.execute(
            `UPDATE social_posts SET
              postforme_post_id = ?, status = ?, postforme_status = ?,
              error_message = COALESCE(?, error_message),
              updated_at = datetime('now', 'localtime')
             WHERE id = ?`,
            [pfmPostId, newStatus, pfmStatus, pfmError || null, postId]
          );

          await db.execute(
            `INSERT INTO social_publish_log (post_id, platform, account_id, action, status, postforme_post_id, response_data, error_message)
             VALUES (?, ?, ?, 'publish', 'success', ?, ?, ?)`,
            [postId, post.platform, post.account_id || null, pfmPostId, JSON.stringify({ request: requestBody, response: responseData }), pfmError]
          );

          results.push({ id: postId, success: true, postforme_post_id: pfmPostId, pfm_status: pfmStatus, pfm_response: responseData });
        } else {
          // PFM 校验错误可能以数组形式返回在 errors 字段
          const pfmErrors = Array.isArray(responseData.errors)
            ? responseData.errors.join('; ')
            : '';
          const errorMsg = pfmErrors || responseData.error?.message || responseData.message || responseText;

          await db.execute(
            `UPDATE social_posts SET status = 'failed', error_message = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
            [errorMsg.substring(0, 500), postId]
          );

          await db.execute(
            `INSERT INTO social_publish_log (post_id, platform, account_id, action, status, error_message, response_data)
             VALUES (?, ?, ?, 'publish', 'failed', ?, ?)`,
            [postId, post.platform, post.account_id || null, errorMsg.substring(0, 500), responseText]
          );

          results.push({ id: postId, success: false, error: errorMsg });
        }
      } catch (err: any) {
        await db.execute(
          `UPDATE social_posts SET status = 'failed', error_message = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
          [err.message.substring(0, 500), postId]
        );
        results.push({ id: postId, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return c.json({
      success: true,
      data: results,
      message: `${successCount}/${results.length} posts published successfully`,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// ==================== Webhook 接收（Post For Me 回调，公开路由无需认证） ====================
// 此 handler 会在 index.ts 中注册为公开路由，不走 withFullAuth

export async function postformeWebhookHandler(c: any) {
  try {
    const db = getDb(c);
    await ensureTables(db);
    const body = await c.req.json();

    // Post For Me webhook 格式
    const { event, data } = body as any;
    if (!event || !data) {
      return c.json({ received: true });
    }

    const pfmPostId = data.id || data.social_post_id || '';
    const status = data.status || '';

    if (pfmPostId) {
      // 判断真正发布状态：processed 不代表已发到社媒平台，必须有 external_id 或 post_url
      const externalId = data.external_id || data.externalId || '';
      const postUrl = data.post_url || data.url || '';
      const errorMsg = data.error?.message || data.error_message || data.failure_reason || '';
      const isTrulyPublished = status === 'published' || (status === 'processed' && !!externalId);
      const newStatus = isTrulyPublished ? 'published' :
                        status === 'failed' ? 'failed' : 'publishing';

      await db.execute(
        `UPDATE social_posts SET
          status = ?, postforme_status = ?,
          published_at = CASE WHEN ? = 'published' THEN datetime('now', 'localtime') ELSE published_at END,
          post_url = COALESCE(?, post_url),
          error_message = CASE WHEN ? != '' THEN ? ELSE error_message END,
          updated_at = datetime('now', 'localtime')
         WHERE postforme_post_id = ?`,
        [newStatus, status, newStatus, postUrl, errorMsg, errorMsg, pfmPostId]
      );

      // 记录日志
      await db.execute(
        `INSERT INTO social_publish_log (post_id, platform, action, status, postforme_post_id, post_url, response_data, error_message)
         SELECT id, platform, 'webhook', ?, ?, ?, ?, ?
         FROM social_posts WHERE postforme_post_id = ? LIMIT 1`,
        [status, pfmPostId, postUrl, JSON.stringify(body).substring(0, 2000), errorMsg, pfmPostId]
      );
    }

    return c.json({ received: true, event });
  } catch (err: any) {
    return c.json({ received: true, error: err.message });
  }
}

// ==================== 状态同步（主动查询 Post For Me） ====================

// POST /sync-status - 主动同步所有 publishing/processing 帖子状态
app.post('/sync-status', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    await ensureTables(db);

    const settings = await db.execute('SELECT * FROM social_settings WHERE id = 1');
    const apiKey = (settings.rows[0] as any)?.postforme_api_key;
    if (!apiKey) {
      return c.json({ success: false, message: 'Please configure Post For Me API Key' }, 400);
    }

    // 获取所有需要同步的帖子（有 postforme_post_id 且状态非 draft/failed）
    const postsResult = await db.execute(
      `SELECT id, postforme_post_id, platform, status FROM social_posts
       WHERE postforme_post_id != '' AND status NOT IN ('draft', 'failed')`
    );

    if (!postsResult.rows.length) {
      return c.json({ success: true, message: 'No posts to sync', data: { synced: 0 } });
    }

    let synced = 0;
    const results: any[] = [];

    for (const post of postsResult.rows) {
      const p = post as any;
      try {
        const resp = await fetch(`https://api.postforme.dev/v1/social-posts/${p.postforme_post_id}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });

        if (!resp.ok) {
          results.push({ id: p.id, platform: p.platform, error: `PFM API ${resp.status}` });
          continue;
        }

        const pfmPost: any = await resp.json();
        const pfmStatus = pfmPost.status || '';
        const externalId = pfmPost.external_id || '';
        const postUrl = pfmPost.post_url || '';
        const pfmError = pfmPost.error?.message || pfmPost.failure_reason || pfmPost.error_message || '';

        // 映射 PFM 状态到本地状态
        // 注意：external_id 为空意味着 Post For Me 还没成功推送到社媒平台
        let newStatus: string;
        let publishedAt: string | null = null;

        if (pfmStatus === 'processed' && externalId) {
          // 真正发布成功（有平台返回的帖子ID）
          newStatus = 'published';
          publishedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
        } else if (pfmStatus === 'processed') {
          // PFM 已接收处理，但还未成功发布到平台（可能权限/内容问题）
          newStatus = 'publishing';
        } else if (pfmStatus === 'failed') {
          newStatus = 'failed';
        } else {
          newStatus = 'publishing';
        }

        await db.execute(
          `UPDATE social_posts SET status = ?, postforme_status = ?,
            post_url = CASE WHEN ? != '' THEN ? ELSE post_url END,
            published_at = CASE WHEN ? IS NOT NULL THEN ? ELSE published_at END,
            error_message = COALESCE(?, error_message),
            updated_at = datetime('now', 'localtime')
           WHERE id = ?`,
          [newStatus, pfmStatus, postUrl, postUrl, publishedAt, publishedAt, pfmError || null, p.id]
        );

        if (pfmStatus !== p.status || pfmError) {
          synced++;
          results.push({ id: p.id, platform: p.platform, old_status: p.status, new_status: newStatus, pfm_status: pfmStatus, external_id: externalId, error: pfmError });
        } else {
          results.push({ id: p.id, platform: p.platform, unchanged: true });
        }
      } catch (err: any) {
        results.push({ id: p.id, platform: p.platform, error: err.message });
      }
    }

    return c.json({
      success: true,
      message: `Synced ${synced}/${postsResult.rows.length} posts`,
      data: { synced, total: postsResult.rows.length, results },
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// ==================== 发布日志 ====================

// GET /logs - 发布日志
app.get('/logs', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    await ensureTables(db);
    const { status, platform, page = '1', limit = '30' } = c.req.query();
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let where = '1=1';
    const params: any[] = [];

    if (status && status !== 'all') {
      where += ' AND l.status = ?';
      params.push(status);
    }
    if (platform && platform !== 'all') {
      where += ' AND l.platform = ?';
      params.push(platform);
    }

    const countResult = await db.execute(`SELECT COUNT(*) as total FROM social_publish_log l WHERE ${where}`, params);
    const total = (countResult.rows[0] as any)?.total || 0;

    const result = await db.execute(
      `SELECT l.*, sp.product_name, sp.platform as post_platform, sp.postforme_status as pfm_status
       FROM social_publish_log l
       LEFT JOIN social_posts sp ON l.post_id = sp.id
       WHERE ${where}
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    // 解析 response_data 提取 PFM 实际状态
    const items = result.rows.map((row: any) => {
      let pfmResponse = null;
      let externalId = '';
      let pfmPostStatus = '';
      try {
        const rd = JSON.parse(row.response_data || '{}');
        pfmResponse = rd.response || rd;
        externalId = pfmResponse.external_id || pfmResponse.externalId || '';
        pfmPostStatus = pfmResponse.status || row.pfm_status || '';
      } catch { /* ignore */ }
      return {
        ...row,
        pfm_post_status: pfmPostStatus,
        pfm_external_id: externalId,
        pfm_truly_published: !!(externalId),
      };
    });

    return c.json({
      success: true,
      data: {
        items,
        pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
      },
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});
// GET /test-pfm
app.get('/test-pfm', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    await ensureTables(db);
    const settings = await db.execute('SELECT * FROM social_settings WHERE id = 1');
    const apiKey = (settings.rows[0] as any)?.postforme_api_key;
    if (!apiKey) return c.json({ success: false, message: '请先配置 Post For Me API Key' }, 400);

    // 1. 测试账号列表
    const acctsRes = await fetch('https://api.postforme.dev/v1/social-accounts', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const acctsData = await acctsRes.json();

    // 2. 取数据库中的账号做对比
    const dbAccts = await db.execute('SELECT id, postforme_account_id, platform, platform_username, is_active FROM social_accounts');

    return c.json({
      success: true,
      data: {
        pfm_api_reachable: acctsRes.ok,
        pfm_http_status: acctsRes.status,
        pfm_accounts: acctsData,
        db_accounts: dbAccts.rows,
      }
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// ==================== 文案模板管理 ====================

// GET /templates
app.get('/templates', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    await ensureTables(db);
    const { platform, language } = c.req.query();
    let where = '1=1';
    const params: any[] = [];
    if (platform) { where += ' AND platform = ?'; params.push(platform); }
    if (language) { where += ' AND language = ?'; params.push(language); }

    const result = await db.execute(
      `SELECT * FROM social_templates WHERE ${where} ORDER BY platform, is_default DESC, created_at DESC`,
      params
    );
    return c.json({ success: true, data: result.rows });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// POST /templates
app.post('/templates', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    await ensureTables(db);
    const { platform, language, template_name, caption_template, hashtag_template, tone, is_default } = await c.req.json();

    const result = await db.execute(
      `INSERT INTO social_templates (platform, language, template_name, caption_template, hashtag_template, tone, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [platform, language || 'en', template_name || '', caption_template || '', hashtag_template || '', tone || 'professional', is_default ? 1 : 0]
    );

    return c.json({ success: true, id: Number(result.lastInsertRowid), message: 'Template created' });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// PUT /templates/:id
app.put('/templates/:id', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    const id = c.req.param('id');
    const body = await c.req.json();

    const fields: string[] = [];
    const params: any[] = [];
    for (const key of ['template_name', 'caption_template', 'hashtag_template', 'tone', 'is_default', 'language', 'platform']) {
      if (body[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(key === 'is_default' ? (body[key] ? 1 : 0) : String(body[key]));
      }
    }
    fields.push(`updated_at = datetime('now', 'localtime')`);
    params.push(id);

    await db.execute(`UPDATE social_templates SET ${fields.join(', ')} WHERE id = ?`, params);
    return c.json({ success: true, message: 'Template updated' });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// DELETE /templates/:id
app.delete('/templates/:id', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    await db.execute('DELETE FROM social_templates WHERE id = ?', [c.req.param('id')]);
    return c.json({ success: true, message: 'Deleted' });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// ==================== 关键词库管理 ====================

// GET /keywords
app.get('/keywords', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    await ensureTables(db);
    const { category, platform } = c.req.query();
    let where = 'is_active = 1';
    const params: any[] = [];
    if (category) { where += ' AND category = ?'; params.push(category); }
    if (platform) { where += ' AND (platform = ? OR platform = "")'; params.push(platform); }

    const result = await db.execute(
      `SELECT * FROM social_keywords WHERE ${where} ORDER BY category, search_volume DESC`,
      params
    );
    return c.json({ success: true, data: result.rows });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// POST /keywords
app.post('/keywords', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    await ensureTables(db);
    const { keywords, category } = await c.req.json();

    if (!keywords || !keywords.length) {
      return c.json({ success: false, message: 'No keywords provided' }, 400);
    }

    let added = 0;
    for (const kw of keywords) {
      const keyword = typeof kw === 'string' ? kw : kw.keyword;
      if (!keyword) continue;
      try {
        await db.execute(
          `INSERT INTO social_keywords (keyword, category, language) VALUES (?, ?, 'en')
           ON CONFLICT(keyword) DO NOTHING`,
          [keyword, category || 'general']
        );
        added++;
      } catch {}
    }

    return c.json({ success: true, added, message: `Added ${added} keywords` });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// DELETE /keywords/:id
app.delete('/keywords/:id', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    await db.execute('DELETE FROM social_keywords WHERE id = ?', [c.req.param('id')]);
    return c.json({ success: true, message: 'Deleted' });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// ==================== 统计数据 ====================

// GET /stats
app.get('/stats', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    await ensureTables(db);

    const totalPosts = await db.execute('SELECT COUNT(*) as cnt FROM social_posts');
    const draftPosts = await db.execute("SELECT COUNT(*) as cnt FROM social_posts WHERE status = 'draft'");
    const scheduledPosts = await db.execute("SELECT COUNT(*) as cnt FROM social_posts WHERE status = 'scheduled'");
    const publishingPosts = await db.execute("SELECT COUNT(*) as cnt FROM social_posts WHERE status IN ('publishing', 'processing')");
    const publishedPosts = await db.execute("SELECT COUNT(*) as cnt FROM social_posts WHERE status = 'published'");
    const failedPosts = await db.execute("SELECT COUNT(*) as cnt FROM social_posts WHERE status = 'failed'");
    const activeAccounts = await db.execute('SELECT COUNT(*) as cnt FROM social_accounts WHERE is_active = 1');
    const todayPosts = await db.execute(
      "SELECT COUNT(*) as cnt FROM social_posts WHERE date(created_at) = date('now', 'localtime')"
    );

    // 按平台统计
    const byPlatform = await db.execute(
      `SELECT platform, COUNT(*) as cnt, SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published
       FROM social_posts GROUP BY platform ORDER BY cnt DESC`
    );

    // 最近7天发布趋势
    const weeklyTrend = await db.execute(
      `SELECT date(created_at) as date, COUNT(*) as cnt, SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published
       FROM social_posts
       WHERE created_at >= datetime('now', 'localtime', '-7 days')
       GROUP BY date(created_at) ORDER BY date(created_at)`
    );

    return c.json({
      success: true,
      data: {
        total: (totalPosts.rows[0] as any)?.cnt || 0,
        draft: (draftPosts.rows[0] as any)?.cnt || 0,
        scheduled: (scheduledPosts.rows[0] as any)?.cnt || 0,
        publishing: (publishingPosts.rows[0] as any)?.cnt || 0,
        published: (publishedPosts.rows[0] as any)?.cnt || 0,
        failed: (failedPosts.rows[0] as any)?.cnt || 0,
        accounts: (activeAccounts.rows[0] as any)?.cnt || 0,
        today: (todayPosts.rows[0] as any)?.cnt || 0,
        byPlatform: byPlatform.rows,
        weeklyTrend: weeklyTrend.rows,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// ==================== 智能排期计算 ====================

// POST /schedule-suggest - 根据目标市场计算最佳发布时间
app.post('/schedule-suggest', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    await ensureTables(db);
    const { target_market, platform, count } = await c.req.json();

    const market = target_market || 'us';
    const postCount = count || 3;
    const plat = platform || 'facebook';

    // 各市场时区偏移（相对 UTC）
    const timezones: Record<string, { offset: number; peakHours: number[] }> = {
      us: { offset: -5, peakHours: [9, 10, 11, 12, 13, 14, 17, 18, 19] },  // EST
      eu: { offset: 1, peakHours: [9, 10, 11, 12, 13, 17, 18, 19] },         // CET
      me: { offset: 3, peakHours: [10, 11, 12, 13, 17, 18, 20, 21] },        // GST
      sa: { offset: -3, peakHours: [9, 10, 11, 12, 17, 18, 19, 20] },        // BRT
      af: { offset: 2, peakHours: [8, 9, 10, 11, 12, 17, 18, 19] },          // SAST
      sea: { offset: 8, peakHours: [9, 10, 11, 12, 13, 19, 20, 21] },        // SGT
    };

    const tz = timezones[market] || timezones.us;
    const suggestions: string[] = [];

    // 从明天开始，每天一个时间段
    for (let d = 1; d <= postCount; d++) {
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + d);

      // 随机选一个高峰时段
      const peakHour = tz.peakHours[Math.floor(Math.random() * tz.peakHours.length)];
      const minute = Math.floor(Math.random() * 60); // 随机分钟

      // 转换为 UTC
      const utcHour = peakHour - tz.offset;
      baseDate.setUTCHours(utcHour, minute, 0, 0);

      suggestions.push(baseDate.toISOString());
    }

    return c.json({ success: true, data: suggestions });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// ==================== AI 一键生成帖子 ====================

// POST /generate-post - 全自动 AI 生成帖子（文案 + 电商图 + 视频）
app.post('/generate-post', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    await ensureTables(db);
    setupR2(c);

    const { product_id, platforms, language, target_market } = await c.req.json();

    if (!product_id) {
      return c.json({ success: false, message: 'product_id is required' }, 400);
    }

    // Step 1: Get product info
    const prodResult = await db.execute(
      'SELECT id, name, oe_number, category_id, qiniu_url FROM products WHERE id = ?',
      [product_id]
    );
    if (!prodResult.rows.length) {
      return c.json({ success: false, message: 'Product not found' }, 404);
    }
    const product = prodResult.rows[0] as any;
    const productName = product.name;
    const oeNumber = product.oe_number || '';
    const productImageUrl = toPublicUrl(product.qiniu_url || '');

    // Get category name
    let categoryName = 'Auto Parts';
    if (product.category_id) {
      const catResult = await db.execute(
        'SELECT name_en FROM categories WHERE id = ?', [product.category_id]
      );
      if (catResult.rows.length > 0) {
        categoryName = (catResult.rows[0] as any).name_en || 'Auto Parts';
      }
    }

    // Get settings
    const settings = await db.execute('SELECT * FROM social_settings WHERE id = 1');
    const s = settings.rows[0] as any;
    const deepseekKey = s?.deepseek_api_key;
    if (!deepseekKey) {
      return c.json({ success: false, message: 'DeepSeek API Key not configured' }, 400);
    }
    const deepseekBase = s?.deepseek_base_url || 'https://api.deepseek.com';
    const deepseekModel = s?.deepseek_model || 'deepseek-v4-flash';
    const lang = language || s?.default_language || 'en';

    const targetPlatforms = platforms || ['facebook', 'instagram', 'tiktok', 'linkedin', 'youtube', 'x', 'pinterest', 'threads', 'bluesky'];
    const imagePlatforms = ['facebook', 'instagram', 'linkedin', 'x', 'pinterest', 'threads', 'bluesky'];
    const videoPlatforms = ['tiktok', 'youtube'];

    // ===== Step 2: DeepSeek generates multi-platform copy + scene prompt =====
    const platformGuideText = targetPlatforms.map((p: string) => {
      const g = getPlatformGuide(p);
      return `${g.name}: ${g.requirements}`;
    }).join('\n\n');

    const deepseekPrompt = `You are a professional social media content creator for RBS AutoParts, a B2B auto parts wholesale company.

Product:
- Name: ${productName}
- OE Number: ${oeNumber}
- Category: ${categoryName}
- Product URL: https://rbs-autoparts.com/products/${product_id}
- Product Image: ${productImageUrl || 'Not available'}

Language: ${lang === 'en' ? 'English' : lang === 'es' ? 'Spanish' : lang === 'ar' ? 'Arabic' : lang}
Target Market: ${target_market || 'global'}

Generate content for these platforms:
${platformGuideText}

Additionally, generate:
- "scenePrompt": A 1-2 sentence description of the ideal e-commerce scene/background for a product photo (e.g., "on a clean white garage floor" or "installed on a car engine"). Used for AI image editing. Keep under 80 words.
${videoPlatforms.some(p => targetPlatforms.includes(p)) ? '- "videoPrompt": A 1-2 sentence video motion description for short video platforms. Describe the camera movement and product action (e.g., "slow rotation showing the product from all angles, sparkle effect on metallic parts"). Keep under 60 words.' : ''}

Respond in JSON:
{
  "platforms": {
    "facebook": { "caption": "...", "hashtags": [...], "title": "" },
    "instagram": { "caption": "...", "hashtags": [...], "title": "" },
    ...
  },
  "scenePrompt": "scene description for AI image editing",
  ${videoPlatforms.some(p => targetPlatforms.includes(p)) ? '"videoPrompt": "video motion description",' : ''}
}`;

    const aiResponse = await fetch(`${deepseekBase}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: deepseekModel,
        messages: [{ role: 'user', content: deepseekPrompt }],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      return c.json({ success: false, message: `DeepSeek API error: ${aiResponse.status}` }, 500);
    }

    const aiResult: any = await aiResponse.json();
    const aiContent = aiResult.choices?.[0]?.message?.content || '';
    let parsed: any = {};
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      parsed = { platforms: {}, scenePrompt: '' };
    }

    const platformContent = parsed.platforms || {};
    const scenePrompt = parsed.scenePrompt || '';
    const videoPrompt = parsed.videoPrompt || `Product showcase: ${productName} rotating on display with soft lighting`;

    // ===== Step 3: Generate e-commerce scene photo (for image platforms) =====
    let sceneImageUrl = '';
    let sceneImageR2Key = '';
    const imagePlatformsToUse = targetPlatforms.filter((p: string) => imagePlatforms.includes(p));

    if (imagePlatformsToUse.length > 0 && productImageUrl && scenePrompt) {
      try {
        const wanConfig = await getWanConfigFromSocialSettings(db);
        // Compress image if >3.5MB for Wan API limit
        let compressedProductImage = productImageUrl;
        try {
          compressedProductImage = await compressImageForWan(productImageUrl);
        } catch (compressErr: any) {
          console.error('Image compression failed:', compressErr.message);
          throw compressErr; // Let outer catch handle it
        }
        const wanResult = await callWanImageEdit({
          apiKey: wanConfig.apiKey,
          refImageUrl: compressedProductImage,
          prompt: scenePrompt,
        });
        c.executionCtx?.waitUntil(recordApiUsage(db, 'qwen', 0.20));

        if (wanResult.taskId) {
          // Poll for result
          const pollResult = await pollWanTask({ apiKey: wanConfig.apiKey, taskId: wanResult.taskId, maxAttempts: 30, intervalMs: 2000 });
          if (pollResult.resultUrl) {
            const imageKey = `social-media/images/${crypto.randomUUID()}.webp`;
            await downloadAndUploadToR2(pollResult.resultUrl, imageKey, 'image/webp');
            sceneImageUrl = `/r2-files/${encodeURIComponent(imageKey)}`;
            sceneImageR2Key = imageKey;
          }
        }
      } catch (imgErr: any) {
        console.error('Wan image generation failed:', imgErr.message);
        // Continue without scene image, use original
      }
    }

    // ===== Step 4: Generate video (for TikTok/YouTube) =====
    let videoUrl = '';
    let videoR2Key = '';
    const videoPlatformsToUse = targetPlatforms.filter((p: string) => videoPlatforms.includes(p));

    if (videoPlatformsToUse.length > 0 && sceneImageUrl) {
      try {
        const wanConfig = await getWanConfigFromSocialSettings(db);
        const videoTask = await callWanImageToVideo({ apiKey: wanConfig.apiKey, imageUrl: sceneImageUrl, prompt: videoPrompt, duration: 5 });
        const videoResult = await pollWanVideoTask({ apiKey: wanConfig.apiKey, taskId: videoTask.taskId, maxAttempts: 40, intervalMs: 10000 });

        if (videoResult.videoUrl) {
          const videoKey = `social-media/videos/${crypto.randomUUID()}.mp4`;
          await downloadAndUploadToR2(videoResult.videoUrl, videoKey, 'video/mp4');
          videoUrl = `/r2-files/${encodeURIComponent(videoKey)}`;
          videoR2Key = videoKey;
        }
      } catch (vidErr: any) {
        console.error('Wan video generation failed:', vidErr.message);
        // Continue without video
      }
    }

    // ===== Step 5: Save posts to DB =====
    const savedPosts: any[] = [];
    for (const platform of targetPlatforms) {
      const content = platformContent[platform] || {};
      const isVideoPlatform = videoPlatforms.includes(platform);
      const mediaUrl = isVideoPlatform && videoUrl ? videoUrl : (sceneImageUrl || productImageUrl);
      const mediaUrls = mediaUrl ? JSON.stringify([mediaUrl]) : '[]';

      // Safe caption extraction
      let captionText = content.caption || '';
      if (typeof captionText === 'string' && captionText.startsWith('{')) {
        try {
          const inner = JSON.parse(captionText);
          captionText = inner.caption || inner.text || captionText;
        } catch { /* keep original */ }
      }
      // If caption is an object, stringify it safely
      if (typeof captionText === 'object') {
        captionText = captionText?.caption || captionText?.text || JSON.stringify(captionText).slice(0, 200);
      }

      const postResult = await db.execute(
        `INSERT INTO social_posts (product_id, product_name, product_oe, platform, caption, title, hashtags, media_urls, language, target_market, status, auto_generated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1)`,
        [
          product_id,
          productName,
          oeNumber,
          platform,
          String(captionText).slice(0, 5000),
          isVideoPlatform ? (content.title || `${productName} | RBS AutoParts`) : '',
          JSON.stringify(content.hashtags || []),
          mediaUrls,
          lang,
          target_market || 'us',
        ]
      );

      savedPosts.push({
        id: Number(postResult.lastInsertRowid),
        platform,
        product_id,
        product_name: productName,
        caption: String(captionText).slice(0, 5000),
        title: isVideoPlatform ? (content.title || `${productName} | RBS AutoParts`) : '',
        hashtags: content.hashtags || [],
        media_urls: mediaUrl ? [mediaUrl] : [],
        status: 'draft',
      });
    }

    return c.json({
      success: true,
      data: {
        posts: savedPosts,
        generatedImage: sceneImageUrl || null,
        generatedVideo: videoUrl || null,
        scenePrompt,
        videoPrompt,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// POST /generate-batch - 批量 AI 生成帖子
app.post('/generate-batch', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    await ensureTables(db);
    setupR2(c);

    const { product_ids, platforms, language, target_market } = await c.req.json();

    if (!product_ids || !product_ids.length) {
      return c.json({ success: false, message: 'product_ids array is required' }, 400);
    }
    if (product_ids.length > 5) {
      return c.json({ success: false, message: 'Maximum 5 products per batch' }, 400);
    }

    // Process sequentially to avoid rate limits and CF Worker subrequest limits
    const results: any[] = [];
    for (const pid of product_ids) {
      try {
        // Fetch the generate-post endpoint internally
        const body = JSON.stringify({
          product_id: pid,
          platforms: platforms || ['facebook', 'instagram', 'linkedin'],
          language: language || 'en',
          target_market: target_market || 'us',
        });

        // Use the same CF worker origin
        const origin = c.req.header('host') || 'rbs-autoparts.com';
        const protocol = origin.includes('localhost') ? 'http' : 'https';
        const internalUrl = `${protocol}://${origin}/api/social/generate-post`;

        // Get auth token from current request
        const authHeader = c.req.header('Authorization') || '';
        const resp = await fetch(internalUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body,
        });

        const data: any = await resp.json();
        results.push({
          product_id: pid,
          success: data.success,
          posts: data.data?.posts || [],
          error: data.success ? null : data.message,
        });
      } catch (err: any) {
        results.push({
          product_id: pid,
          success: false,
          posts: [],
          error: err.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalPosts = results.reduce((sum, r) => sum + (r.posts?.length || 0), 0);

    return c.json({
      success: successCount > 0,
      data: {
        results,
        summary: {
          total_products: product_ids.length,
          success_products: successCount,
          failed_products: product_ids.length - successCount,
          total_posts: totalPosts,
        },
      },
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

export default app;
