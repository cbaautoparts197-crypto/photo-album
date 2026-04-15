const qiniu = require('qiniu');
const db = require('../db');

// 内存缓存，避免每次操作都查库
let _mac = null;
let _bucket = '';
let _domain = '';

/**
 * 从数据库读取最新配置，刷新缓存
 */
function refreshConfig() {
  try {
    const row = db.prepare('SELECT * FROM storage_settings WHERE id = 1').get();
    if (row && row.access_key && row.secret_key) {
      _mac = new qiniu.auth.digest.Mac(row.access_key, row.secret_key);
      _bucket = row.bucket || '';
      _domain = (row.domain || '').replace(/\/+$/, '');
    } else {
      // 降级到 .env 配置
      const config = require('../config');
      if (config.qiniu.accessKey && config.qiniu.secretKey) {
        _mac = new qiniu.auth.digest.Mac(config.qiniu.accessKey, config.qiniu.secretKey);
      }
      _bucket = config.qiniu.bucket || '';
      _domain = config.qiniu.domain || '';
    }
    console.log('  七牛云配置已刷新:', _bucket || '未配置');
  } catch (err) {
    console.warn('  七牛云配置刷新失败:', err.message);
  }
}

/**
 * 确保 MAC 实例可用
 */
function ensureMac() {
  if (!_mac) refreshConfig();
  if (!_mac) throw new Error('七牛云未配置，请在后台设置中配置存储信息');
}

/**
 * 生成上传凭证
 * @param {string} key - 文件在七牛云的 key
 * @returns {string} uploadToken
 */
function getUploadToken(key) {
  ensureMac();
  const options = {
    scope: _bucket + ':' + key,
    deadline: Math.floor(Date.now() / 1000) + 3600, // 1小时有效
  };
  const putPolicy = new qiniu.rs.PutPolicy(options);
  return putPolicy.uploadToken(_mac);
}

/**
 * 生成上传凭证（覆盖上传，不指定 key）
 * @returns {string} uploadToken
 */
function getUploadTokenBatch() {
  ensureMac();
  const options = {
    scope: _bucket,
    deadline: Math.floor(Date.now() / 1000) + 7200, // 2小时有效，批量上传需要更长时间
    returnBody: '{"key":"$(key)","hash":"$(etag)","fsize":$(fsize)}',
  };
  const putPolicy = new qiniu.rs.PutPolicy(options);
  return putPolicy.uploadToken(_mac);
}

/**
 * 上传文件到七牛云（使用 form upload）
 * @param {Buffer} buffer - 文件 buffer
 * @param {string} key - 文件 key
 * @param {string} mimeType - MIME 类型
 * @returns {Promise<{key: string, hash: string, fsize: number}>}
 */
function uploadToQiniu(buffer, key, mimeType) {
  return new Promise((resolve, reject) => {
    ensureMac();
    const token = getUploadToken(key);

    // 根据区域选择上传节点
    const regionMap = {
      'z0': 'https://up.qiniup.com',      // 华东
      'z1': 'https://up-z1.qiniup.com',   // 华北
      'z2': 'https://up-z2.qiniup.com',   // 华南
      'na0': 'https://up-na0.qiniup.com', // 北美
      'as0': 'https://up-as0.qiniup.com', // 东南亚
    };
    const row = db.prepare('SELECT region FROM storage_settings WHERE id = 1').get();
    const region = row?.region || 'z0';
    const uploadURL = regionMap[region] || 'https://up.qiniup.com';

    const formUploader = new qiniu.form_up.FormUploader({ uploadURL });
    const putExtra = new qiniu.form_up.PutExtra();

    if (mimeType) {
      putExtra.mimeType = mimeType;
    }

    formUploader.put(token, key, buffer, putExtra, (err, body, info) => {
      if (err) {
        reject(err);
        return;
      }
      if (info.statusCode === 200) {
        resolve(body);
      } else {
        reject(new Error(`Upload failed: ${info.statusCode} - ${body}`));
      }
    });
  });
}

/**
 * 构建文件访问 URL
 * @param {string} key - 七牛云 key
 * @returns {string} 完整 URL
 */
function getFileUrl(key) {
  if (!_domain) refreshConfig();
  const encodedKey = encodeURIComponent(key);
  return `${_domain}/${encodedKey}`;
}

/**
 * 从七牛云删除文件
 * @param {string} key
 * @returns {Promise<void>}
 */
function deleteFromQiniu(key) {
  return new Promise((resolve, reject) => {
    ensureMac();
    const bucketManager = new qiniu.rs.BucketManager(_mac, null);
    bucketManager.delete(_bucket, key, (err, respBody, respInfo) => {
      if (err) reject(err);
      else if (respInfo.statusCode === 200) resolve();
      else reject(new Error(`Delete failed: ${respInfo.statusCode}`));
    });
  });
}

// 启动时加载一次配置
refreshConfig();

module.exports = {
  refreshConfig,
  getUploadToken,
  getUploadTokenBatch,
  uploadToQiniu,
  getFileUrl,
  deleteFromQiniu,
};
