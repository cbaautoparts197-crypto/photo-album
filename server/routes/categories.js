const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/categories - 获取所有分类（树形结构）
router.get('/', async (req, res) => {
  try {
    const lang = req.query.lang || 'zh';
    const nameField = `name_${lang}`;
    const result = await db.execute(`
      SELECT id, parent_id, name_zh, name_en, name_es, sort_order, created_at
      FROM categories ORDER BY sort_order ASC, id ASC
    `);
    const rows = result.rows;
    const tree = buildTree(rows, null, nameField);
    res.json({ success: true, data: tree });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/categories/flat - 获取扁平分类列表
router.get('/flat', async (req, res) => {
  try {
    const lang = req.query.lang || 'zh';
    const nameField = `name_${lang}`;
    const result = await db.execute(`
      SELECT id, parent_id, name_zh, name_en, name_es, sort_order
      FROM categories ORDER BY sort_order ASC, id ASC
    `);
    const rows = result.rows;
    const withLabels = rows.map(row => ({
      ...row,
      name: row[nameField],
      label: buildCategoryLabel(row, rows, nameField),
    }));
    res.json({ success: true, data: withLabels });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/categories - 创建分类
router.post('/', async (req, res) => {
  try {
    const { parent_id, name_zh, name_en, name_es, sort_order } = req.body;
    if (!name_zh || !name_en || !name_es) {
      return res.status(400).json({ success: false, message: '所有语言名称不能为空' });
    }
    await db.execute(
      'INSERT INTO categories (parent_id, name_zh, name_en, name_es, sort_order) VALUES (?, ?, ?, ?, ?)',
      [parent_id || null, name_zh, name_en, name_es, sort_order || 0]
    );
    const result = await db.execute('SELECT last_insert_rowid() as id');
    const id = result.rows[0].id;
    res.json({ success: true, id, message: '分类创建成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/categories/:id - 更新分类
router.put('/:id', async (req, res) => {
  try {
    const { name_zh, name_en, name_es, parent_id, sort_order } = req.body;
    const id = req.params.id;
    await db.execute(
      `UPDATE categories SET
        name_zh = COALESCE(?, name_zh),
        name_en = COALESCE(?, name_en),
        name_es = COALESCE(?, name_es),
        parent_id = COALESCE(?, parent_id),
        sort_order = COALESCE(?, sort_order)
      WHERE id = ?`,
      [name_zh, name_en, name_es, parent_id, sort_order, id]
    );
    res.json({ success: true, message: '分类更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/categories/:id - 删除分类
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await db.execute('SELECT COUNT(*) as count FROM categories WHERE parent_id = ?', [id]);
    if (result.rows[0].count > 0) {
      return res.status(400).json({ success: false, message: '请先删除子分类' });
    }
    await db.execute('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ success: true, message: '分类删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

function buildTree(rows, parentId, nameField) {
  return rows
    .filter(row => row.parent_id === parentId)
    .map(row => ({
      id: row.id,
      parent_id: row.parent_id,
      name: row[nameField],
      name_zh: row.name_zh,
      name_en: row.name_en,
      name_es: row.name_es,
      sort_order: row.sort_order,
      created_at: row.created_at,
      children: buildTree(rows, row.id, nameField),
    }));
}

function buildCategoryLabel(row, allRows, nameField) {
  const parts = [];
  let current = row;
  while (current) {
    parts.unshift(current[nameField]);
    current = current.parent_id ? allRows.find(r => r.id === current.parent_id) : null;
  }
  return parts.join(' / ');
}

module.exports = router;
