const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/company
 * 获取公司信息
 */
router.get('/', (req, res) => {
  try {
    const info = db.prepare('SELECT * FROM company_info WHERE id = 1').get();
    res.json({ success: true, data: info });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/company
 * 更新公司信息
 */
router.put('/', (req, res) => {
  try {
    const {
      company_name_zh, company_name_en, company_name_es,
      logo_url,
      description_zh, description_en, description_es,
      address, phone, email, whatsapp, website,
      seo_title_zh, seo_title_en, seo_title_es, seo_keywords,
    } = req.body;

    db.prepare(`
      UPDATE company_info SET
        company_name_zh = COALESCE(?, company_name_zh),
        company_name_en = COALESCE(?, company_name_en),
        company_name_es = COALESCE(?, company_name_es),
        logo_url = COALESCE(?, logo_url),
        description_zh = COALESCE(?, description_zh),
        description_en = COALESCE(?, description_en),
        description_es = COALESCE(?, description_es),
        address = COALESCE(?, address),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        whatsapp = COALESCE(?, whatsapp),
        website = COALESCE(?, website),
        seo_title_zh = COALESCE(?, seo_title_zh),
        seo_title_en = COALESCE(?, seo_title_en),
        seo_title_es = COALESCE(?, seo_title_es),
        seo_keywords = COALESCE(?, seo_keywords),
        updated_at = datetime('now', 'localtime')
      WHERE id = 1
    `).run(
      company_name_zh, company_name_en, company_name_es,
      logo_url,
      description_zh, description_en, description_es,
      address, phone, email, whatsapp, website,
      seo_title_zh, seo_title_en, seo_title_es, seo_keywords,
    );

    const info = db.prepare('SELECT * FROM company_info WHERE id = 1').get();
    res.json({ success: true, data: info, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
