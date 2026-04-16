const express = require('express');
const multer = require('multer');
const router = express.Router();
const db = require('../db');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ==================== 供应商价格 CRUD ====================

// GET /api/prices - 价格列表（支持分页、OE号搜索、供应商筛选）
router.get('/', async (req, res) => {
  try {
    const { oe_number, supplier, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let where = '1=1';
    const params = [];

    if (oe_number) {
      where += ' AND oe_number LIKE ?';
      params.push(`%${oe_number}%`);
    }
    if (supplier) {
      where += ' AND supplier_name LIKE ?';
      params.push(`%${supplier}%`);
    }

    const countResult = await db.execute(`SELECT COUNT(*) as total FROM supplier_prices WHERE ${where}`, params);
    const total = countResult.rows[0].total;

    const rowsResult = await db.execute(
      `SELECT * FROM supplier_prices WHERE ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    res.json({
      success: true,
      data: {
        items: rowsResult.rows,
        pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/prices/by-oe/:oe - 按 OE 号获取价格列表（前端不调用，仅后台用）
router.get('/by-oe/:oe', async (req, res) => {
  try {
    const result = await db.execute(
      'SELECT * FROM supplier_prices WHERE oe_number LIKE ? ORDER BY unit_price ASC',
      [`%${req.params.oe}%`]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/prices/by-product-name - 根据产品名称查询价格（OE号包含在产品名中）
router.get('/by-product-name', async (req, res) => {
  try {
    const { productName } = req.query;
    if (!productName) {
      return res.status(400).json({ success: false, message: '产品名称不能为空' });
    }
    // 直接在 SQL 中做子串匹配，避免全表扫描 + JS 过滤
    const result = await db.execute(
      `SELECT * FROM supplier_prices
       WHERE UPPER(?) LIKE '%' || UPPER(oe_number) || '%'
       ORDER BY unit_price ASC`,
      [productName]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/prices - 新增价格
router.post('/', async (req, res) => {
  try {
    const { oe_number, supplier_name, unit_price, currency, moq, lead_time, remark } = req.body;
    if (!oe_number || !supplier_name) {
      return res.status(400).json({ success: false, message: 'OE号和供应商名称不能为空' });
    }
    await db.execute(
      `INSERT INTO supplier_prices (oe_number, supplier_name, unit_price, currency, moq, lead_time, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [oe_number, supplier_name, unit_price || 0, currency || 'USD', moq || 1, lead_time || '', remark || '']
    );
    const idResult = await db.execute('SELECT last_insert_rowid() as id');
    res.json({ success: true, id: idResult.rows[0].id, message: '价格添加成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/prices/:id - 更新价格
router.put('/:id', async (req, res) => {
  try {
    const { oe_number, supplier_name, unit_price, currency, moq, lead_time, remark } = req.body;
    const id = req.params.id;
    const sets = [];
    const params = [];

    if (oe_number !== undefined) { sets.push('oe_number = ?'); params.push(String(oe_number)); }
    if (supplier_name !== undefined) { sets.push('supplier_name = ?'); params.push(String(supplier_name)); }
    if (unit_price !== undefined) { sets.push('unit_price = ?'); params.push(Number(unit_price)); }
    if (currency !== undefined) { sets.push('currency = ?'); params.push(String(currency)); }
    if (moq !== undefined) { sets.push('moq = ?'); params.push(Number(moq)); }
    if (lead_time !== undefined) { sets.push('lead_time = ?'); params.push(String(lead_time)); }
    if (remark !== undefined) { sets.push('remark = ?'); params.push(String(remark)); }

    if (sets.length === 0) return res.status(400).json({ success: false, message: '没有需要更新的字段' });

    sets.push("updated_at = datetime('now', 'localtime')");
    params.push(Number(id));
    await db.execute(`UPDATE supplier_prices SET ${sets.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/prices/:id - 删除价格
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM supplier_prices WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/prices/batch-delete - 批量删除
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要删除的记录' });
    }
    const placeholders = ids.map(() => '?').join(',');
    await db.execute(`DELETE FROM supplier_prices WHERE id IN (${placeholders})`, ids);
    res.json({ success: true, message: `成功删除 ${ids.length} 条记录` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/prices/import - Excel/CSV 导入
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: '请上传文件' });

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv']) {
      return res.status(400).json({ success: false, message: '仅支持 .xlsx, .xls, .csv 格式' });
    }

    let rows = [];

    if (ext === 'csv') {
      // 简易 CSV 解析（用 Buffer 转 string，支持中文）
      const content = req.file.buffer.toString('utf-8');
      const lines = content.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return res.status(400).json({ success: false, message: 'CSV 文件至少需要表头和一行数据' });

      const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
      const requiredHeaders = ['oe_number', 'oe号', 'oe'];
      const headerIdx = {};
      headers.forEach((h, i) => {
        if (requiredHeaders.includes(h)) headerIdx.oe = i;
        else if (h.includes('supplier') || h.includes('供应商')) headerIdx.supplier = i;
        else if (h.includes('price') || h.includes('价格') || h.includes('单价')) headerIdx.price = i;
        else if (h.includes('currency') || h.includes('币种') || h.includes('货币')) headerIdx.currency = i;
        else if (h.includes('moq') || h.includes('起订') || h.includes('最小')) headerIdx.moq = i;
        else if (h.includes('lead') || h.includes('交货') || h.includes('delivery')) headerIdx.lead = i;
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
          supplier_name: cols[headerIdx.supplier]?.trim() || '',
          unit_price: parseFloat(cols[headerIdx.price]) || 0,
          currency: cols[headerIdx.currency]?.trim() || 'USD',
          moq: parseInt(cols[headerIdx.moq]) || 1,
          lead_time: cols[headerIdx.lead]?.trim() || '',
          remark: cols[headerIdx.remark]?.trim() || '',
        });
      }
    } else {
      // Excel 解析
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
          supplier_name: String(row.supplier_name || row.供应商 || row.supplier || row.Supplier || '').trim(),
          unit_price: parseFloat(row.unit_price || row.单价 || row.price || row.Price || row.价格 || 0) || 0,
          currency: String(row.currency || row.币种 || row.Currency || 'USD').trim(),
          moq: parseInt(row.moq || row.MOQ || row.最小起订量 || row.起订量 || 1) || 1,
          lead_time: String(row.lead_time || row.交货期 || row.Lead_Time || row.delivery || '').trim(),
          remark: String(row.remark || row.备注 || row.Remark || row.note || '').trim(),
        });
      }
    }

    if (rows.length === 0) return res.status(400).json({ success: false, message: '未解析到有效数据' });

    // 批量插入
    let success = 0;
    for (const r of rows) {
      if (!r.oe_number) continue;
      try {
        await db.execute(
          `INSERT INTO supplier_prices (oe_number, supplier_name, unit_price, currency, moq, lead_time, remark)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [r.oe_number, r.supplier_name, r.unit_price, r.currency, r.moq, r.lead_time, r.remark]
        );
        success++;
      } catch (e) {}
    }

    res.json({ success: true, message: `导入完成: ${success} 成功, ${rows.length - success} 失败`, data: { success, total: rows.length } });
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
