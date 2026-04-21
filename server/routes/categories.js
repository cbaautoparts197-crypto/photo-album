const express = require('express');
const router = express.Router();
const db = require('../db');

// ==================== 分类数据缓存（5分钟TTL）====================
let _cachedTree = null;
let _cachedTreeTs = 0;
let _cachedFlat = null;
let _cachedFlatTs = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

async function getCategoriesTree(lang) {
  const now = Date.now();
  const nameField = `name_${lang || 'zh'}`;
  if (_cachedTree && now - _cachedTreeTs < CACHE_TTL && _cachedTree.lang === lang) {
    return _cachedTree.data;
  }
  const result = await db.execute(`
    SELECT id, parent_id, name_zh, name_en, name_es, sort_order, created_at
    FROM categories ORDER BY sort_order ASC, id ASC
  `);
  const rows = result.rows;
  const countMap = await getCategoryProductCounts();
  const data = buildTree(rows, null, nameField, countMap);
  _cachedTree = { data, lang, ts: now };
  _cachedTreeTs = now;
  return data;
}

async function getCategoriesFlat(lang) {
  const now = Date.now();
  const nameField = `name_${lang || 'zh'}`;
  if (_cachedFlat && now - _cachedFlatTs < CACHE_TTL && _cachedFlat.lang === lang) {
    return _cachedFlat.data;
  }
  const result = await db.execute(`
    SELECT id, parent_id, name_zh, name_en, name_es, sort_order
    FROM categories ORDER BY sort_order ASC, id ASC
  `);
  const rows = result.rows;
  const countMap = await getCategoryProductCounts();
  const rowMap = new Map(rows.map(r => [r.id, r]));
  const data = rows.map(row => ({
    ...row,
    name: row[nameField],
    label: buildCategoryLabelFast(row, rowMap, nameField),
    product_count: countMap.get(row.id) || 0,
  }));
  _cachedFlat = { data, lang, ts: now };
  _cachedFlatTs = now;
  return data;
}

// 清除缓存（管理后台修改分类时调用）
function clearCategoryCache() {
  _cachedTree = null;
  _cachedFlat = null;
  _cachedTreeTs = 0;
  _cachedFlatTs = 0;
}

// GET /api/categories - 获取所有分类（树形结构）
router.get('/', async (req, res) => {
  try {
    const lang = req.query.lang || 'zh';
    const data = await getCategoriesTree(lang);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/categories/flat - 获取扁平分类列表
router.get('/flat', async (req, res) => {
  try {
    const lang = req.query.lang || 'zh';
    const data = await getCategoriesFlat(lang);
    res.json({ success: true, data });
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
    clearCategoryCache();
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
    clearCategoryCache();
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
    clearCategoryCache();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

function buildTree(rows, parentId, nameField, countMap) {
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
      product_count: countMap.get(row.id) || 0,
      children: buildTree(rows, row.id, nameField, countMap),
    }));
}

// 统计每个分类（含子分类）的产品数量
async function getCategoryProductCounts() {
  // 获取所有分类的 id 和 parent_id，构建父子关系
  const catResult = await db.execute('SELECT id, parent_id FROM categories');
  const catRows = catResult.rows;

  // 构建子分类映射：parentId → [childId, ...]
  const childrenMap = new Map();
  for (const cat of catRows) {
    const pid = cat.parent_id || 0;
    if (!childrenMap.has(pid)) childrenMap.set(pid, []);
    childrenMap.get(pid).push(cat.id);
  }

  // 获取每个叶子分类的直接产品数量
  const countResult = await db.execute('SELECT category_id, COUNT(*) as cnt FROM products WHERE category_id IS NOT NULL GROUP BY category_id');
  const directCount = new Map();
  for (const row of countResult.rows) {
    directCount.set(row.category_id, row.cnt);
  }

  // 递归计算：子节点数量之和 + 自身直接产品数
  const countMap = new Map();
  function calcCount(catId) {
    let total = directCount.get(catId) || 0;
    const children = childrenMap.get(catId) || [];
    for (const childId of children) {
      total += calcCount(childId);
    }
    countMap.set(catId, total);
    return total;
  }

  // 从顶级分类开始计算
  const roots = childrenMap.get(0) || [];
  for (const rootId of roots) {
    calcCount(rootId);
  }
  // 也处理可能未被顶级遍历到的分类
  for (const cat of catRows) {
    if (!countMap.has(cat.id)) calcCount(cat.id);
  }

  return countMap;
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
