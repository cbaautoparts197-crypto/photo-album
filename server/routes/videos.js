const express = require('express');
const router = express.Router();
const db = require('../db');

// ==================== Videos CRUD ====================

// GET /api/videos - 视频列表
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
    const count = await db.execute(`SELECT COUNT(*) as total FROM videos WHERE ${where}`, params);
    const rows = await db.execute(
      `SELECT * FROM videos WHERE ${where} ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );
    res.json({ success: true, data: rows.rows, pagination: { total: count.rows[0].total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/videos - 新增视频
router.post('/', async (req, res) => {
  try {
    const { title, youtube_url, description, sort_order = 0, is_published = 1 } = req.body;
    // extract youtube id
    let youtube_id = '';
    const match = youtube_url && youtube_url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
    if (match) youtube_id = match[1];
    const thumbnail_url = youtube_id ? `https://img.youtube.com/vi/${youtube_id}/hqdefault.jpg` : '';
    const result = await db.execute(
      `INSERT INTO videos (title, youtube_url, youtube_id, thumbnail_url, description, sort_order, is_published) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title || '', youtube_url || '', youtube_id, thumbnail_url, description || '', Number(sort_order), Number(is_published)]
    );
    res.json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/videos/:id - 更新视频
router.put('/:id', async (req, res) => {
  try {
    const { title, youtube_url, description, sort_order, is_published } = req.body;
    let youtube_id = '';
    if (youtube_url) {
      const match = youtube_url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
      if (match) youtube_id = match[1];
    }
    const thumbnail_url = youtube_id ? `https://img.youtube.com/vi/${youtube_id}/hqdefault.jpg` : '';
    await db.execute(
      `UPDATE videos SET title=?, youtube_url=?, youtube_id=?, thumbnail_url=?, description=?, sort_order=?, is_published=?, updated_at=datetime('now','localtime') WHERE id=?`,
      [title || '', youtube_url || '', youtube_id, thumbnail_url, description || '', sort_order ?? 0, is_published ?? 1, Number(req.params.id)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/videos/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM videos WHERE id = ?', [Number(req.params.id)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/videos/batch-delete
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.json({ success: true, message: '无删除项' });
    const placeholders = ids.map(() => '?').join(',');
    await db.execute(`DELETE FROM videos WHERE id IN (${placeholders})`, ids);
    res.json({ success: true, message: `删除 ${ids.length} 条` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
