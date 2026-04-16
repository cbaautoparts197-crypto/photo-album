const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/inquiries/batch - 批量询价提交
router.post('/batch', async (req, res) => {
  try {
    const { items, customer_name, customer_email, customer_phone, customer_company, customer_message } = req.body;

    if (!customer_name || !customer_email) {
      return res.status(400).json({ success: false, message: '姓名和邮箱为必填项' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: '询价产品不能为空' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    for (const item of items) {
      await db.execute(
        `INSERT INTO inquiries (product_id, product_name, oe_number, category_name, quantity, customer_name, customer_email, customer_phone, customer_company, customer_message, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
        [
          item.product_id || null,
          item.product_name || '',
          item.oe_number || '',
          item.category_name || '',
          item.quantity || 1,
          customer_name,
          customer_email,
          customer_phone || '',
          customer_company || '',
          customer_message || '',
          now,
        ]
      );
    }

    res.json({ success: true, message: `成功提交 ${items.length} 个产品询价` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/inquiries - 前端提交询盘
router.post('/', async (req, res) => {
  try {
    const { product_id, product_name, oe_number, category_name, customer_name, customer_email, customer_phone, customer_message } = req.body;

    if (!customer_name || !customer_email) {
      return res.status(400).json({ success: false, message: '姓名和邮箱为必填项' });
    }

    await db.execute(
      `INSERT INTO inquiries (product_id, product_name, oe_number, category_name, customer_name, customer_email, customer_phone, customer_message, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
      [
        product_id || null,
        product_name || '',
        oe_number || '',
        category_name || '',
        customer_name,
        customer_email,
        customer_phone || '',
        customer_message || '',
      ]
    );

    const idResult = await db.execute('SELECT last_insert_rowid() as id');
    res.json({ success: true, id: idResult.rows[0].id, message: '询价提交成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/inquiries - 询盘列表（后台用，支持分页和状态筛选）
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let where = '1=1';
    const params = [];

    if (status && status !== 'all') {
      where += ' AND i.status = ?';
      params.push(status);
    }
    if (search) {
      where += ' AND (i.customer_name LIKE ? OR i.customer_email LIKE ? OR i.product_name LIKE ? OR i.oe_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    // 总数
    const countResult = await db.execute(`SELECT COUNT(*) as total FROM inquiries i WHERE ${where}`, params);
    const total = countResult.rows[0].total;

    // 状态统计
    const statsResult = await db.execute(
      `SELECT status, COUNT(*) as count FROM inquiries GROUP BY status`
    );
    const stats = {};
    for (const row of statsResult.rows) stats[row.status] = row.count;

    // 列表
    const rowsResult = await db.execute(
      `SELECT i.*, p.qiniu_url, p.qiniu_key
       FROM inquiries i
       LEFT JOIN products p ON i.product_id = p.id
       WHERE ${where}
       ORDER BY i.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

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

// PUT /api/inquiries/:id/status - 更新状态
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['new', 'read', 'replied', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: '无效的状态值' });
    }
    await db.execute('UPDATE inquiries SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true, message: '状态更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/inquiries/:id/reply - 管理员回复
router.put('/:id/reply', async (req, res) => {
  try {
    const { admin_reply, status } = req.body;
    const sets = ["admin_reply = ?", "replied_at = datetime('now', 'localtime')"];
    const params = [admin_reply || ''];

    if (status) {
      sets.push('status = ?');
      params.push(status);
    }

    params.push(req.params.id);
    await db.execute(`UPDATE inquiries SET ${sets.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: '回复成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/inquiries/:id - 删除询盘
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM inquiries WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
