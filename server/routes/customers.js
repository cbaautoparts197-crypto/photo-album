const express = require('express');
const router = express.Router();
const db = require('../db');

// ==================== 客户管理 CRUD ====================

// GET /api/customers - 客户列表（支持分页、搜索、来源筛选）
router.get('/', async (req, res) => {
  try {
    const { search, source, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let where = '1=1';
    const params = [];

    if (search) {
      where += ' AND (c.name LIKE ? OR c.email LIKE ? OR c.company LIKE ? OR c.phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (source) {
      where += ' AND c.source = ?';
      params.push(source);
    }

    const countResult = await db.execute(`SELECT COUNT(*) as total FROM customers c WHERE ${where}`, params);
    const total = countResult.rows[0].total;

    const rowsResult = await db.execute(
      `SELECT c.*,
        (SELECT COUNT(*) FROM quotations q WHERE q.customer_id = c.id) as quotation_count,
        (SELECT COUNT(*) FROM inquiries i WHERE i.customer_id = c.id) as inquiry_count
       FROM customers c
       WHERE ${where}
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    // 来源统计
    const statsResult = await db.execute(
      `SELECT source, COUNT(*) as count FROM customers GROUP BY source`
    );
    const stats = {};
    for (const row of statsResult.rows) stats[row.source] = row.count;

    res.json({
      success: true,
      data: {
        items: rowsResult.rows,
        pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
        stats,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/customers/:id - 客户详情
router.get('/:id', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM customers WHERE id = ?', [Number(req.params.id)]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: '客户不存在' });

    const customer = result.rows[0];

    // 获取关联的报价记录
    const quotations = await db.execute(
      `SELECT id, oe_number, quantity, unit_price, currency, supplier_name, status, created_at FROM quotations WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50`,
      [customer.id]
    );
    customer.quotations = quotations.rows;

    // 获取关联的询盘记录
    const inquiries = await db.execute(
      `SELECT id, product_name, oe_number, quantity, status, created_at FROM inquiries WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50`,
      [customer.id]
    );
    customer.inquiries = inquiries.rows;

    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/customers - 新增客户
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, company, country, address, remark, source } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: '客户名称不能为空' });
    }

    // 如果提供了邮箱，检查是否已存在
    if (email) {
      const existing = await db.execute('SELECT id, name FROM customers WHERE email = ?', [email.trim()]);
      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: '该邮箱已存在客户记录',
          data: existing.rows[0],
        });
      }
    }

    await db.execute(
      `INSERT INTO customers (name, email, phone, company, country, address, remark, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        (email || '').trim(),
        (phone || '').trim(),
        (company || '').trim(),
        (country || '').trim(),
        (address || '').trim(),
        (remark || '').trim(),
        source || 'manual',
      ]
    );

    const idResult = await db.execute('SELECT last_insert_rowid() as id');
    const newId = idResult.rows[0].id;

    const created = await db.execute('SELECT * FROM customers WHERE id = ?', [newId]);
    res.json({ success: true, data: created.rows[0], message: '客户创建成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/customers/:id - 更新客户
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, company, country, address, remark, source } = req.body;
    const id = req.params.id;

    const existing = await db.execute('SELECT id FROM customers WHERE id = ?', [Number(id)]);
    if (!existing.rows.length) return res.status(404).json({ success: false, message: '客户不存在' });

    // 如果修改了邮箱，检查唯一性
    if (email) {
      const dup = await db.execute('SELECT id FROM customers WHERE email = ? AND id != ?', [email.trim(), Number(id)]);
      if (dup.rows.length > 0) {
        return res.status(409).json({ success: false, message: '该邮箱已被其他客户使用' });
      }
    }

    const sets = [];
    const params = [];

    const fields = { name, email, phone, company, country, address, remark, source };
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) {
        sets.push(`${key} = ?`);
        params.push(String(val).trim());
      }
    }

    if (sets.length === 0) return res.status(400).json({ success: false, message: '没有需要更新的字段' });

    sets.push("updated_at = datetime('now', 'localtime')");
    params.push(Number(id));
    await db.execute(`UPDATE customers SET ${sets.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM customers WHERE id = ?', [Number(req.params.id)]);
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/customers/batch-delete
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要删除的客户' });
    }
    const placeholders = ids.map(() => '?').join(',');
    await db.execute(`DELETE FROM customers WHERE id IN (${placeholders})`, ids);
    res.json({ success: true, message: `成功删除 ${ids.length} 个客户` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/customers/select/search - 下拉搜索（报价/询盘中选择客户用）
router.get('/select/search', async (req, res) => {
  try {
    const { q = '' } = req.query;
    const keyword = q.trim();

    if (!keyword) {
      // 没有关键词时返回最近使用的客户
      const result = await db.execute(
        `SELECT id, name, email, company, phone FROM customers ORDER BY updated_at DESC LIMIT 20`
      );
      return res.json({ success: true, data: result.rows });
    }

    const result = await db.execute(
      `SELECT id, name, email, company, phone FROM customers
       WHERE name LIKE ? OR email LIKE ? OR company LIKE ? OR phone LIKE ?
       ORDER BY updated_at DESC LIMIT 20`,
      [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/customers/auto-match - 自动匹配已有客户（根据邮箱/姓名/公司）
router.post('/auto-match', async (req, res) => {
  try {
    const { email, name, company } = req.body;
    const conditions = [];
    const params = [];

    if (email) {
      conditions.push('email = ?');
      params.push(email.trim());
    }
    if (name) {
      conditions.push('name LIKE ?');
      params.push(`%${name.trim()}%`);
    }
    if (company) {
      conditions.push('company LIKE ?');
      params.push(`%${company.trim()}%`);
    }

    if (conditions.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // 邮箱精确匹配优先
    let result;
    if (email) {
      result = await db.execute('SELECT id, name, email, phone, company FROM customers WHERE email = ?', [email.trim()]);
      if (result.rows.length > 0) {
        return res.json({ success: true, data: result.rows });
      }
    }

    // 其次姓名+公司组合匹配
    if (name && company) {
      result = await db.execute(
        'SELECT id, name, email, phone, company FROM customers WHERE name LIKE ? AND company LIKE ? LIMIT 5',
        [`%${name.trim()}%`, `%${company.trim()}%`]
      );
      if (result.rows.length > 0) {
        return res.json({ success: true, data: result.rows });
      }
    }

    // 最后模糊匹配
    const whereClause = conditions.join(' OR ');
    result = await db.execute(
      `SELECT id, name, email, phone, company FROM customers WHERE ${whereClause} LIMIT 5`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
