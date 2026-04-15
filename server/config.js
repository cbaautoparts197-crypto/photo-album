const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

module.exports = {
  port: process.env.PORT || 3001,
  // 七牛云
  qiniu: {
    accessKey: process.env.QINIU_ACCESS_KEY,
    secretKey: process.env.QINIU_SECRET_KEY,
    bucket: process.env.QINIU_BUCKET,
    domain: (process.env.QINIU_DOMAIN || '').replace(/\/+$/, ''),
  },
  // 上传
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  // 管理员
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  // 前端地址（用于 CORS，部署到 Vercel 后设置此环境变量）
  frontendUrl: process.env.FRONTEND_URL || '',
};
