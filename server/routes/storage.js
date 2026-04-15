const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/storage - 获取存储设置（AK/SK 脱敏）
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM storage_settings WHERE id = 1');
    const row = result.rows[0];
    if (!row) {
      return res.json({
        success: true,
        data: { access_key: '', secret_key: '', bucket: '', domain: '', region: 'z0' },
      });
    }
    const maskKey = (key) => {
      if (!key || key.length <= 4) return key ? '****' : '';
      return key.slice(0, 4) + '****' + key.slice(-4);
    };
    res.json({
      success: true,
      data: {
        access_key: maskKey(row.access_key),
        secret_key: maskKey(row.secret_key),
        bucket: row.bucket,
        domain: row.domain,
        region: row.region,
        has_config: !!(row.access_key && row.bucket),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/storage - 更新存储设置
router.put('/', authMiddleware, async (req, res) => {
  try {
    const { access_key, secret_key, bucket, domain, region } = req.body;
    const isMasked = (val) => typeof val === 'string' && val.includes('****');

    const sets = [];
    const params = [];

    if (!isMasked(access_key)) {
      sets.push('access_key = ?');
      params.push(access_key || '');
    }
    if (!isMasked(secret_key)) {
      sets.push('secret_key = ?');
      params.push(secret_key || '');
    }
    if (bucket !== undefined) {
      sets.push('bucket = ?');
      params.push(bucket || '');
    }
    if (domain !== undefined) {
      sets.push('domain = ?');
      params.push((domain || '').replace(/\/+$/, ''));
    }
    if (region !== undefined) {
      sets.push('region = ?');
      params.push(region || 'z0');
    }

    if (sets.length === 0) {
      return res.json({ success: false, message: '没有需要更新的字段' });
    }

    sets.push("updated_at = datetime('now', 'localtime')");
    params.push(1);

    await db.execute(`UPDATE storage_settings SET ${sets.join(', ')} WHERE id = ?`, params);

    const { refreshConfig } = require('../utils/qiniu');
    refreshConfig();

    res.json({ success: true, message: '存储设置已更新，七牛云配置已刷新' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/storage/test - 测试七牛云连接
router.post('/test', authMiddleware, async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM storage_settings WHERE id = 1');
    const row = result.rows[0];
    if (!row || !row.access_key || !row.secret_key || !row.bucket) {
      return res.json({
        success: false,
        message: '存储配置不完整，请先填写 Access Key、Secret Key 和 Bucket',
      });
    }

    const qiniu = require('qiniu');
    const mac = new qiniu.auth.digest.Mac(row.access_key, row.secret_key);
    const bucketManager = new qiniu.rs.BucketManager(mac, null);

    bucketManager.getBucketInfo(row.bucket, (err, respBody, respInfo) => {
      if (err) {
        res.json({ success: false, message: `连接失败: ${err.message}` });
        return;
      }
      if (respInfo.statusCode === 200) {
        const info = respBody;
        res.json({
          success: true,
          message: '连接成功！',
          data: { bucket: info.name || row.bucket, region: info.region || row.region, domain: row.domain || info.domain },
        });
      } else {
        res.json({ success: false, message: `连接失败 (HTTP ${respInfo.statusCode}): ${JSON.stringify(respBody)}` });
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/storage/status - 获取存储状态（无需认证）
router.get('/status', async (req, res) => {
  try {
    const result = await db.execute('SELECT bucket, domain FROM storage_settings WHERE id = 1');
    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        configured: !!(row && row.bucket && row.domain),
        bucket: row ? row.bucket : '',
        domain: row ? row.domain : '',
      },
    });
  } catch (err) {
    res.json({ success: true, data: { configured: false, bucket: '', domain: '' } });
  }
});

module.exports = router;
