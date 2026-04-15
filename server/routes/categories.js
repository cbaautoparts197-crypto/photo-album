const express = require('express');
const router = express.Router();
const db = require('../db');

// ==================== 分类 API ====================

/**
 * GET /api/categories
 * 获取所有分类（树形结构）
 */
router.get('/', (req, res) => {
  try {
    const lang = req.query.lang || 'zh';
    const nameField = `name_${lang}`;

    const rows = db.prepare(`
      SELECT id, parent_id, name_zh, name_en, name_es, sort_order, created_at
      FROM categories
      ORDER BY sort_order ASC, id ASC
    `).all();

    // 构建树形结构
    const tree = buildTree(rows, null, nameField);
    res.json({ success: true, data: tree });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/categories/flat
 * 获取扁平分类列表（用于选择器）
 */
router.get('/flat', (req, res) => {
  try {
    const lang = req.query.lang || 'zh';
    const nameField = `name_${lang}`;

    const rows = db.prepare(`
      SELECT id, parent_id, name_zh, name_en, name_es, sort_order
      FROM categories
      ORDER BY sort_order ASC, id ASC
    `).all();

    // 添加路径标签
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

/**
 * POST /api/categories
 * 创建分类
 */
router.post('/', (req, res) => {
  try {
    const { parent_id, name_zh, name_en, name_es, sort_order } = req.body;

    if (!name_zh || !name_en || !name_es) {
      return res.status(400).json({ success: false, message: '所有语言名称不能为空' });
    }

    const result = db.prepare(`
      INSERT INTO categories (parent_id, name_zh, name_en, name_es, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      parent_id || null,
      name_zh,
      name_en,
      name_es,
      sort_order || 0
    );

    res.json({ success: true, id: result.lastInsertRowid, message: '分类创建成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/categories/:id
 * 更新分类
 */
router.put('/:id', (req, res) => {
  try {
    const { name_zh, name_en, name_es, parent_id, sort_order } = req.body;
    const id = req.params.id;

    const update = db.prepare(`
      UPDATE categories SET
        name_zh = COALESCE(?, name_zh),
        name_en = COALESCE(?, name_en),
        name_es = COALESCE(?, name_es),
        parent_id = COALESCE(?, parent_id),
        sort_order = COALESCE(?, sort_order)
      WHERE id = ?
    `).run(name_zh, name_en, name_es, parent_id, sort_order, id);

    if (update.changes === 0) {
      return res.status(404).json({ success: false, message: '分类不存在' });
    }

    res.json({ success: true, message: '分类更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/categories/:id
 * 删除分类（级联删除子分类，子产品取消关联）
 */
router.delete('/:id', (req, res) => {
  try {
    const id = req.params.id;

    // 检查是否有子分类
    const children = db.prepare('SELECT COUNT(*) as count FROM categories WHERE parent_id = ?').get(id);
    if (children.count > 0) {
      return res.status(400).json({ success: false, message: '请先删除子分类' });
    }

    const del = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    if (del.changes === 0) {
      return res.status(404).json({ success: false, message: '分类不存在' });
    }

    res.json({ success: true, message: '分类删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== 工具函数 ====================

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
