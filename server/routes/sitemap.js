const express = require('express');
const router = express.Router();

const SITE_URL = 'https://www.rbs-autoparts.com';

// GET /api/sitemap - 生成动态 sitemap.xml（供外部访问）
router.get('/', async (req, res) => {
  try {
    const db = require('../db');
    const urls = [];

    // 1. 静态页面
    const now = new Date().toISOString().split('T')[0];
    urls.push(
      { loc: '/', changefreq: 'daily', priority: '1.0', lastmod: now },
      { loc: '/products', changefreq: 'daily', priority: '0.9', lastmod: now },
      { loc: '/about', changefreq: 'monthly', priority: '0.7', lastmod: now },
    );

    // 2. 分类页面
    const catResult = await db.execute('SELECT id, parent_id, name_en, sort_order FROM categories WHERE parent_id IS NULL ORDER BY sort_order ASC');
    catResult.rows.forEach(cat => {
      urls.push({
        loc: `/products?category=${cat.id}`,
        changefreq: 'weekly',
        priority: '0.8',
        lastmod: now,
      });
    });

    // 3. 产品页面
    const prodResult = await db.execute('SELECT id, name, created_at FROM products ORDER BY created_at DESC');
    prodResult.rows.forEach(prod => {
      const slug = slugify(prod.name);
      urls.push({
        loc: `/product/${prod.id}/${slug}`,
        changefreq: 'monthly',
        priority: '0.6',
        lastmod: (prod.created_at || now).split(' ')[0],
      });
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${SITE_URL}${escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    res.status(500).type('text/plain').send('Error generating sitemap');
  }
});

// GET /api/sitemap/robots - 生成 robots.txt
router.get('/robots', async (req, res) => {
  const robots = `User-agent: *
Allow: /
Sitemap: ${SITE_URL}/api/sitemap

# Disallow admin pages
Disallow: /admin/
`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(robots);
});

function slugify(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = router;
