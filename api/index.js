// Vercel Serverless Function - API 入口
const app = require('../server/index.js');

// 数据库初始化（只执行一次）
let dbInitialized = false;

async function initDb() {
  if (dbInitialized) return;
  const dbModule = require('../server/db');
  if (dbModule.initDatabase) {
    await dbModule.initDatabase();
  }
  dbInitialized = true;
}

module.exports = async function handler(req, res) {
  await initDb();
  return app(req, res);
};
