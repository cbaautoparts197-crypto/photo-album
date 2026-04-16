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
    // 预建 id→row Map，一次遍历计算 label，避免 O(n²)
    const rowMap = new Map(rows.map(r => [r.id, r]));
    const withLabels = rows.map(row => ({
      ...row,
      name: row[nameField],
      label: buildCategoryLabelFast(row, rowMap, nameField),
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
    const sets = [];
    const params = [];

    if (name_zh !== undefined && name_zh !== null && name_zh !== '') {
      sets.push('name_zh = ?');
      params.push(String(name_zh));
    }
    if (name_en !== undefined && name_en !== null && name_en !== '') {
      sets.push('name_en = ?');
      params.push(String(name_en));
    }
    if (name_es !== undefined && name_es !== null && name_es !== '') {
      sets.push('name_es = ?');
      params.push(String(name_es));
    }
    if (parent_id !== undefined && parent_id !== null && parent_id !== '') {
      sets.push('parent_id = ?');
      params.push(Number(parent_id));
    } else if (parent_id === null || parent_id === '') {
      sets.push('parent_id = NULL');
    }
    if (sort_order !== undefined && sort_order !== null && sort_order !== '') {
      sets.push('sort_order = ?');
      params.push(Number(sort_order));
    }

    if (sets.length === 0) {
      return res.status(400).json({ success: false, message: '没有需要更新的字段' });
    }

    params.push(Number(id));
    await db.execute(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`, params);
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
  // 兼容旧调用（理论上不会走到，但保留）
  const rowMap = new Map(allRows.map(r => [r.id, r]));
  return buildCategoryLabelFast(row, rowMap, nameField);
}

function buildCategoryLabelFast(row, rowMap, nameField) {
  const parts = [];
  let current = row;
  while (current) {
    parts.unshift(current[nameField]);
    current = current.parent_id ? rowMap.get(current.parent_id) : null;
  }
  return parts.join(' / ');
}

module.exports = router;
