const express = require('express');
const https = require('https');
const router = express.Router();
const db = require('../db');

// ==================== 全局 SEO 配置 ====================

// GET /api/seo-geo/settings
router.get('/settings', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM seo_settings WHERE id = 1');
    res.json({ success: true, data: result.rows[0] || {} });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/seo-geo/settings
router.put('/settings', async (req, res) => {
  try {
    const { deepseek_api_key, deepseek_base_url, deepseek_model, default_language } = req.body;
    await db.execute(
      `UPDATE seo_settings SET
        deepseek_api_key = COALESCE(?, deepseek_api_key),
        deepseek_base_url = COALESCE(?, deepseek_base_url),
        deepseek_model = COALESCE(?, deepseek_model),
        default_language = COALESCE(?, default_language),
        updated_at = datetime('now', 'localtime')
      WHERE id = 1`,
      [deepseek_api_key, deepseek_base_url, deepseek_model, default_language]
    );
    const result = await db.execute('SELECT * FROM seo_settings WHERE id = 1');
    res.json({ success: true, data: result.rows[0], message: 'Settings saved' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== 目标市场 CRUD ====================

// GET /api/seo-geo/markets
router.get('/markets', async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM seo_target_markets';
    const params = [];
    if (status && status !== 'all') {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';
    const result = await db.execute(sql, params);
    // 附带每个市场的关键词数和任务统计
    const markets = await Promise.all(result.rows.map(async (m) => {
      const kwResult = await db.execute('SELECT COUNT(*) as cnt FROM seo_keywords WHERE market_id = ?', [m.id]);
      const taskResult = await db.execute(
        'SELECT COUNT(*) as total, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as done FROM seo_tasks WHERE market_id = ?',
        ['completed', m.id]
      );
      return {
        ...m,
        keyword_count: kwResult.rows[0]?.cnt || 0,
        task_total: taskResult.rows[0]?.total || 0,
        task_done: taskResult.rows[0]?.done || 0,
      };
    }));
    res.json({ success: true, data: markets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/seo-geo/markets/:id
router.get('/markets/:id', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM seo_target_markets WHERE id = ?', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Market not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/seo-geo/markets
router.post('/markets', async (req, res) => {
  try {
    const { country_code, country_name, language, status, start_date, end_date, budget_monthly, currency, notes } = req.body;
    if (!country_code || !country_name) {
      return res.status(400).json({ success: false, message: 'country_code and country_name are required' });
    }
    const result = await db.execute(
      `INSERT INTO seo_target_markets (country_code, country_name, language, status, start_date, end_date, budget_monthly, currency, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [country_code, country_name, language || 'en', status || 'active', start_date || '', end_date || '', budget_monthly || 0, currency || 'USD', notes || '']
    );
    const inserted = await db.execute('SELECT * FROM seo_target_markets WHERE id = ?', [result.lastInsertRowid]);
    res.json({ success: true, data: inserted.rows[0], message: 'Market created' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/seo-geo/markets/:id
router.put('/markets/:id', async (req, res) => {
  try {
    const fields = [];
    const values = [];
    const allowed = ['country_code', 'country_name', 'language', 'status', 'start_date', 'end_date', 'budget_monthly', 'currency', 'notes'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    }
    if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });
    fields.push(`updated_at = datetime('now', 'localtime')`);
    values.push(req.params.id);
    await db.execute(`UPDATE seo_target_markets SET ${fields.join(', ')} WHERE id = ?`, values);
    const updated = await db.execute('SELECT * FROM seo_target_markets WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated.rows[0], message: 'Market updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/seo-geo/markets/:id
router.delete('/markets/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM seo_keywords WHERE market_id = ?', [req.params.id]);
    await db.execute('DELETE FROM seo_tasks WHERE market_id = ?', [req.params.id]);
    await db.execute('DELETE FROM seo_content_log WHERE market_id = ?', [req.params.id]);
    await db.execute('DELETE FROM seo_target_markets WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Market deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== 关键词管理 ====================

// GET /api/seo-geo/keywords
router.get('/keywords', async (req, res) => {
  try {
    const { market_id } = req.query;
    if (!market_id) return res.status(400).json({ success: false, message: 'market_id is required' });
    const result = await db.execute(
      'SELECT * FROM seo_keywords WHERE market_id = ? ORDER BY priority DESC, created_at DESC',
      [market_id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/seo-geo/keywords
router.post('/keywords', async (req, res) => {
  try {
    const { market_id, keyword, search_intent, priority, current_rank, target_rank, notes } = req.body;
    if (!market_id || !keyword) {
      return res.status(400).json({ success: false, message: 'market_id and keyword are required' });
    }
    const result = await db.execute(
      `INSERT INTO seo_keywords (market_id, keyword, search_intent, priority, current_rank, target_rank, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [market_id, keyword, search_intent || 'informational', priority || 'medium', current_rank || '', target_rank || 'top10', notes || '']
    );
    const inserted = await db.execute('SELECT * FROM seo_keywords WHERE id = ?', [result.lastInsertRowid]);
    res.json({ success: true, data: inserted.rows[0], message: 'Keyword added' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/seo-geo/keywords/batch
router.post('/keywords/batch', async (req, res) => {
  try {
    const { market_id, keywords } = req.body;
    if (!market_id || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ success: false, message: 'market_id and keywords array are required' });
    }
    let count = 0;
    for (const kw of keywords) {
      const keyword = typeof kw === 'string' ? kw : kw.keyword;
      if (!keyword) continue;
      await db.execute(
        `INSERT INTO seo_keywords (market_id, keyword, search_intent, priority) VALUES (?, ?, 'informational', 'medium')`,
        [market_id, keyword.trim()]
      );
      count++;
    }
    res.json({ success: true, data: { count }, message: `${count} keywords added` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/seo-geo/keywords/:id
router.put('/keywords/:id', async (req, res) => {
  try {
    const fields = [];
    const values = [];
    const allowed = ['keyword', 'search_intent', 'priority', 'current_rank', 'target_rank', 'notes'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    }
    if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });
    values.push(req.params.id);
    await db.execute(`UPDATE seo_keywords SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ success: true, message: 'Keyword updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/seo-geo/keywords/:id
router.delete('/keywords/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM seo_keywords WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Keyword deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/seo-geo/keywords/batch-delete
router.post('/keywords/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids array is required' });
    }
    const placeholders = ids.map(() => '?').join(',');
    await db.execute(`DELETE FROM seo_keywords WHERE id IN (${placeholders})`, ids);
    res.json({ success: true, message: `${ids.length} keywords deleted` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== 任务管理 ====================

// GET /api/seo-geo/tasks
router.get('/tasks', async (req, res) => {
  try {
    const { market_id, status } = req.query;
    let sql = 'SELECT * FROM seo_tasks WHERE 1=1';
    const params = [];
    if (market_id) { sql += ' AND market_id = ?'; params.push(market_id); }
    if (status && status !== 'all') { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY CASE priority WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 WHEN \'low\' THEN 3 END, created_at DESC';
    const result = await db.execute(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/seo-geo/tasks
router.post('/tasks', async (req, res) => {
  try {
    const { market_id, title, description, task_type, status, priority, due_date } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'title is required' });
    const result = await db.execute(
      `INSERT INTO seo_tasks (market_id, title, description, task_type, status, priority, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [market_id || null, title, description || '', task_type || 'optimization', status || 'pending', priority || 'medium', due_date || '']
    );
    const inserted = await db.execute('SELECT * FROM seo_tasks WHERE id = ?', [result.lastInsertRowid]);
    res.json({ success: true, data: inserted.rows[0], message: 'Task created' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/seo-geo/tasks/:id
router.put('/tasks/:id', async (req, res) => {
  try {
    const fields = [];
    const values = [];
    const allowed = ['market_id', 'title', 'description', 'task_type', 'status', 'priority', 'due_date'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    }
    // 自动设置完成时间
    if (req.body.status === 'completed') {
      fields.push(`completed_at = datetime('now', 'localtime')`);
    } else if (req.body.status && req.body.status !== 'completed') {
      fields.push('completed_at = NULL');
    }
    if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });
    fields.push(`updated_at = datetime('now', 'localtime')`);
    values.push(req.params.id);
    await db.execute(`UPDATE seo_tasks SET ${fields.join(', ')} WHERE id = ?`, values);
    const updated = await db.execute('SELECT * FROM seo_tasks WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated.rows[0], message: 'Task updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/seo-geo/tasks/:id
router.delete('/tasks/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM seo_tasks WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== AI 内容生成（DeepSeek） ====================

// POST /api/seo-geo/ai/generate
router.post('/ai/generate', async (req, res) => {
  try {
    const { market_id, content_type, context, language, target_url } = req.body;

    // 获取 DeepSeek 配置
    const settingsResult = await db.execute('SELECT * FROM seo_settings WHERE id = 1');
    const settings = settingsResult.rows[0];
    if (!settings?.deepseek_api_key) {
      return res.status(400).json({ success: false, message: 'DeepSeek API Key not configured. Please set it in Settings tab.' });
    }

    const apiKey = settings.deepseek_api_key;
    const baseUrl = (settings.deepseek_base_url || 'https://api.deepseek.com').replace(/\/$/, '');
    const model = settings.deepseek_model || 'deepseek-chat';
    const lang = language || 'en';

    // 根据内容类型构建 prompt
    let systemPrompt = '';
    let userPrompt = '';

    const langMap = { zh: 'Chinese (Simplified)', en: 'English', es: 'Spanish' };
    const langName = langMap[lang] || 'English';

    switch (content_type) {
      case 'meta_title':
        systemPrompt = `You are an expert SEO copywriter. Generate optimized SEO meta titles in ${langName} for an auto parts website. Return ONLY the titles, one per line, no numbering, no explanation. Each title should be 50-60 characters, include the main keyword naturally, and be compelling for click-through rate.`;
        userPrompt = `Generate 5 SEO meta title options for:\n${context || 'Auto parts product page'}`;
        break;
      case 'meta_description':
        systemPrompt = `You are an expert SEO copywriter. Generate optimized SEO meta descriptions in ${langName} for an auto parts website. Return ONLY the descriptions, one per line separated by ---, no numbering, no explanation. Each description should be 120-160 characters, include a call to action, and naturally incorporate keywords.`;
        userPrompt = `Generate 3 SEO meta description options for:\n${context || 'Auto parts product page'}`;
        break;
      case 'product_description':
        systemPrompt = `You are an expert automotive parts content writer. Write a product description in ${langName} for an auto parts e-commerce website. The description should be SEO-friendly, include relevant keywords naturally, highlight product benefits, and include a compelling call to action. Use proper HTML formatting (h2, h3, p, ul, li tags).`;
        userPrompt = `Write a detailed product description for:\n${context || 'Auto parts product'}`;
        break;
      case 'blog_article':
        systemPrompt = `You are an expert automotive content writer and SEO specialist. Write a blog article in ${langName} for an auto parts company blog. The article should be SEO-optimized, informative, engaging, and include relevant keywords naturally. Use proper HTML formatting (h1, h2, h3, p, ul, li, blockquote tags). Include an attractive title.`;
        userPrompt = `Write a comprehensive blog article about:\n${context || 'Automotive parts industry topic'}`;
        break;
      case 'category_description':
        systemPrompt = `You are an expert SEO content writer for auto parts e-commerce. Write a category description in ${langName} that helps with SEO ranking. The description should introduce the category, highlight key products, and encourage browsing. Use proper HTML formatting (h2, p, ul, li tags).`;
        userPrompt = `Write an SEO category description for:\n${context || 'Auto parts category'}`;
        break;
      default:
        systemPrompt = `You are an expert SEO content writer. Write content in ${langName} as requested.`;
        userPrompt = context || 'Write SEO content for auto parts website';
    }

    // 调用 DeepSeek API
    const apiResponse = await callDeepSeekAPI(baseUrl, apiKey, model, systemPrompt, userPrompt);

    // 保存生成日志
    await db.execute(
      `INSERT INTO seo_content_log (market_id, content_type, target_url, title, content, language, model, prompt_summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        market_id || null,
        content_type,
        target_url || '',
        extractTitle(apiResponse, content_type),
        apiResponse,
        lang,
        model,
        (context || '').substring(0, 200),
      ]
    );

    res.json({
      success: true,
      data: {
        content: apiResponse,
        model,
        language: lang,
        content_type,
      },
      message: 'Content generated successfully',
    });
  } catch (err) {
    console.error('AI generation error:', err.message);
    res.status(500).json({ success: false, message: `AI generation failed: ${err.message}` });
  }
});

// GET /api/seo-geo/content-log
router.get('/content-log', async (req, res) => {
  try {
    const { market_id, limit } = req.query;
    let sql = 'SELECT * FROM seo_content_log WHERE 1=1';
    const params = [];
    if (market_id) { sql += ' AND market_id = ?'; params.push(market_id); }
    sql += ' ORDER BY created_at DESC';
    if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); } else { sql += ' LIMIT 50'; }
    const result = await db.execute(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/seo-geo/content-log/:id
router.delete('/content-log/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM seo_content_log WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Log deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== DeepSeek API 调用 ====================

function callDeepSeekAPI(baseUrl, apiKey, model, systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const url = new URL(`${baseUrl}/chat/completions`);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 60000,
    };

    const req = https.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.choices && parsed.choices[0]?.message?.content) {
            resolve(parsed.choices[0].message.content);
          } else if (parsed.error) {
            reject(new Error(parsed.error.message || 'DeepSeek API error'));
          } else {
            reject(new Error('Unexpected API response format'));
          }
        } catch (e) {
          reject(new Error(`Failed to parse API response: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => reject(new Error(`Network error: ${e.message}`)));
    req.on('timeout', () => { req.destroy(); reject(new Error('API request timeout (60s)')); });
    req.write(payload);
    req.end();
  });
}

function extractTitle(content, contentType) {
  // 从生成内容中提取第一行作为标题
  const firstLine = content.split('\n').find(l => l.trim().length > 0);
  return (firstLine || '').substring(0, 100);
}

// ==================== 国家列表（预设数据） ====================

// GET /api/seo-geo/countries
router.get('/countries', async (req, res) => {
  const countries = [
    { code: 'US', name_en: 'United States', name_zh: '美国', name_es: 'Estados Unidos', lang: 'en', flag: '🇺🇸' },
    { code: 'MX', name_en: 'Mexico', name_zh: '墨西哥', name_es: 'Mexico', lang: 'es', flag: '🇲🇽' },
    { code: 'BR', name_en: 'Brazil', name_zh: '巴西', name_es: 'Brasil', lang: 'pt', flag: '🇧🇷' },
    { code: 'CO', name_en: 'Colombia', name_zh: '哥伦比亚', name_es: 'Colombia', lang: 'es', flag: '🇨🇴' },
    { code: 'AR', name_en: 'Argentina', name_zh: '阿根廷', name_es: 'Argentina', lang: 'es', flag: '🇦🇷' },
    { code: 'CL', name_en: 'Chile', name_zh: '智利', name_es: 'Chile', lang: 'es', flag: '🇨🇱' },
    { code: 'PE', name_en: 'Peru', name_zh: '秘鲁', name_es: 'Peru', lang: 'es', flag: '🇵🇪' },
    { code: 'ES', name_en: 'Spain', name_zh: '西班牙', name_es: 'Espana', lang: 'es', flag: '🇪🇸' },
    { code: 'GB', name_en: 'United Kingdom', name_zh: '英国', name_es: 'Reino Unido', lang: 'en', flag: '🇬🇧' },
    { code: 'DE', name_en: 'Germany', name_zh: '德国', name_es: 'Alemania', lang: 'de', flag: '🇩🇪' },
    { code: 'FR', name_en: 'France', name_zh: '法国', name_es: 'Francia', lang: 'fr', flag: '🇫🇷' },
    { code: 'IT', name_en: 'Italy', name_zh: '意大利', name_es: 'Italia', lang: 'it', flag: '🇮🇹' },
    { code: 'RU', name_en: 'Russia', name_zh: '俄罗斯', name_es: 'Rusia', lang: 'ru', flag: '🇷🇺' },
    { code: 'TR', name_en: 'Turkey', name_zh: '土耳其', name_es: 'Turquia', lang: 'tr', flag: '🇹🇷' },
    { code: 'SA', name_en: 'Saudi Arabia', name_zh: '沙特阿拉伯', name_es: 'Arabia Saudita', lang: 'ar', flag: '🇸🇦' },
    { code: 'AE', name_en: 'UAE', name_zh: '阿联酋', name_es: 'Emiratos Arabes', lang: 'ar', flag: '🇦🇪' },
    { code: 'NG', name_en: 'Nigeria', name_zh: '尼日利亚', name_es: 'Nigeria', lang: 'en', flag: '🇳🇬' },
    { code: 'ZA', name_en: 'South Africa', name_zh: '南非', name_es: 'Sudafrika', lang: 'en', flag: '🇿🇦' },
    { code: 'TH', name_en: 'Thailand', name_zh: '泰国', name_es: 'Tailandia', lang: 'th', flag: '🇹🇭' },
    { code: 'ID', name_en: 'Indonesia', name_zh: '印尼', name_es: 'Indonesia', lang: 'id', flag: '🇮🇩' },
    { code: 'MY', name_en: 'Malaysia', name_zh: '马来西亚', name_es: 'Malasia', lang: 'ms', flag: '🇲🇾' },
    { code: 'PH', name_en: 'Philippines', name_zh: '菲律宾', name_es: 'Filipinas', lang: 'en', flag: '🇵🇭' },
    { code: 'VN', name_en: 'Vietnam', name_zh: '越南', name_es: 'Vietnam', lang: 'vi', flag: '🇻🇳' },
    { code: 'JP', name_en: 'Japan', name_zh: '日本', name_es: 'Japon', lang: 'ja', flag: '🇯🇵' },
    { code: 'KR', name_en: 'South Korea', name_zh: '韩国', name_es: 'Corea del Sur', lang: 'ko', flag: '🇰🇷' },
    { code: 'AU', name_en: 'Australia', name_zh: '澳大利亚', name_es: 'Australia', lang: 'en', flag: '🇦🇺' },
    { code: 'CA', name_en: 'Canada', name_zh: '加拿大', name_es: 'Canada', lang: 'en', flag: '🇨🇦' },
    { code: 'EG', name_en: 'Egypt', name_zh: '埃及', name_es: 'Egipto', lang: 'ar', flag: '🇪🇬' },
    { code: 'KE', name_en: 'Kenya', name_zh: '肯尼亚', name_es: 'Kenia', lang: 'en', flag: '🇰🇪' },
    { code: 'PL', name_en: 'Poland', name_zh: '波兰', name_es: 'Polonia', lang: 'pl', flag: '🇵🇱' },
  ];
  res.json({ success: true, data: countries });
});

// ==================== 统计数据 ====================

// GET /api/seo-geo/stats
router.get('/stats', async (req, res) => {
  try {
    const markets = await db.execute('SELECT COUNT(*) as total FROM seo_target_markets');
    const activeMarkets = await db.execute("SELECT COUNT(*) as total FROM seo_target_markets WHERE status = 'active'");
    const keywords = await db.execute('SELECT COUNT(*) as total FROM seo_keywords');
    const tasks = await db.execute('SELECT COUNT(*) as total, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as done FROM seo_tasks', ['completed']);
    const contents = await db.execute('SELECT COUNT(*) as total FROM seo_content_log');
    res.json({
      success: true,
      data: {
        total_markets: markets.rows[0]?.total || 0,
        active_markets: activeMarkets.rows[0]?.total || 0,
        total_keywords: keywords.rows[0]?.total || 0,
        total_tasks: tasks.rows[0]?.total || 0,
        completed_tasks: tasks.rows[0]?.done || 0,
        total_contents: contents.rows[0]?.total || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
