const express = require('express');
const multer = require('multer');
const router = express.Router();
const db = require('../db');
const { uploadToQiniu, getFileUrl } = require('../utils/qiniu');
const { parseFilename, generateQiniuKey } = require('../utils/helpers');
const { apply } = require('../utils/watermark');

// 内存存储（文件不落盘，直接传七牛云）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 单文件 20MB
    files: 250,                  // 最多 250 个文件
  },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|bmp|tiff|svg\+xml/;
    if (allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype}`));
    }
  },
});

// ==================== 产品 API ====================

/**
 * GET /api/products
 * 获取产品列表（支持分类筛选、分页、搜索）
 */
router.get('/', (req, res) => {
  try {
    const { category_id, page = 1, limit = 20, search, lang = 'zh' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let where = '1=1';
    const params = [];

    if (category_id) {
      // 包含子分类
      const childIds = getAllChildCategoryIds(Number(category_id));
      const ids = [Number(category_id), ...childIds];
      const placeholders = ids.map(() => '?').join(',');
      where += ` AND p.category_id IN (${placeholders})`;
      params.push(...ids);
    }

    if (search) {
      where += ' AND p.name LIKE ?';
      params.push(`%${search}%`);
    }

    // 总数
    const countResult = db.prepare(`SELECT COUNT(*) as total FROM products p WHERE ${where}`).get(...params);
    const total = countResult.total;

    // 列表
    const rows = db.prepare(`
      SELECT p.*, c.name_zh as category_name_zh, c.name_en as category_name_en, c.name_es as category_name_es
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${where}
      ORDER BY p.sort_order ASC, p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), offset);

    res.json({
      success: true,
      data: {
        items: rows.map(p => ({
          ...p,
          qiniu_url_watermarked: apply(p.qiniu_url),
        })),
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/products/upload
 * 批量上传产品图片
 */
router.post('/upload', upload.array('files', 250), async (req, res) => {
  try {
    const categoryId = req.body.category_id ? Number(req.body.category_id) : null;
    const files = req.files;
    const customNames = req.body.names ? (Array.isArray(req.body.names) ? req.body.names : [req.body.names]) : [];

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: '未选择文件' });
    }

    // 获取分类路径（用于七牛云 key）
    let categoryPath = '';
    if (categoryId) {
      categoryPath = getCategoryPath(categoryId);
    }

    const results = [];
    const errors = [];

    // 使用 prepare + transaction 批量插入
    const insertStmt = db.prepare(`
      INSERT INTO products (category_id, name, filename, qiniu_key, qiniu_url, file_size, mime_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // 生成七牛云 key
        const qiniuKey = generateQiniuKey(file.originalname, categoryPath);

        // 上传到七牛云
        await uploadToQiniu(file.buffer, qiniuKey, file.mimetype);

        // 解析产品名称（优先使用前端传的自定义名称）
        const productName = customNames[i] && customNames[i].trim()
          ? customNames[i].trim()
          : parseFilename(file.originalname);

        // 构建访问 URL
        const qiniuUrl = getFileUrl(qiniuKey);

        // 写入数据库
        const result = insertStmt.run(
          categoryId,
          productName,
          file.originalname,
          qiniuKey,
          qiniuUrl,
          file.size,
          file.mimetype
        );

        results.push({
          id: result.lastInsertRowid,
          name: productName,
          filename: file.originalname,
          qiniu_url: qiniuUrl,
          success: true,
        });
      } catch (err) {
        errors.push({
          filename: file.originalname,
          error: err.message,
        });
      }
    }

    res.json({
      success: true,
      message: `上传完成: ${results.length} 成功, ${errors.length} 失败`,
      data: { success: results, failed: errors },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/products/:id
 * 更新产品信息（名称、分类）
 */
router.put('/:id', (req, res) => {
  try {
    const { name, category_id, oe_number, remark } = req.body;
    const id = req.params.id;

    const update = db.prepare(`
      UPDATE products SET
        name = COALESCE(?, name),
        category_id = COALESCE(?, category_id),
        oe_number = COALESCE(?, oe_number),
        remark = COALESCE(?, remark)
      WHERE id = ?
    `).run(name, category_id !== undefined ? category_id : null, oe_number, remark, id);

    if (update.changes === 0) {
      return res.status(404).json({ success: false, message: '产品不存在' });
    }

    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/products/:id
 * 删除产品（同时删除七牛云文件）
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

    if (!product) {
      return res.status(404).json({ success: false, message: '产品不存在' });
    }

    // 删除七牛云文件（忽略失败）
    try {
      const { deleteFromQiniu } = require('../utils/qiniu');
      await deleteFromQiniu(product.qiniu_key);
    } catch (e) {
      // 七牛云删除失败不影响本地删除
      console.warn('七牛云删除失败:', e.message);
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/products/batch-delete
 * 批量删除产品
 */
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要删除的产品' });
    }

    const products = db.prepare(`SELECT * FROM products WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids);

    // 批量删除七牛云文件
    const { deleteFromQiniu } = require('../utils/qiniu');
    for (const product of products) {
      try { await deleteFromQiniu(product.qiniu_key); } catch (e) {}
    }

    db.prepare(`DELETE FROM products WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
    res.json({ success: true, message: `成功删除 ${products.length} 个产品` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/products/:id/move-category
 * 批量移动产品到指定分类
 */
router.put('/batch-move-category', (req, res) => {
  try {
    const { ids, category_id } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请选择产品' });
    }

    const update = db.prepare(`
      UPDATE products SET category_id = ? WHERE id IN (${ids.map(() => '?').join(',')})
    `).run(category_id || null, ...ids);

    res.json({ success: true, message: `已移动 ${update.changes} 个产品` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== 工具函数 ====================

function getAllChildCategoryIds(parentId) {
  const ids = [];
  const children = db.prepare('SELECT id FROM categories WHERE parent_id = ?').all(parentId);
  for (const child of children) {
    ids.push(child.id);
    ids.push(...getAllChildCategoryIds(child.id));
  }
  return ids;
}

function getCategoryPath(categoryId) {
  const parts = [];
  let currentId = categoryId;

  while (currentId) {
    const cat = db.prepare('SELECT id, parent_id, name_en FROM categories WHERE id = ?').get(currentId);
    if (!cat) break;
    parts.unshift(cat.name_en.toLowerCase().replace(/\s+/g, '-'));
    currentId = cat.parent_id;
  }

  return parts.join('/');
}

module.exports = router;
