const express = require('express');
const router = express.Router();
const db = require('../db');

// ==================== 采购合同管理 CRUD ====================

// GET /api/purchase-contracts - 采购合同列表
router.get('/', async (req, res) => {
  try {
    const { supplier, status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let where = '1=1';
    const params = [];

    if (supplier) {
      where += ' AND pc.supplier_name LIKE ?';
      params.push(`%${supplier}%`);
    }
    if (status) {
      where += ' AND pc.status = ?';
      params.push(status);
    }

    const countResult = await db.execute(`SELECT COUNT(*) as total FROM purchase_contracts pc WHERE ${where}`, params);
    const total = countResult.rows[0].total;

    const rowsResult = await db.execute(
      `SELECT pc.* FROM purchase_contracts pc WHERE ${where} ORDER BY pc.created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    // 为每个合同加载明细
    for (const row of rowsResult.rows) {
      const itemsResult = await db.execute(
        'SELECT * FROM purchase_contract_items WHERE contract_id = ?',
        [row.id]
      );
      row.items = itemsResult.rows;
    }

    // 状态统计
    const statsResult = await db.execute('SELECT status, COUNT(*) as count FROM purchase_contracts GROUP BY status');
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

// GET /api/purchase-contracts/:id - 合同详情
router.get('/:id', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM purchase_contracts WHERE id = ?', [Number(req.params.id)]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: '合同不存在' });

    const contract = result.rows[0];
    const itemsResult = await db.execute('SELECT * FROM purchase_contract_items WHERE contract_id = ?', [contract.id]);
    contract.items = itemsResult.rows;

    res.json({ success: true, data: contract });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/purchase-contracts - 创建采购合同（可从订单明细按供应商分组生成）
router.post('/', async (req, res) => {
  try {
    const { order_ids, supplier_name, items, remark } = req.body;

    let contractItems = items || [];
    let totalAmount = 0;
    let currency = 'USD';

    // 如果传了 order_ids，从订单明细中按供应商筛选
    if (order_ids && order_ids.length > 0 && supplier_name) {
      const placeholders = order_ids.map(() => '?').join(',');
      const itemsResult = await db.execute(
        `SELECT * FROM order_items WHERE order_id IN (${placeholders}) AND supplier_name = ?`,
        [...order_ids, supplier_name]
      );

      for (const item of itemsResult.rows) {
        contractItems.push({
          order_id: item.order_id,
          order_item_id: item.id,
          oe_number: item.oe_number,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency: item.currency,
          remark: item.remark,
        });
        totalAmount += (item.unit_price || 0) * (item.quantity || 1);
        currency = item.currency || 'USD';
      }
    } else if (contractItems.length > 0) {
      for (const item of contractItems) {
        totalAmount += (item.unit_price || 0) * (item.quantity || 1);
        currency = item.currency || currency;
      }
    }

    if (contractItems.length === 0) {
      return res.status(400).json({ success: false, message: '合同明细不能为空' });
    }

    // 插入合同
    await db.execute(
      `INSERT INTO purchase_contracts (order_ids, supplier_name, remark, status, total_amount, currency)
       VALUES (?, ?, ?, 'pending', ?, ?)`,
      [
        JSON.stringify(order_ids || []),
        supplier_name || '',
        remark || '',
        totalAmount,
        currency
      ]
    );

    const idResult = await db.execute('SELECT last_insert_rowid() as id');
    const contractId = idResult.rows[0].id;

    // 插入合同明细
    for (const item of contractItems) {
      await db.execute(
        `INSERT INTO purchase_contract_items (contract_id, order_id, order_item_id, oe_number, product_name, quantity, unit_price, currency, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          contractId,
          item.order_id || null,
          item.order_item_id || null,
          item.oe_number || '',
          item.product_name || '',
          item.quantity || 1,
          item.unit_price || 0,
          item.currency || 'USD',
          item.remark || '',
        ]
      );
    }

    // 更新订单状态为 'purchasing'
    if (order_ids && order_ids.length > 0) {
      const placeholders2 = order_ids.map(() => '?').join(',');
      await db.execute(
        `UPDATE orders SET status = CASE WHEN status = 'pending' THEN 'purchasing' ELSE status END, updated_at = datetime('now', 'localtime') WHERE id IN (${placeholders2})`,
        order_ids
      );
    }

    // 返回创建的合同
    const created = await db.execute('SELECT * FROM purchase_contracts WHERE id = ?', [contractId]);
    const itemsResult2 = await db.execute('SELECT * FROM purchase_contract_items WHERE contract_id = ?', [contractId]);
    const contract = created.rows[0];
    contract.items = itemsResult2.rows;

    res.json({ success: true, data: contract, message: '采购合同创建成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/purchase-contracts/generate-from-order - 从订单按供应商自动生成采购合同
router.post('/generate-from-order', async (req, res) => {
  try {
    const { order_id } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, message: '请指定订单ID' });
    }

    // 获取订单明细
    const itemsResult = await db.execute(
      'SELECT * FROM order_items WHERE order_id = ?',
      [Number(order_id)]
    );

    if (itemsResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: '订单无明细' });
    }

    // 按供应商分组
    const supplierGroups = new Map();
    for (const item of itemsResult.rows) {
      const supplier = item.supplier_name || '未指定供应商';
      if (!supplierGroups.has(supplier)) {
        supplierGroups.set(supplier, []);
      }
      supplierGroups.get(supplier).push(item);
    }

    const contracts = [];
    for (const [supplier, items] of supplierGroups) {
      let totalAmount = 0;
      let currency = 'USD';

      for (const item of items) {
        totalAmount += (item.unit_price || 0) * (item.quantity || 1);
        currency = item.currency || 'USD';
      }

      await db.execute(
        `INSERT INTO purchase_contracts (order_ids, supplier_name, remark, status, total_amount, currency)
         VALUES (?, ?, ?, 'pending', ?, ?)`,
        [
          JSON.stringify([Number(order_id)]),
          supplier,
          `从订单 #${order_id} 自动生成`,
          totalAmount,
          currency
        ]
      );

      const idResult = await db.execute('SELECT last_insert_rowid() as id');
      const contractId = idResult.rows[0].id;

      for (const item of items) {
        await db.execute(
          `INSERT INTO purchase_contract_items (contract_id, order_id, order_item_id, oe_number, product_name, quantity, unit_price, currency, remark)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            contractId,
            Number(order_id),
            item.id,
            item.oe_number || '',
            item.product_name || '',
            item.quantity || 1,
            item.unit_price || 0,
            item.currency || 'USD',
            item.remark || '',
          ]
        );
      }

      contracts.push({
        contract_id: contractId,
        supplier_name: supplier,
        item_count: items.length,
        total_amount: totalAmount,
        currency: currency,
      });
    }

    // 更新订单状态为 'purchasing'
    await db.execute(
      `UPDATE orders SET status = 'purchasing', updated_at = datetime('now', 'localtime') WHERE id = ?`,
      [Number(order_id)]
    );

    res.json({
      success: true,
      data: contracts,
      message: `成功生成 ${contracts.length} 份采购合同`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/purchase-contracts/:id - 更新合同
router.put('/:id', async (req, res) => {
  try {
    const { supplier_name, remark, status, total_amount } = req.body;
    const id = req.params.id;
    const sets = [];
    const params = [];

    const fields = { supplier_name, remark, status, total_amount };
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) {
        sets.push(`${key} = ?`);
        params.push(String(val));
      }
    }

    if (sets.length === 0) return res.status(400).json({ success: false, message: '没有需要更新的字段' });

    sets.push("updated_at = datetime('now', 'localtime')");
    params.push(Number(id));
    await db.execute(`UPDATE purchase_contracts SET ${sets.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/purchase-contracts/:id/status - 更新合同状态
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'in_production', 'delivered', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: '无效的状态值' });
    }
    await db.execute(
      `UPDATE purchase_contracts SET status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
      [status, req.params.id]
    );
    res.json({ success: true, message: '状态更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/purchase-contracts/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM purchase_contract_items WHERE contract_id = ?', [Number(req.params.id)]);
    await db.execute('DELETE FROM purchase_contracts WHERE id = ?', [Number(req.params.id)]);
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/purchase-contracts/batch-delete
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要删除的记录' });
    }
    const placeholders = ids.map(() => '?').join(',');
    await db.execute(`DELETE FROM purchase_contract_items WHERE contract_id IN (${placeholders})`, ids);
    await db.execute(`DELETE FROM purchase_contracts WHERE id IN (${placeholders})`, ids);
    res.json({ success: true, message: `成功删除 ${ids.length} 条记录` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
