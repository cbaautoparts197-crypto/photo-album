const express = require('express');
const router = express.Router();
const db = require('../db');

// ==================== Suppliers CRUD ====================

// GET /api/suppliers - 供应商列表
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, keyword } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let where = '1=1';
    const params = [];
    if (keyword) {
      where += ' AND (name LIKE ? OR contact_person LIKE ? OR car_models LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }
    const count = await db.execute(`SELECT COUNT(*) as total FROM suppliers WHERE ${where}`, params);
    const rows = await db.execute(
      `SELECT * FROM suppliers WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );
    res.json({ success: true, data: rows.rows, pagination: { total: count.rows[0].total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/suppliers/:id
router.get('/:id', async (req, res) => {
  try {
    const rows = await db.execute('SELECT * FROM suppliers WHERE id = ?', [Number(req.params.id)]);
    if (!rows.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: rows.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/suppliers - 新增供应商
router.post('/', async (req, res) => {
  try {
    const { name, bank_account_name, bank_card_number, bank_name, contact_person, contact_phone, car_models, factory_catalogs } = req.body;
    const result = await db.execute(
      `INSERT INTO suppliers (name, bank_account_name, bank_card_number, bank_name, contact_person, contact_phone, car_models, factory_catalogs) VALUES (?,?,?,?,?,?,?,?)`,
      [name || '', bank_account_name || '', bank_card_number || '', bank_name || '', contact_person || '', contact_phone || '', car_models || '', typeof factory_catalogs === 'string' ? factory_catalogs : JSON.stringify(factory_catalogs || [])]
    );
    res.json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/suppliers/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, bank_account_name, bank_card_number, bank_name, contact_person, contact_phone, car_models, factory_catalogs } = req.body;
    await db.execute(
      `UPDATE suppliers SET name=?, bank_account_name=?, bank_card_number=?, bank_name=?, contact_person=?, contact_phone=?, car_models=?, factory_catalogs=?, updated_at=datetime('now','localtime') WHERE id=?`,
      [name || '', bank_account_name || '', bank_card_number || '', bank_name || '', contact_person || '', contact_phone || '', car_models || '', typeof factory_catalogs === 'string' ? factory_catalogs : JSON.stringify(factory_catalogs || []), Number(req.params.id)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/suppliers/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM suppliers WHERE id = ?', [Number(req.params.id)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/suppliers/batch-delete
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.json({ success: true, message: '无删除项' });
    const placeholders = ids.map(() => '?').join(',');
    await db.execute(`DELETE FROM suppliers WHERE id IN (${placeholders})`, ids);
    res.json({ success: true, message: `删除 ${ids.length} 条` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
