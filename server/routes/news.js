const express = require('express');
const router = express.Router();
const db = require('../db');

// ==================== News CRUD ====================

// GET /api/news - 新闻列表
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, published } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let where = '1=1';
    const params = [];
    if (published !== undefined) {
      where += ' AND is_published = ?';
      params.push(Number(published));
    }
    const count = await db.execute(`SELECT COUNT(*) as total FROM news WHERE ${where}`, params);
    const rows = await db.execute(
      `SELECT * FROM news WHERE ${where} ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );
    res.json({ success: true, data: rows.rows, pagination: { total: count.rows[0].total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/news/:id
router.get('/:id', async (req, res) => {
  try {
    const rows = await db.execute('SELECT * FROM news WHERE id = ?', [Number(req.params.id)]);
    if (!rows.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: rows.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/news - 新增新闻
router.post('/', async (req, res) => {
  try {
    const { title, title_zh, title_en, title_es, content, content_zh, content_en, content_es, cover_image, summary, summary_zh, summary_en, summary_es, sort_order = 0, is_published = 1 } = req.body;
    const result = await db.execute(
      `INSERT INTO news (title, title_zh, title_en, title_es, content, content_zh, content_en, content_es, cover_image, summary, summary_zh, summary_en, summary_es, sort_order, is_published) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [title || '', title_zh || '', title_en || '', title_es || '', content || '', content_zh || '', content_en || '', content_es || '', cover_image || '', summary || '', summary_zh || '', summary_en || '', summary_es || '', Number(sort_order), Number(is_published)]
    );
    res.json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/news/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, title_zh, title_en, title_es, content, content_zh, content_en, content_es, cover_image, summary, summary_zh, summary_en, summary_es, sort_order, is_published } = req.body;
    await db.execute(
      `UPDATE news SET title=?, title_zh=?, title_en=?, title_es=?, content=?, content_zh=?, content_en=?, content_es=?, cover_image=?, summary=?, summary_zh=?, summary_en=?, summary_es=?, sort_order=?, is_published=?, updated_at=datetime('now','localtime') WHERE id=?`,
      [title || '', title_zh || '', title_en || '', title_es || '', content || '', content_zh || '', content_en || '', content_es || '', cover_image || '', summary || '', summary_zh || '', summary_en || '', summary_es || '', sort_order ?? 0, is_published ?? 1, Number(req.params.id)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/news/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM news WHERE id = ?', [Number(req.params.id)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/news/batch-delete
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.json({ success: true, message: '无删除项' });
    const placeholders = ids.map(() => '?').join(',');
    await db.execute(`DELETE FROM news WHERE id IN (${placeholders})`, ids);
    res.json({ success: true, message: `删除 ${ids.length} 条` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
