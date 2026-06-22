#!/usr/bin/env node
/**
 * 产品图片缩略图批处理脚本（基于 R2 文件列表，不依赖 Turso）
 * 
 * 功能：列出 R2 bucket 所有对象 → 过滤出原始图片 → 生成 200w/400w/800w WebP 缩略图 → 上传 R2
 * 
 * 使用：node scripts/generate-thumbnails.mjs [--dry-run] [--limit N] [--offset N]
 *   --dry-run  仅列出，不实际生成
 *   --limit N   最多处理 N 张图
 *   --offset N  从第 N 张开始
 */

import { execSync } from 'child_process';
import sharp from 'sharp';
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import crypto from 'crypto';

// ── 配置（通过环境变量传入） ─────────────────────
const BUCKET = process.env.R2_BUCKET || 'rbs-products';
const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const API_KEY = process.env.CF_API_KEY;
const EMAIL = process.env.CF_EMAIL;
const SITE_BASE = process.env.SITE_BASE || 'https://rbs-autoparts.com';
const TARGET_SIZES = [200, 400, 800];

if (!ACCOUNT_ID || !API_KEY || !EMAIL) {
  console.error('❌ Missing required env vars: CF_ACCOUNT_ID, CF_API_KEY, CF_EMAIL');
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

/** Run wrangler JSON command with retry */
async function wranglerJSON(cmd, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const stdout = execSync(cmd, {
        env: { ...process.env, ...WRANGLER_ENV },
        timeout: 60000,
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf-8'
      });
      return JSON.parse(stdout);
    } catch (e) {
      if (attempt === maxRetries) {
        if (e.stdout) {
          try { return JSON.parse(e.stdout); } catch {}
        }
        throw e;
      }
      const delay = Math.min(2000 * Math.pow(2, attempt) + Math.random() * 1000, 10000);
      console.warn(`\n  ⚠️ wrangler failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${(delay/1000).toFixed(1)}s...`);
      await sleep(delay);
    }
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
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
      await sleep(delay);
    }
  }
}

/** Generate thumbnail key: products/xxx/abc.webp → products/xxx/abc_400w.webp */
function thumbKey(originalKey, width) {
  const base = originalKey.replace(/\.[^.]+$/, '');
  return `${base}_${width}w.webp`;
}

/** Extract base key from a thumbnail key */
function baseKeyFromThumb(key) {
  return key.replace(/_\d+w\.webp$/, '');
}

/** Is this key an existing thumbnail? */
function isThumbnailKey(key) {
  return /_\d+w\.webp$/.test(key);
}

/** Is this key a watermarked version? */
function isWatermarkKey(key) {
  return /watermark/i.test(key);
}

/** Is this an image file extension? */
function isImageFile(key) {
  return /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(key);
}

/** Download image from live site with retry + timeout */
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

/** List ALL objects from R2 bucket using pagination */
async function listAllObjects() {
  console.log('📋 Listing all objects in R2 bucket (this may take a minute)...');
  const allObjects = [];
  let cursor = null;
  let pageNum = 0;
  
  while (true) {
    pageNum++;
    const cursorArg = cursor ? `--cursor="${cursor}"` : '';
    const cmd = `npx wrangler r2 object list "${BUCKET}" --remote --json ${cursorArg} --per-page=1000`;
    
    try {
      const result = await wranglerJSON(cmd);
      const objects = result.result || result || [];
      if (objects.length > 0) {
        allObjects.push(...objects);
      }
      process.stdout.write(`\r  Page ${pageNum}: ${objects.length} objects, total: ${allObjects.length}`);
      
      cursor = result.truncated && objects.length > 0 ? objects[objects.length - 1].key : null;
      if (!cursor) break;
      
      // Rate limit between pages
      await sleep(200);
    } catch (e) {
      console.warn(`\n  ⚠️ List page ${pageNum} failed: ${e.message}`);
      break;
    }
  }
  
  console.log(`\n📊 Total R2 objects: ${allObjects.length}`);
  return allObjects;
}

// ── Main ──────────────────────────────────────────────
async function main() {
  // Step 1: List all R2 objects
  const allObjects = await listAllObjects();
  
  // Step 2: Filter to get unique original images
  // Strategy: collect all keys, then exclude watermarked + thumbnail keys
  const allKeys = allObjects.map(o => o.key);
  const thumbnailSet = new Set();
  const watermarkSet = new Set();
  const originalKeys = new Set();
  
  for (const key of allKeys) {
    if (isWatermarkKey(key)) {
      watermarkSet.add(key);
      continue;
    }
    if (isThumbnailKey(key)) {
      thumbnailSet.add(key);
      continue;
    }
    if (isImageFile(key)) {
      originalKeys.add(key);
    }
  }
  
  console.log(`\n📸 Analysis:`);
  console.log(`   Original images: ${originalKeys.size}`);
  console.log(`   Existing thumbnails: ${thumbnailSet.size}`);
  console.log(`   Watermarked copies: ${watermarkSet.size}`);
  
  // Step 3: Filter to keys that DO need thumbs generated
  // A key needs processing if at least one thumb size doesn't exist
  const needsProcessing = [];
  for (const key of originalKeys) {
    let missing = false;
    for (const w of TARGET_SIZES) {
      const tKey = thumbKey(key, w);
      if (!thumbnailSet.has(tKey)) {
        missing = true;
        break;
      }
    }
    if (missing) needsProcessing.push(key);
  }
  
  console.log(`   Need processing: ${needsProcessing.length} (missing >=1 thumbnail sizes)`);
  
  const keyList = needsProcessing.slice(OFFSET, OFFSET + LIMIT);
  console.log(`   This batch: ${keyList.length} (offset=${OFFSET}, limit=${LIMIT === Infinity ? 'all' : LIMIT})`);
  
  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN — listing keys only:');
    keyList.forEach(k => console.log(`  ${k}`));
    return;
  }
  
  if (keyList.length === 0) {
    console.log('✅ Nothing to do!');
    return;
  }

  // Step 4: Process each image
  let generated = 0, errors = 0, skipped = 0;
  const startTime = Date.now();

  for (let i = 0; i < keyList.length; i++) {
    const key = keyList[i];
    const pct = ((i + 1) / keyList.length * 100).toFixed(1);
    
    try {
      // Download original
      process.stdout.write(`\n  ⬇ ${key}`);
      let buffer;
      for (let attempt = 0; attempt <= 3; attempt++) {
        try {
          buffer = await downloadImage(key);
          break;
        } catch (e) {
          if (attempt === 3) throw e;
          const delay = Math.min(2000 * Math.pow(2, attempt), 10000);
          process.stdout.write(` [retry ${attempt+1}/3]`);
          await sleep(delay);
        }
      }
      
      // Generate thumbnails
      process.stdout.write(` → resizing...`);
      const thumbs = await generateThumbs(buffer);
      
      // Upload thumbnails
      let uploaded = 0;
      for (const w of TARGET_SIZES) {
        const tKey = thumbKey(key, w);
        
        // Skip if already exists (from a previous partial run)
        if (thumbnailSet.has(tKey)) {
          uploaded++;
          process.stdout.write(` ${w}w(✓)`);
          continue;
        }
        
        const tmpFile = join(tmpdir(), `rbs_thumb_${w}_${crypto.randomBytes(4).toString('hex')}.webp`);
        writeFileSync(tmpFile, thumbs[w]);
        try {
          await uploadToR2(tKey, tmpFile);
          thumbnailSet.add(tKey); // Track so we don't re-check
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
      process.stdout.write(`\n[${pct}%] ${i+1}/${keyList.length} — ${generated} gen, ${skipped} skip, ${errors} err (${elapsed}s)`);
    }

    // Rate limiting
    await sleep(500);
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log(`\n\n✅ Done! ${generated} generated, ${skipped} skipped, ${errors} errors in ${totalTime}s`);
}

main().catch(e => {
  console.error('💥 Fatal error:', e);
  process.exit(1);
});
