const express = require('express');
const router = express.Router();
const db = require('../db');
const watermark = require('../utils/watermark');

/**
 * GET /api/watermark
 * 获取水印设置
 */
router.get('/', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM watermark_settings WHERE id = 1').get();
    // 确保前端拿到的是正确的 enabled 布尔值
    row.enabled = !!row.enabled;
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/watermark
 * 更新水印设置
 */
router.put('/', (req, res) => {
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
    values.push(1); // WHERE id = 1

    db.prepare(`UPDATE watermark_settings SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    const updated = db.prepare('SELECT * FROM watermark_settings WHERE id = 1').get();
    updated.enabled = !!updated.enabled;

    // 更新内存缓存
    watermark.updateSettings(updated);

    res.json({ success: true, message: '保存成功', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/watermark/preview
 * 生成水印预览效果（返回带水印参数的示例 URL）
 */
router.get('/preview', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM watermark_settings WHERE id = 1').get();
    if (!row.enabled) {
      return res.json({ success: true, data: { url: null, message: '水印未启用' } });
    }

    const watermarkParams = watermark.buildParams(row);
    // 使用一个示例七牛图片 URL 来展示预览效果
    const sampleUrl = 'https://www.qiniu.com/resources/logo.png';
    const previewUrl = `${sampleUrl}|${watermarkParams}`;

    res.json({ success: true, data: { url: previewUrl, params: watermarkParams } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
