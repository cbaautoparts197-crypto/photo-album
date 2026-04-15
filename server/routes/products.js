const express = require('express');
const multer = require('multer');
const router = express.Router();
const db = require('../db');
const { uploadToQiniu, getFileUrl } = require('../utils/qiniu');
const { parseFilename, generateQiniuKey } = require('../utils/helpers');
const { apply } = require('../utils/watermark');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 250 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|bmp|tiff|svg\+xml/;
    if (allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error(`不支持的文件类型: ${file.mimetype}`));
  },
});

// GET /api/products - 产品列表
router.get('/', async (req, res) => {
  try {
    const { category_id, page = 1, limit = 20, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let where = '1=1';
    const params = [];

    if (category_id) {
      const childIds = await getAllChildCategoryIds(Number(category_id));
      const ids = [Number(category_id), ...childIds];
      const placeholders = ids.map(() => '?').join(',');
      where += ` AND p.category_id IN (${placeholders})`;
      params.push(...ids);
    }

    if (search) {
      where += ' AND p.name LIKE ?';
      params.push(`%${search}%`);
    }

    const countResult = await db.execute(`SELECT COUNT(*) as total FROM products p WHERE ${where}`, params);
    const total = countResult.rows[0].total;

    const rowsResult = await db.execute(`
      SELECT p.*, c.name_zh as category_name_zh, c.name_en as category_name_en, c.name_es as category_name_es
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${where}
      ORDER BY p.sort_order ASC, p.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, Number(limit), offset]);

    res.json({
      success: true,
      data: {
        items: rowsResult.rows.map(p => ({
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

// POST /api/products/upload - 批量上传
router.post('/upload', upload.array('files', 250), async (req, res) => {
  try {
    const categoryId = req.body.category_id ? Number(req.body.category_id) : null;
    const files = req.files;
    const customNames = req.body.names ? (Array.isArray(req.body.names) ? req.body.names : [req.body.names]) : [];

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: '未选择文件' });
    }

    let categoryPath = '';
    if (categoryId) {
      categoryPath = await getCategoryPath(categoryId);
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const qiniuKey = generateQiniuKey(file.originalname, categoryPath);
        await uploadToQiniu(file.buffer, qiniuKey, file.mimetype);

        const productName = customNames[i] && customNames[i].trim()
          ? customNames[i].trim()
          : parseFilename(file.originalname);

        const qiniuUrl = getFileUrl(qiniuKey);

        await db.execute(
          'INSERT INTO products (category_id, name, filename, qiniu_key, qiniu_url, file_size, mime_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [categoryId, productName, file.originalname, qiniuKey, qiniuUrl, file.size, file.mimetype]
        );

        const idResult = await db.execute('SELECT last_insert_rowid() as id');
        results.push({
          id: idResult.rows[0].id,
          name: productName,
          filename: file.originalname,
          qiniu_url: qiniuUrl,
          success: true,
        });
      } catch (err) {
        errors.push({ filename: file.originalname, error: err.message });
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

// PUT /api/products/:id - 更新产品
router.put('/:id', async (req, res) => {
  try {
    const { name, category_id, oe_number, remark } = req.body;
    const id = req.params.id;
    await db.execute(
      `UPDATE products SET
        name = COALESCE(?, name),
        category_id = COALESCE(?, category_id),
        oe_number = COALESCE(?, oe_number),
        remark = COALESCE(?, remark)
      WHERE id = ?`,
      [name, category_id !== undefined ? category_id : null, oe_number, remark, id]
    );
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/products/:id - 删除产品
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await db.execute('SELECT * FROM products WHERE id = ?', [id]);
    const product = result.rows[0];
    if (!product) {
      return res.status(404).json({ success: false, message: '产品不存在' });
    }
    try {
      const { deleteFromQiniu } = require('../utils/qiniu');
      await deleteFromQiniu(product.qiniu_key);
    } catch (e) {
      console.warn('七牛云删除失败:', e.message);
    }
    await db.execute('DELETE FROM products WHERE id = ?', [id]);
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/products/batch-delete - 批量删除
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要删除的产品' });
    }
    const placeholders = ids.map(() => '?').join(',');
    const products = await db.execute(`SELECT * FROM products WHERE id IN (${placeholders})`, ids);

    const { deleteFromQiniu } = require('../utils/qiniu');
    for (const product of products.rows) {
      try { await deleteFromQiniu(product.qiniu_key); } catch (e) {}
    }

    await db.execute(`DELETE FROM products WHERE id IN (${placeholders})`, ids);
    res.json({ success: true, message: `成功删除 ${products.rows.length} 个产品` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/products/batch-move-category - 批量移动
router.put('/batch-move-category', async (req, res) => {
  try {
    const { ids, category_id } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请选择产品' });
    }
    const placeholders = ids.map(() => '?').join(',');
    await db.execute(
      `UPDATE products SET category_id = ? WHERE id IN (${placeholders})`,
      [category_id || null, ...ids]
    );
    res.json({ success: true, message: `已移动 ${ids.length} 个产品` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

async function getAllChildCategoryIds(parentId) {
  const ids = [];
  const result = await db.execute('SELECT id FROM categories WHERE parent_id = ?', [parentId]);
  for (const child of result.rows) {
    ids.push(child.id);
    ids.push(...await getAllChildCategoryIds(child.id));
  }
  return ids;
}

async function getCategoryPath(categoryId) {
  const parts = [];
  let currentId = categoryId;
  while (currentId) {
    const result = await db.execute('SELECT id, parent_id, name_en FROM categories WHERE id = ?', [currentId]);
    const cat = result.rows[0];
    if (!cat) break;
    parts.unshift(cat.name_en.toLowerCase().replace(/\s+/g, '-'));
    currentId = cat.parent_id;
  }
  return parts.join('/');
}

module.exports = router;
