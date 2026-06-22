#!/usr/bin/env node
/**
 * 产品图片缩略图批处理脚本
 * 
 * 功能：从 Turso DB 查询所有产品图片，下载原图后用 Sharp 生成
 *       200w/400w/800w 缩略图，上传到 R2（跳过已存在的缩略图）。
 * 
 * 使用：node scripts/generate-thumbnails.mjs [--dry-run] [--limit N] [--offset N]
 *   --dry-run  仅列出，不实际生成
 *   --limit N   最多处理 N 张图
 *   --offset N  从第 N 张开始
 */

import { createClient } from '@libsql/client';
import sharp from 'sharp';
import { execSync } from 'child_process';
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import crypto from 'crypto';

// ── 配置（通过环境变量传入） ─────────────────────
const TURSO_URL = process.env.TURSO_URL || 'libsql://rbs-photo-album-cbaautoparts197-crypto.aws-ap-south-1.turso.io';
const TURSO_TOKEN = process.env.TURSO_TOKEN;
const BUCKET = process.env.R2_BUCKET || 'rbs-products';
const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const API_KEY = process.env.CF_API_KEY;
const EMAIL = process.env.CF_EMAIL;
const SITE_BASE = process.env.SITE_BASE || 'https://rbs-autoparts.com';
const TARGET_SIZES = [200, 400, 800];

if (!TURSO_TOKEN || !ACCOUNT_ID || !API_KEY || !EMAIL) {
  console.error('❌ Missing required env vars: TURSO_TOKEN, CF_ACCOUNT_ID, CF_API_KEY, CF_EMAIL');
  process.exit(1);
}

// Wrangler env
const WRANGLER_ENV = {
  CLOUDFLARE_API_KEY: API_KEY,
  CLOUDFLARE_EMAIL: EMAIL,
  CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
};

// ── CLI args ───────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN  = args.includes('--dry-run');
const LIMIT    = parseInt(args[args.indexOf('--limit') + 1] || '0') || Infinity;
const OFFSET   = parseInt(args[args.indexOf('--offset') + 1] || '0') || 0;

// ── Helpers ────────────────────────────────────────────
function envStr(obj) {
  return Object.entries(obj).map(([k, v]) => `${k}=${v}`).join(' ');
}

/** Retry a function with exponential backoff */
async function retry(fn, label, maxRetries = 5) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt === maxRetries) throw e;
      const delay = Math.min(2000 * Math.pow(2, attempt) + Math.random() * 1000, 30000);
      console.warn(`\n  ⚠️ ${label} failed (attempt ${attempt + 1}/${maxRetries}): ${e.message}. Retrying in ${(delay/1000).toFixed(1)}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

/** Check if thumbnail already exists on R2 via `wrangler r2 object get` (head) */
function thumbnailExists(thumbKey) {
  try {
    execSync(
      `npx wrangler r2 object get "${BUCKET}/${thumbKey}" --remote --no-verify 2>&1`,
      { env: { ...process.env, ...WRANGLER_ENV }, timeout: 15000, stdio: 'pipe' }
    );
    return true;
  } catch {
    return false;
  }
}

/** Upload a file to R2 with retry */
async function uploadToR2(key, filePath, contentType = 'image/webp', maxRetries = 3) {
  const cmd = `npx wrangler r2 object put "${BUCKET}/${key}" --file="${filePath}" --remote --content-type="${contentType}" --cache-control="public, max-age=31536000, immutable"`;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      execSync(cmd, { env: { ...process.env, ...WRANGLER_ENV }, timeout: 60000, stdio: 'pipe' });
      return;
    } catch (e) {
      if (attempt === maxRetries) throw e;
      const delay = 3000 * Math.pow(2, attempt);
      console.warn(`  ⚠️ R2 upload retry ${attempt + 1}/${maxRetries} in ${delay/1000}s`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

/** Generate thumbnail key: products/xxx/abc.webp → products/xxx/abc_400w.webp */
function thumbKey(originalKey, width) {
  const base = originalKey.replace(/\.[^.]+$/, '');
  return `${base}_${width}w.webp`;
}

/** Download image from live site with timeout */
async function downloadImage(key) {
  const url = `${SITE_BASE}/r2-files/${encodeURIComponent(key)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'RBS-ThumbnailGen/1.0' },
      signal: controller.signal
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
    return Buffer.from(await resp.arrayBuffer());
  } finally {
    clearTimeout(timeout);
  }
}

/** Generate sized thumbnails from buffer */
async function generateThumbs(buffer) {
  const results = {};
  for (const w of TARGET_SIZES) {
    const resized = await sharp(buffer)
      .resize(w, undefined, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    results[w] = resized;
  }
  return results;
}

// ── Main ──────────────────────────────────────────────
async function main() {
  console.log('🔧 Connecting to Turso...');
  const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

  // Collect all unique image keys from products + product_images
  console.log('📋 Querying product images...');
  const queryFn = async (sql) => retry(() => db.execute(sql), 'DB query', 5);
  
  const keys = new Set();

  const pRes = await queryFn("SELECT DISTINCT qiniu_key FROM products WHERE qiniu_key IS NOT NULL AND qiniu_key != '' ORDER BY qiniu_key");
  pRes.rows.forEach(r => keys.add(r.qiniu_key));

  try {
    const piRes = await queryFn("SELECT DISTINCT qiniu_key FROM product_images WHERE qiniu_key IS NOT NULL AND qiniu_key != '' ORDER BY qiniu_key");
    piRes.rows.forEach(r => keys.add(r.qiniu_key));
  } catch (e) {
    console.warn('⚠️  product_images 表可能不存在，跳过');
  }

  const keyList = Array.from(keys).slice(OFFSET, OFFSET + LIMIT);
  console.log(`📸 Found ${keys.size} unique images, processing ${keyList.length} (offset=${OFFSET}, limit=${LIMIT === Infinity ? 'all' : LIMIT})`);
  if (DRY_RUN) {
    console.log('🔍 DRY RUN — listing keys only:');
    keyList.forEach(k => console.log(`  ${k}`));
    await db.close();
    return;
  }

  let generated = 0, errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < keyList.length; i++) {
    const key = keyList[i];
    const pct = ((i + 1) / keyList.length * 100).toFixed(1);
    
    try {
      // Download original (with retry)
      process.stdout.write(`\n  ⬇ ${key}`);
      const buffer = await retry(() => downloadImage(key), `download ${key}`, 3);
      
      // Generate thumbnails
      process.stdout.write(` → resizing...`);
      const thumbs = await generateThumbs(buffer);
      
      // Upload thumbnails (overwrite if exists — no pre-check)
      let uploaded = 0;
      for (const w of TARGET_SIZES) {
        const tKey = thumbKey(key, w);
        const tmpFile = join(tmpdir(), `rbs_thumb_${w}_${crypto.randomBytes(4).toString('hex')}.webp`);
        writeFileSync(tmpFile, thumbs[w]);
        try {
          await uploadToR2(tKey, tmpFile);
          uploaded++;
          process.stdout.write(` ${w}w`);
        } finally {
          if (existsSync(tmpFile)) unlinkSync(tmpFile);
        }
      }
      
      generated++;
      if (uploaded === TARGET_SIZES.length) process.stdout.write(` ✅`);
      else process.stdout.write(` ⚠️`);
    } catch (e) {
      errors++;
      process.stdout.write(` ❌ ${e.message}`);
    }

    if (i % 10 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      process.stdout.write(`\n[${pct}%] ${i+1}/${keyList.length} — ${generated} generated, ${errors} errors (${elapsed}s)`);
    }

    // Rate limiting: 500ms between images to avoid flooding CDN
    await new Promise(r => setTimeout(r, 500));
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log(`\n\n✅ Done! ${generated} generated, ${errors} errors in ${totalTime}s`);
  await db.close();
}

main().catch(e => {
  console.error('💥 Fatal error:', e);
  process.exit(1);
});
