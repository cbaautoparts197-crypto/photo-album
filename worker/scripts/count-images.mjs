#!/usr/bin/env node
/**
 * 查询 Turso DB 中图片总数，输出 GitHub Actions matrix JSON。
 * 用法：node scripts/count-images.mjs [chunk_size]
 */
import { createClient } from '@libsql/client';

const chunkSize = parseInt(process.argv[2] || '200');

const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});

const keys = new Set();

const pRes = await db.execute(
  "SELECT DISTINCT qiniu_key FROM products WHERE qiniu_key IS NOT NULL AND qiniu_key != ''"
);
pRes.rows.forEach(r => keys.add(r.qiniu_key));

try {
  const piRes = await db.execute(
    "SELECT DISTINCT qiniu_key FROM product_images WHERE qiniu_key IS NOT NULL AND qiniu_key != ''"
  );
  piRes.rows.forEach(r => keys.add(r.qiniu_key));
} catch {}

const total = keys.size;
const chunks = Math.ceil(total / chunkSize);

// Generate matrix array
const matrix = Array.from({ length: chunks }, (_, i) => i);

console.log(`total=${total}`);
console.log(`matrix=${JSON.stringify(matrix)}`);

await db.close();
