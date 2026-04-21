const express = require('express');
const router = express.Router();
const db = require('../db');

// ==================== 订单管理 CRUD ====================

// GET /api/orders - 订单列表（支持分页、客户搜索、状态筛选）
router.get('/', async (req, res) => {
  try {
    const { customer, status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let where = '1=1';
    const params = [];

    if (customer) {
      where += ' AND (o.customer_name LIKE ? OR o.customer_company LIKE ?)';
      params.push(`%${customer}%`, `%${customer}%`);
    }
    if (status) {
      where += ' AND o.status = ?';
      params.push(status);
    }

    const countResult = await db.execute(`SELECT COUNT(*) as total FROM orders o WHERE ${where}`, params);
    const total = countResult.rows[0].total;

    const rowsResult = await db.execute(
      `SELECT o.* FROM orders o WHERE ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    // 为每个订单加载明细
    for (const row of rowsResult.rows) {
      const itemsResult = await db.execute(
        'SELECT * FROM order_items WHERE order_id = ?',
        [row.id]
      );
      row.items = itemsResult.rows;
    }

    // 状态统计
    const statsResult = await db.execute('SELECT status, COUNT(*) as count FROM orders GROUP BY status');
    const stats = {};
    for (const row of statsResult.rows) stats[row.status] = row.count;

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

// GET /api/orders/:id - 订单详情
router.get('/:id', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM orders WHERE id = ?', [Number(req.params.id)]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: '订单不存在' });

    const order = result.rows[0];
    const itemsResult = await db.execute('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    order.items = itemsResult.rows;

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/orders - 创建订单（可传入 quotation_ids 从报价转）
router.post('/', async (req, res) => {
  try {
    const {
      quotation_ids, customer_name, customer_email, customer_phone, customer_company,
      customer_id, remark, items
    } = req.body;

    // 如果传了 quotation_ids，从报价中读取明细和客户信息
    let orderItems = items || [];
    let custName = customer_name || '';
    let custEmail = customer_email || '';
    let custPhone = customer_phone || '';
    let custCompany = customer_company || '';
    let custId = customer_id || null;
    let totalAmount = 0;
    let currency = 'USD';

    if (quotation_ids && quotation_ids.length > 0) {
      const placeholders = quotation_ids.map(() => '?').join(',');
      const quotesResult = await db.execute(
        `SELECT * FROM quotations WHERE id IN (${placeholders})`,
        quotation_ids
      );
      const quotes = quotesResult.rows;

      for (const q of quotes) {
        if (!custName && q.customer_name) custName = q.customer_name;
        if (!custEmail && q.customer_email) custEmail = q.customer_email;
        if (!custPhone && q.customer_phone) custPhone = q.customer_phone;
        if (!custCompany && q.customer_company) custCompany = q.customer_company;
        if (!custId && q.customer_id) custId = q.customer_id;
        if (!currency || currency === 'USD') currency = q.currency || 'USD';

        orderItems.push({
          quotation_id: q.id,
          oe_number: q.oe_number,
          quantity: q.quantity || 1,
          unit_price: q.unit_price || 0,
          currency: q.currency || 'USD',
          supplier_name: q.supplier_name || '',
          remark: q.remark || '',
        });
        totalAmount += (q.unit_price || 0) * (q.quantity || 1);
      }

      // 更新报价的状态为 'ordered' 并关联 order_id
      const orderIdResult = await db.execute('SELECT last_insert_rowid() as id');
      // 先插入订单拿到 id 再更新报价
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ success: false, message: '订单明细不能为空' });
    }

    // 计算总额
    if (totalAmount === 0) {
      for (const item of orderItems) {
        totalAmount += (item.unit_price || 0) * (item.quantity || 1);
      }
    }

    // 插入订单
    await db.execute(
      `INSERT INTO orders (quotation_ids, customer_name, customer_email, customer_phone, customer_company, customer_id, remark, status, total_amount, currency)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [
        JSON.stringify(quotation_ids || []),
        custName,
        custEmail,
        custPhone,
        custCompany,
        custId,
        remark || '',
        totalAmount,
        currency
      ]
    );

    const idResult = await db.execute('SELECT last_insert_rowid() as id');
    const orderId = idResult.rows[0].id;

    // 插入订单明细
    for (const item of orderItems) {
      await db.execute(
        `INSERT INTO order_items (order_id, quotation_id, oe_number, product_name, quantity, unit_price, currency, supplier_name, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.quotation_id || null,
          item.oe_number || '',
          item.product_name || '',
          item.quantity || 1,
          item.unit_price || 0,
          item.currency || 'USD',
          item.supplier_name || '',
          item.remark || '',
        ]
      );
    }

    // 如果是从报价转入，更新报价状态和关联
    if (quotation_ids && quotation_ids.length > 0) {
      for (const qid of quotation_ids) {
        await db.execute(
          `UPDATE quotations SET status = 'ordered', order_id = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
          [orderId, qid]
        );
      }
    }

    // 更新关联的询盘状态
    if (quotation_ids && quotation_ids.length > 0) {
      const placeholders2 = quotation_ids.map(() => '?').join(',');
      await db.execute(
        `UPDATE inquiries SET status = 'quoted', quotation_id = CASE WHEN quotation_id IS NULL THEN (SELECT id FROM quotations WHERE id IN (${placeholders2}) LIMIT 1) ELSE quotation_id END WHERE id IN (SELECT id FROM inquiries WHERE quotation_id IS NULL)`,
        quotation_ids
      );
      // 简化：直接更新有 quotation_id 为这些报价 id 的询盘
      await db.execute(
        `UPDATE inquiries SET status = 'quoted' WHERE quotation_id IN (${placeholders2})`,
        quotation_ids
      );
    }

    // 返回创建的订单
    const created = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
    const itemsResult = await db.execute('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
    const order = created.rows[0];
    order.items = itemsResult.rows;

    res.json({ success: true, data: order, message: '订单创建成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/orders/:id - 更新订单
router.put('/:id', async (req, res) => {
  try {
    const { customer_name, customer_email, customer_phone, customer_company, remark, status, total_amount, currency } = req.body;
    const id = req.params.id;
    const sets = [];
    const params = [];

    const fields = { customer_name, customer_email, customer_phone, customer_company, remark, status, total_amount, currency };
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) {
        sets.push(`${key} = ?`);
        params.push(String(val));
      }
    }

    if (sets.length === 0) return res.status(400).json({ success: false, message: '没有需要更新的字段' });

    sets.push("updated_at = datetime('now', 'localtime')");
    params.push(Number(id));
    await db.execute(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/orders/:id/status - 更新订单状态
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'purchasing', 'shipped', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: '无效的状态值' });
    }
    await db.execute(
      `UPDATE orders SET status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
      [status, req.params.id]
    );
    res.json({ success: true, message: '状态更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/orders/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM order_items WHERE order_id = ?', [Number(req.params.id)]);
    await db.execute('DELETE FROM orders WHERE id = ?', [Number(req.params.id)]);
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/orders/batch-delete
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要删除的记录' });
    }
    const placeholders = ids.map(() => '?').join(',');
    await db.execute(`DELETE FROM order_items WHERE order_id IN (${placeholders})`, ids);
    await db.execute(`DELETE FROM orders WHERE id IN (${placeholders})`, ids);
    res.json({ success: true, message: `成功删除 ${ids.length} 条记录` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
