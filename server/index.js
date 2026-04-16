const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 修复 Turso 返回的 BigInt 无法被 JSON.stringify 序列化
if (typeof BigInt !== 'undefined') {
  BigInt.prototype.toJSON = function () { return Number(this); };
}

// API 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/company', require('./routes/company'));
app.use('/api/watermark', require('./routes/watermark'));
app.use('/api/storage', require('./routes/storage'));
app.use('/api/prices', require('./routes/prices'));
app.use('/api/inquiries', require('./routes/inquiries'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/news', require('./routes/news'));

// SEO: sitemap
app.use('/api/sitemap', require('./routes/sitemap'));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = app;

// 本地开发时启动服务器并初始化数据库
if (require.main === module) {
  (async () => {
    await db.initDatabase();
    const config = require('./config');
    const port = config.port || 3001;
    app.listen(port, () => {
      console.log(`  Server running on http://localhost:${port}`);
    });
  })();
}
