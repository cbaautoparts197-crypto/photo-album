const express = require('express');
const router = express.Router();
const db = require('../db');
const watermarkUtil = require('../utils/watermark');

// GET /api/watermark - 获取水印设置
router.get('/', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM watermark_settings WHERE id = 1');
    const row = result.rows[0];
    if (row) row.enabled = !!row.enabled;
    res.json({ success: true, data: row || {} });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/watermark - 更新水印设置
router.put('/', async (req, res) => {
  try {
    const fields = [
      'enabled', 'text', 'font', 'font_size', 'fill_color',
      'dissolve', 'gravity', 'dx', 'dy', 'image_url', 'mode'
    ];
    const sets = [];
    const values = [];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        sets.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ success: false, message: '没有更新字段' });
    }

    sets.push("updated_at = datetime('now', 'localtime')");
    values.push(1);

    await db.execute(`UPDATE watermark_settings SET ${sets.join(', ')} WHERE id = ?`, values);

    const result = await db.execute('SELECT * FROM watermark_settings WHERE id = 1');
    const updated = result.rows[0];
    updated.enabled = !!updated.enabled;
    watermarkUtil.updateSettings(updated);

    res.json({ success: true, message: '保存成功', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/watermark/preview - 预览水印参数
router.get('/preview', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM watermark_settings WHERE id = 1');
    const row = result.rows[0];
    if (!row || !row.enabled) {
      return res.json({ success: true, data: { url: null, message: '水印未启用' } });
    }

    const watermarkParams = watermarkUtil.buildParams(row);
    const sampleUrl = 'https://www.qiniu.com/resources/logo.png';
    const previewUrl = `${sampleUrl}|${watermarkParams}`;

    res.json({ success: true, data: { url: previewUrl, params: watermarkParams } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
