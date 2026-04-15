const express = require('express');
const router = express.Router();
const config = require('../config');

/**
 * POST /api/auth/login
 * 管理员登录验证
 */
router.post('/login', (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: '请输入密码' });
    }

    if (password === config.adminPassword) {
      // 生成简单 token（生产环境应使用 JWT）
      const token = Buffer.from(`admin:${Date.now()}`).toString('base64');
      res.json({ success: true, data: { token }, message: '登录成功' });
    } else {
      res.status(401).json({ success: false, message: '密码错误' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
