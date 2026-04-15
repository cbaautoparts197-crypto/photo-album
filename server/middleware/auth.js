const config = require('../config');

/**
 * 简单 token 验证中间件
 */
function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ success: false, message: '未登录' });
  }

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    if (!decoded.startsWith('admin:')) {
      return res.status(401).json({ success: false, message: '无效的凭证' });
    }
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: '凭证无效' });
  }
}

module.exports = authMiddleware;
