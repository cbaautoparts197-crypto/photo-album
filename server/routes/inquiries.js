const express = require('express');
const router = express.Router();
const db = require('../db');

// 生成短 group_id
function generateGroupId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

// POST /api/inquiries/batch - 批量询价提交（合并为一条）
router.post('/batch', async (req, res) => {
  try {
    const { items, customer_name, customer_email, customer_phone, customer_company, customer_message } = req.body;

    if (!customer_name || !customer_email) {
      return res.status(400).json({ success: false, message: '姓名和邮箱为必填项' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: '询价产品不能为空' });
    }

    const groupId = generateGroupId();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    for (const item of items) {
      await db.execute(
        `INSERT INTO inquiries (product_id, product_name, oe_number, category_name, quantity, customer_name, customer_email, customer_phone, customer_company, customer_message, group_id, status, created_at)
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
          groupId,
          now,
        ]
      );
    }

    res.json({ success: true, message: `成功提交 ${items.length} 个产品询价` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/inquiries - 前端提交询盘（单品）
router.post('/', async (req, res) => {
  try {
    const { product_id, product_name, oe_number, category_name, quantity, customer_name, customer_email, customer_phone, customer_message } = req.body;

    if (!customer_name || !customer_email) {
      return res.status(400).json({ success: false, message: '姓名和邮箱为必填项' });
    }

    await db.execute(
      `INSERT INTO inquiries (product_id, product_name, oe_number, category_name, quantity, customer_name, customer_email, customer_phone, customer_message, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
      [
        product_id || null,
        product_name || '',
        oe_number || '',
        category_name || '',
        quantity || 1,
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

// GET /api/inquiries - 询盘列表（后台用，支持分页和状态筛选，按 group_id 分组）
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

    // 按 group_id 分组统计，非空 group_id 的合并，空的保持独立
    const groupResult = await db.execute(
      `SELECT 
        CASE WHEN i.group_id != '' THEN i.group_id ELSE CAST(i.id AS TEXT) END as display_id,
        MIN(i.id) as first_id,
        MAX(i.group_id) as group_id,
        i.customer_name,
        i.customer_email,
        i.customer_phone,
        i.customer_company,
        i.customer_message,
        i.status,
        i.admin_reply,
        i.replied_at,
        MIN(i.created_at) as created_at,
        COUNT(*) as item_count,
        GROUP_CONCAT(i.product_name, '|||') as product_names,
        GROUP_CONCAT(i.oe_number, '|||') as oe_numbers,
        GROUP_CONCAT(i.category_name, '|||') as category_names,
        GROUP_CONCAT(i.quantity, '|||') as quantities,
        GROUP_CONCAT(i.product_id, '|||') as product_ids
       FROM inquiries i
       WHERE ${where}
       GROUP BY display_id
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    // 总数统计（按 display_id 去重）
    const countResult = await db.execute(
      `SELECT COUNT(DISTINCT CASE WHEN group_id != '' THEN group_id ELSE CAST(id AS TEXT) END) as total FROM inquiries i WHERE ${where}`,
      params
    );
    const total = countResult.rows[0].total;

    // 状态统计
    const statsResult = await db.execute(
      `SELECT status, COUNT(DISTINCT CASE WHEN group_id != '' THEN group_id ELSE CAST(id AS TEXT) END) as count FROM inquiries GROUP BY status`
    );
    const stats = {};
    for (const row of statsResult.rows) stats[row.status] = row.count;

    // 处理结果：展开 GROUP_CONCAT
    const items = groupResult.rows.map(row => {
      const isGrouped = row.group_id && row.group_id !== '';
      return {
        id: row.first_id,
        display_id: row.display_id,
        group_id: row.group_id || null,
        is_grouped: isGrouped,
        item_count: row.item_count,
        customer_name: row.customer_name,
        customer_email: row.customer_email,
        customer_phone: row.customer_phone,
        customer_company: row.customer_company,
        customer_message: row.customer_message,
        status: row.status,
        admin_reply: row.admin_reply,
        replied_at: row.replied_at,
        created_at: row.created_at,
        // 单品或分组第一个产品
        product_name: isGrouped ? null : (row.product_names || ''),
        oe_number: isGrouped ? null : (row.oe_numbers || ''),
        category_name: isGrouped ? null : (row.category_names || ''),
        quantity: isGrouped ? null : (row.quantities ? Number(row.quantities) : 1),
        // 分组时返回明细数组
        inquiry_items: isGrouped ? (row.product_names || '').split('|||').map((name, idx) => ({
          product_name: name,
          oe_number: (row.oe_numbers || '').split('|||')[idx] || '',
          category_name: (row.category_names || '').split('|||')[idx] || '',
          quantity: (row.quantities || '').split('|||')[idx] ? Number((row.quantities || '').split('|||')[idx]) : 1,
          product_id: (row.product_ids || '').split('|||')[idx] || null,
        })) : null,
      };
    });

    res.json({
      success: true,
      data: {
        items,
        pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
        stats,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/inquiries/:id/status - 更新状态（支持按 group_id 批量更新）
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['new', 'read', 'replied', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: '无效的状态值' });
    }
    const id = req.params.id;
    // 检查是否是分组询盘（传入的是 display_id）
    const check = await db.execute('SELECT group_id FROM inquiries WHERE id = ?', [Number(id)]);
    if (check.rows.length > 0 && check.rows[0].group_id) {
      await db.execute('UPDATE inquiries SET status = ? WHERE group_id = ?', [status, check.rows[0].group_id]);
    } else {
      await db.execute('UPDATE inquiries SET status = ? WHERE id = ?', [status, Number(id)]);
    }
    res.json({ success: true, message: '状态更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/inquiries/:id/reply - 管理员回复（支持按 group_id）
router.put('/:id/reply', async (req, res) => {
  try {
    const { admin_reply, status } = req.body;
    const sets = ["admin_reply = ?", "replied_at = datetime('now', 'localtime')"];
    const params = [admin_reply || ''];

    if (status) {
      sets.push('status = ?');
      params.push(status);
    }

    const id = req.params.id;
    // 检查是否是分组询盘
    const check = await db.execute('SELECT group_id FROM inquiries WHERE id = ?', [Number(id)]);
    let whereClause;
    if (check.rows.length > 0 && check.rows[0].group_id) {
      params.push(check.rows[0].group_id);
      whereClause = `UPDATE inquiries SET ${sets.join(', ')} WHERE group_id = ?`;
    } else {
      params.push(Number(id));
      whereClause = `UPDATE inquiries SET ${sets.join(', ')} WHERE id = ?`;
    }
    await db.execute(whereClause, params);
    res.json({ success: true, message: '回复成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/inquiries/:id - 删除询盘（支持按 group_id）
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const check = await db.execute('SELECT group_id FROM inquiries WHERE id = ?', [Number(id)]);
    if (check.rows.length > 0 && check.rows[0].group_id) {
      await db.execute('DELETE FROM inquiries WHERE group_id = ?', [check.rows[0].group_id]);
    } else {
      await db.execute('DELETE FROM inquiries WHERE id = ?', [Number(id)]);
    }
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/inquiries/:id/to-quotation - 询盘转为报价
router.post('/:id/to-quotation', async (req, res) => {
  try {
    const inquiryId = req.params.id;
    const result = await db.execute('SELECT * FROM inquiries WHERE id = ?', [Number(inquiryId)]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: '询盘不存在' });

    const inq = result.rows[0];

    // 创建报价
    await db.execute(
      `INSERT INTO quotations (source, customer_name, customer_email, customer_phone, customer_company, oe_number, quantity, unit_price, currency, supplier_name, remark, status)
       VALUES ('inquiry', ?, ?, ?, ?, ?, ?, 0, 'USD', '', ?, 'pending')`,
      [
        inq.customer_name || '',
        inq.customer_email || '',
        inq.customer_phone || '',
        inq.customer_company || '',
        inq.oe_number || '',
        inq.quantity || 1,
        inq.customer_message || ''
      ]
    );

    const idResult = await db.execute('SELECT last_insert_rowid() as id');
    const quotationId = idResult.rows[0].id;

    // 更新询盘状态和关联
    await db.execute(
      `UPDATE inquiries SET status = 'quoted', quotation_id = ? WHERE id = ?`,
      [quotationId, Number(inquiryId)]
    );

    res.json({
      success: true,
      data: { quotation_id: quotationId },
      message: '询盘已转为报价'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
