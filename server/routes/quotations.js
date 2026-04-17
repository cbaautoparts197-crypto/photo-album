const express = require('express');
const multer = require('multer');
const router = express.Router();
const db = require('../db');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// 辅助函数：根据客户信息自动匹配或创建客户，返回 customer_id
async function resolveCustomerId(customerInfo) {
  const { customer_name, customer_email, customer_phone, customer_company, source } = customerInfo;
  const name = (customer_name || '').trim();
  const email = (customer_email || '').trim();
  const company = (customer_company || '').trim();
  const phone = (customer_phone || '').trim();

  // 无有效信息则不关联
  if (!name && !email) return null;

  // 1. 邮箱精确匹配
  if (email) {
    const existing = await db.execute('SELECT id FROM customers WHERE email = ?', [email]);
    if (existing.rows.length > 0) return existing.rows[0].id;
  }

  // 2. 姓名+公司匹配
  if (name && company) {
    const existing = await db.execute(
      'SELECT id FROM customers WHERE name = ? AND company = ? LIMIT 1',
      [name, company]
    );
    if (existing.rows.length > 0) return existing.rows[0].id;
  }

  // 3. 姓名+电话匹配
  if (name && phone) {
    const existing = await db.execute(
      'SELECT id FROM customers WHERE name = ? AND phone = ? LIMIT 1',
      [name, phone]
    );
    if (existing.rows.length > 0) return existing.rows[0].id;
  }

  // 4. 自动创建新客户
  const resolvedSource = source === 'inquiry' ? 'inquiry' : (source === 'excel' ? 'excel' : 'manual');
  try {
    await db.execute(
      `INSERT INTO customers (name, email, phone, company, source) VALUES (?, ?, ?, ?, ?)`,
      [name || email, email, phone, company, resolvedSource]
    );
    const idResult = await db.execute('SELECT last_insert_rowid() as id');
    return idResult.rows[0].id;
  } catch (e) {
    // 邮箱冲突等忽略
    return null;
  }
}

// ==================== 报价管理 CRUD ====================

// GET /api/quotations - 报价列表（支持分页、OE号/客户搜索、来源筛选）
router.get('/', async (req, res) => {
  try {
    const { oe_number, customer, source, status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let where = '1=1';
    const params = [];

    if (oe_number) {
      where += ' AND q.oe_number LIKE ?';
      params.push(`%${oe_number}%`);
    }
    if (customer) {
      where += ' AND q.customer_name LIKE ?';
      params.push(`%${customer}%`);
    }
    if (source) {
      where += ' AND q.source = ?';
      params.push(source);
    }
    if (status) {
      where += ' AND q.status = ?';
      params.push(status);
    }

    const countResult = await db.execute(`SELECT COUNT(*) as total FROM quotations q WHERE ${where}`, params);
    const total = countResult.rows[0].total;

    const rowsResult = await db.execute(
      `SELECT q.* FROM quotations q WHERE ${where} ORDER BY q.created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    // 为每个报价项查询关联的产品图片（OE号正则模糊匹配）
    for (const row of rowsResult.rows) {
      row.product_images = [];
      if (row.oe_number) {
        const productsResult = await db.execute(
          `SELECT id, name, qiniu_url, oe_number FROM products WHERE oe_number IS NOT NULL AND oe_number != '' AND (? REGEXP oe_number OR oe_number REGEXP ?) LIMIT 5`,
          [row.oe_number, row.oe_number]
        );
        row.product_images = productsResult.rows;
      }
    }

    // 状态统计
    const statsResult = await db.execute(
      `SELECT status, COUNT(*) as count FROM quotations GROUP BY status`
    );
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

// GET /api/quotations/:id - 报价详情
router.get('/:id', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM quotations WHERE id = ?', [Number(req.params.id)]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });

    const row = result.rows[0];
    row.product_images = [];
    if (row.oe_number) {
      const productsResult = await db.execute(
        `SELECT id, name, qiniu_url, oe_number FROM products WHERE oe_number IS NOT NULL AND oe_number != '' AND (? REGEXP oe_number OR oe_number REGEXP ?) LIMIT 5`,
        [row.oe_number, row.oe_number]
      );
      row.product_images = productsResult.rows;
    }

    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/quotations - 新增报价
router.post('/', async (req, res) => {
  try {
    const {
      source, customer_name, customer_email, customer_phone, customer_company,
      oe_number, quantity, unit_price, currency, supplier_name, remark
    } = req.body;

    if (!oe_number) {
      return res.status(400).json({ success: false, message: 'OE号不能为空' });
    }

    // 自动报价：查询价格库中该OE号的供应商价格
    let autoPrice = unit_price || 0;
    let autoSupplier = supplier_name || '';
    let autoCurrency = currency || 'USD';

    if (!autoPrice) {
      const prices = await db.execute(
        `SELECT * FROM supplier_prices WHERE oe_number LIKE ? ORDER BY unit_price ASC LIMIT 1`,
        [`%${oe_number}%`]
      );
      if (prices.rows.length > 0) {
        autoPrice = prices.rows[0].unit_price;
        autoSupplier = prices.rows[0].supplier_name;
        autoCurrency = prices.rows[0].currency;
      }
    }

    // 自动关联客户
    const customerId = await resolveCustomerId({ customer_name, customer_email, customer_phone, customer_company, source });

    await db.execute(
      `INSERT INTO quotations (source, customer_name, customer_email, customer_phone, customer_company, customer_id, oe_number, quantity, unit_price, currency, supplier_name, remark, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        source || 'internal',
        customer_name || '',
        customer_email || '',
        customer_phone || '',
        customer_company || '',
        customerId,
        oe_number,
        quantity || 1,
        autoPrice,
        autoCurrency,
        autoSupplier,
        remark || ''
      ]
    );

    const idResult = await db.execute('SELECT last_insert_rowid() as id');
    const newId = idResult.rows[0].id;

    // 返回新创建的记录，包含产品图片
    const created = await db.execute('SELECT * FROM quotations WHERE id = ?', [newId]);
    const row = created.rows[0];
    row.product_images = [];
    if (row.oe_number) {
      const productsResult = await db.execute(
        `SELECT id, name, qiniu_url, oe_number FROM products WHERE oe_number IS NOT NULL AND oe_number != '' AND (? REGEXP oe_number OR oe_number REGEXP ?) LIMIT 5`,
        [row.oe_number, row.oe_number]
      );
      row.product_images = productsResult.rows;
    }

    res.json({ success: true, data: row, message: '报价创建成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/quotations/batch - 批量新增报价（从前台询价或Excel导入）
router.post('/batch', async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: '报价数据不能为空' });
    }

    // 预加载所有相关OE号的价格
    const oeNumbers = [...new Set(items.map(i => i.oe_number).filter(Boolean))];
    const priceMap = new Map();
    for (const oe of oeNumbers) {
      const prices = await db.execute(
        `SELECT * FROM supplier_prices WHERE oe_number LIKE ? ORDER BY unit_price ASC LIMIT 1`,
        [`%${oe}%`]
      );
      if (prices.rows.length > 0) {
        priceMap.set(oe.toUpperCase(), prices.rows[0]);
      }
    }

    const results = [];
    for (const item of items) {
      if (!item.oe_number) continue;

      let autoPrice = item.unit_price || 0;
      let autoSupplier = item.supplier_name || '';
      let autoCurrency = item.currency || 'USD';

      // 自动报价
      if (!autoPrice) {
        const price = priceMap.get(item.oe_number.toUpperCase());
        if (price) {
          autoPrice = price.unit_price;
          autoSupplier = price.supplier_name;
          autoCurrency = price.currency;
        }
      }

      // 自动关联客户
      const customerId = await resolveCustomerId({
        customer_name: item.customer_name,
        customer_email: item.customer_email,
        customer_phone: item.customer_phone,
        customer_company: item.customer_company,
        source: item.source,
      });

      await db.execute(
        `INSERT INTO quotations (source, customer_name, customer_email, customer_phone, customer_company, customer_id, oe_number, quantity, unit_price, currency, supplier_name, remark, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          item.source || 'internal',
          item.customer_name || '',
          item.customer_email || '',
          item.customer_phone || '',
          item.customer_company || '',
          customerId,
          item.oe_number,
          item.quantity || 1,
          autoPrice,
          autoCurrency,
          autoSupplier,
          item.remark || ''
        ]
      );
      const idResult = await db.execute('SELECT last_insert_rowid() as id');
      results.push({
        id: idResult.rows[0].id,
        oe_number: item.oe_number,
        unit_price: autoPrice,
        supplier_name: autoSupplier,
        currency: autoCurrency,
      });
    }

    res.json({ success: true, data: results, message: `成功创建 ${results.length} 条报价` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/quotations/:id - 更新报价
router.put('/:id', async (req, res) => {
  try {
    const { customer_name, customer_email, customer_phone, customer_company, oe_number, quantity, unit_price, currency, supplier_name, remark, status } = req.body;
    const id = req.params.id;
    const sets = [];
    const params = [];

    const fields = { customer_name, customer_email, customer_phone, customer_company, oe_number, quantity, unit_price, currency, supplier_name, remark, status };
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) {
        sets.push(`${key} = ?`);
        params.push(String(val));
      }
    }

    if (sets.length === 0) return res.status(400).json({ success: false, message: '没有需要更新的字段' });

    sets.push("updated_at = datetime('now', 'localtime')");
    params.push(Number(id));
    await db.execute(`UPDATE quotations SET ${sets.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/quotations/:id/auto-price - 手动触发自动报价
router.post('/:id/auto-price', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await db.execute('SELECT * FROM quotations WHERE id = ?', [Number(id)]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: '报价不存在' });

    const quote = result.rows[0];
    if (!quote.oe_number) return res.json({ success: false, message: '无OE号，无法自动报价' });

    // 查询最优价格（价格最低 = 高优先级）
    const prices = await db.execute(
      `SELECT * FROM supplier_prices WHERE oe_number LIKE ? ORDER BY unit_price ASC LIMIT 1`,
      [`%${quote.oe_number}%`]
    );

    if (prices.rows.length === 0) {
      return res.json({ success: false, message: '未找到匹配的供应商价格' });
    }

    const best = prices.rows[0];
    await db.execute(
      `UPDATE quotations SET unit_price = ?, currency = ?, supplier_name = ?, status = 'quoted', updated_at = datetime('now', 'localtime') WHERE id = ?`,
      [best.unit_price, best.currency, best.supplier_name, Number(id)]
    );

    res.json({
      success: true,
      data: {
        unit_price: best.unit_price,
        currency: best.currency,
        supplier_name: best.supplier_name,
        moq: best.moq,
        lead_time: best.lead_time,
      },
      message: '自动报价成功'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/quotations/batch-auto-price - 批量自动报价
router.post('/batch-auto-price', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要报价的记录' });
    }

    // 获取所有选中的报价
    const placeholders = ids.map(() => '?').join(',');
    const quotes = await db.execute(
      `SELECT * FROM quotations WHERE id IN (${placeholders}) AND oe_number IS NOT NULL AND oe_number != ''`,
      ids
    );

    // 预加载所有价格
    const oeNumbers = [...new Set(quotes.rows.map(q => q.oe_number))];
    const priceMap = new Map();
    for (const oe of oeNumbers) {
      const prices = await db.execute(
        `SELECT * FROM supplier_prices WHERE oe_number LIKE ? ORDER BY unit_price ASC LIMIT 1`,
        [`%${oe}%`]
      );
      if (prices.rows.length > 0) {
        priceMap.set(oe.toUpperCase(), prices.rows[0]);
      }
    }

    let updated = 0;
    for (const quote of quotes.rows) {
      const price = priceMap.get(quote.oe_number.toUpperCase());
      if (price) {
        await db.execute(
          `UPDATE quotations SET unit_price = ?, currency = ?, supplier_name = ?, status = 'quoted', updated_at = datetime('now', 'localtime') WHERE id = ?`,
          [price.unit_price, price.currency, price.supplier_name, quote.id]
        );
        updated++;
      }
    }

    res.json({ success: true, message: `自动报价完成：${updated} 条成功，${quotes.rows.length - updated} 条未找到价格` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/quotations/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM quotations WHERE id = ?', [Number(req.params.id)]);
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/quotations/batch-delete
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要删除的记录' });
    }
    const placeholders = ids.map(() => '?').join(',');
    await db.execute(`DELETE FROM quotations WHERE id IN (${placeholders})`, ids);
    res.json({ success: true, message: `成功删除 ${ids.length} 条记录` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/quotations/import - Excel/CSV 导入报价需求
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: '请上传文件' });

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      return res.status(400).json({ success: false, message: '仅支持 .xlsx, .xls, .csv 格式' });
    }

    let rows = [];

    if (ext === 'csv') {
      const content = req.file.buffer.toString('utf-8');
      const lines = content.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return res.status(400).json({ success: false, message: 'CSV 文件至少需要表头和一行数据' });

      const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
      const headerIdx = {};
      headers.forEach((h, i) => {
        if (['oe_number', 'oe号', 'oe', 'oe_number'].includes(h)) headerIdx.oe = i;
        else if (h.includes('quantity') || h.includes('数量') || h.includes('qty')) headerIdx.qty = i;
        else if (h.includes('customer') || h.includes('客户') || h.includes('name')) headerIdx.customer = i;
        else if (h.includes('email') || h.includes('邮箱')) headerIdx.email = i;
        else if (h.includes('phone') || h.includes('电话') || h.includes('tel')) headerIdx.phone = i;
        else if (h.includes('company') || h.includes('公司')) headerIdx.company = i;
        else if (h.includes('remark') || h.includes('备注') || h.includes('note')) headerIdx.remark = i;
      });

      if (headerIdx.oe === undefined) {
        return res.status(400).json({ success: false, message: 'CSV 缺少 OE号 列（列名需包含 "oe_number"、"OE号" 或 "OE"）' });
      }

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (!cols[headerIdx.oe]?.trim()) continue;
        rows.push({
          oe_number: cols[headerIdx.oe]?.trim() || '',
          quantity: parseInt(cols[headerIdx.qty]) || 1,
          customer_name: cols[headerIdx.customer]?.trim() || '',
          customer_email: cols[headerIdx.email]?.trim() || '',
          customer_phone: cols[headerIdx.phone]?.trim() || '',
          customer_company: cols[headerIdx.company]?.trim() || '',
          remark: cols[headerIdx.remark]?.trim() || '',
        });
      }
    } else {
      const XLSX = require('xlsx');
      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (data.length === 0) return res.status(400).json({ success: false, message: 'Excel 文件无数据' });

      for (const row of data) {
        const oe = row.oe_number || row.OE号 || row.OE || row.oe || '';
        if (!oe) continue;
        rows.push({
          oe_number: String(oe).trim(),
          quantity: parseInt(row.quantity || row.数量 || row.qty || row.Qty || 1) || 1,
          customer_name: String(row.customer_name || row.客户 || row.customer || row.Customer || '').trim(),
          customer_email: String(row.customer_email || row.邮箱 || row.email || row.Email || '').trim(),
          customer_phone: String(row.customer_phone || row.电话 || row.phone || row.Phone || '').trim(),
          customer_company: String(row.customer_company || row.公司 || row.company || row.Company || '').trim(),
          remark: String(row.remark || row.备注 || row.Remark || row.note || '').trim(),
        });
      }
    }

    if (rows.length === 0) return res.status(400).json({ success: false, message: '未解析到有效数据' });

    // 预加载所有价格用于自动报价
    const oeNumbers = [...new Set(rows.map(r => r.oe_number))];
    const priceMap = new Map();
    for (const oe of oeNumbers) {
      const prices = await db.execute(
        `SELECT * FROM supplier_prices WHERE oe_number LIKE ? ORDER BY unit_price ASC LIMIT 1`,
        [`%${oe}%`]
      );
      if (prices.rows.length > 0) {
        priceMap.set(oe.toUpperCase(), prices.rows[0]);
      }
    }

    let success = 0;
    let priced = 0;
    for (const r of rows) {
      if (!r.oe_number) continue;
      try {
        const price = priceMap.get(r.oe_number.toUpperCase());
        const unitPrice = price ? price.unit_price : 0;
        const supplier = price ? price.supplier_name : '';
        const currency = price ? price.currency : 'USD';
        const quoteStatus = price ? 'quoted' : 'pending';

        await db.execute(
          `INSERT INTO quotations (source, customer_name, customer_email, customer_phone, customer_company, customer_id, oe_number, quantity, unit_price, currency, supplier_name, remark, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['internal', r.customer_name, r.customer_email, r.customer_phone, r.customer_company, await resolveCustomerId({ customer_name: r.customer_name, customer_email: r.customer_email, customer_phone: r.customer_phone, customer_company: r.customer_company, source: 'excel' }), r.oe_number, r.quantity, unitPrice, currency, supplier, r.remark, quoteStatus]
        );
        success++;
        if (price) priced++;
      } catch (e) {}
    }

    res.json({
      success: true,
      message: `导入完成：${success} 条成功（${priced} 条自动报价，${success - priced} 条待报价）`,
      data: { success, total: rows.length, priced }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}

module.exports = router;
