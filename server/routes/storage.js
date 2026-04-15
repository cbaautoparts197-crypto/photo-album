const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const db = require('../db');

// GET /api/storage - 获取存储设置（AK/SK 脱敏）
router.get('/', authMiddleware, (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM storage_settings WHERE id = 1').get();
    if (!row) {
      return res.json({
        success: true,
        data: {
          access_key: '',
          secret_key: '',
          bucket: '',
          domain: '',
          region: 'z0',
        },
      });
    }
    // AK/SK 脱敏：只显示前4位 + ****
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
        // 标记是否有真实配置
        has_config: !!(row.access_key && row.bucket),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/storage - 更新存储设置
router.put('/', authMiddleware, (req, res) => {
  try {
    const { access_key, secret_key, bucket, domain, region } = req.body;

    // 如果传入了脱敏后的值（前4+****+后4），不更新
    const isMasked = (val) => typeof val === 'string' && val.includes('****');

    const updateAk = isMasked(access_key) ? undefined : access_key;
    const updateSk = isMasked(secret_key) ? undefined : secret_key;

    // 构建 SET 子句
    const sets = [];
    const params = [];

    if (updateAk !== undefined) {
      sets.push('access_key = ?');
      params.push(updateAk || '');
    }
    if (updateSk !== undefined) {
      sets.push('secret_key = ?');
      params.push(updateSk || '');
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
    params.push(1); // WHERE id = 1

    db.prepare(`UPDATE storage_settings SET ${sets.join(', ')} WHERE id = ?`).run(...params);

    // 刷新七牛云配置缓存
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
    const row = db.prepare('SELECT * FROM storage_settings WHERE id = 1').get();
    if (!row || !row.access_key || !row.secret_key || !row.bucket) {
      return res.json({
        success: false,
        message: '存储配置不完整，请先填写 Access Key、Secret Key 和 Bucket',
      });
    }

    const qiniu = require('qiniu');
    const mac = new qiniu.auth.digest.Mac(row.access_key, row.secret_key);
    const bucketManager = new qiniu.rs.BucketManager(mac, null);

    // 尝试获取 bucket 信息来验证连接
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
          data: {
            bucket: info.name || row.bucket,
            region: info.region || row.region,
            domain: row.domain || info.domain,
          },
        });
      } else {
        res.json({
          success: false,
          message: `连接失败 (HTTP ${respInfo.statusCode}): ${JSON.stringify(respBody)}`,
        });
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/storage/status - 获取存储状态（无需认证，供前端仪表盘使用）
router.get('/status', (req, res) => {
  try {
    const row = db.prepare('SELECT bucket, domain FROM storage_settings WHERE id = 1').get();
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
