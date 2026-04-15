const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');

// 验证七牛云配置
if (!config.qiniu.accessKey || !config.qiniu.secretKey || !config.qiniu.bucket) {
  console.log('ℹ️  .env 中未检测到七牛云配置，可在后台「存储设置」中配置');
}

const app = express();

// 允许跨域的前端域名（Vercel 部署域名 + 本地开发）
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3001',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

// ==================== 中间件 ====================
app.use(cors({
  origin: (origin, callback) => {
    // 允许无 origin 的请求（如服务端调用）
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // 部署阶段暂允许所有来源
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件：前端打包产物
app.use(express.static(path.resolve(__dirname, '..', 'dist')));

// ==================== API 路由 ====================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/company', require('./routes/company'));
app.use('/api/watermark', require('./routes/watermark'));
app.use('/api/storage', require('./routes/storage'));

// ==================== 前端路由 fallback ====================
// 所有非 API / 静态文件请求返回 index.html（SPA 支持）
app.get('/{*splat}', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.resolve(__dirname, '..', 'dist', 'index.html'));
  }
});

// ==================== 启动 ====================
const PORT = config.port;
app.listen(PORT, () => {
  const db = require('./db');
  const storage = db.prepare('SELECT bucket, domain FROM storage_settings WHERE id = 1').get();
  console.log(`\n🚀 电子相册系统已启动`);
  console.log(`   后端 API: http://localhost:${PORT}/api`);
  console.log(`   前端页面: http://localhost:${PORT}`);
  console.log(`   七牛云: ${storage?.bucket || '未配置（请在后台存储设置中配置）'}`);
  console.log('');
});
