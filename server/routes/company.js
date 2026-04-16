const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/company
router.get('/', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM company_info WHERE id = 1');
    res.json({ success: true, data: result.rows[0] || {} });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/company
router.put('/', async (req, res) => {
  try {
    const {
      company_name_zh, company_name_en, company_name_es,
      logo_url,
      description_zh, description_en, description_es,
      address, phone, email, whatsapp, website,
      seo_title_zh, seo_title_en, seo_title_es, seo_keywords,
    } = req.body;

    const fields = {
      company_name_zh, company_name_en, company_name_es,
      logo_url,
      description_zh, description_en, description_es,
      address, phone, email, whatsapp, website,
      seo_title_zh, seo_title_en, seo_title_es, seo_keywords,
    };

    const sets = [];
    const params = [];

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null) {
        sets.push(`${key} = ?`);
        params.push(String(value));
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ success: false, message: '没有需要更新的字段' });
    }

    sets.push("updated_at = datetime('now', 'localtime')");

    await db.execute(
      `UPDATE company_info SET ${sets.join(', ')} WHERE id = 1`,
      params
    );

    const info = await db.execute('SELECT * FROM company_info WHERE id = 1');
    res.json({ success: true, data: info.rows[0], message: '更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
