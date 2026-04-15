const qiniu = require('qiniu');

// 内存缓存
let _mac = null;
let _bucket = '';
let _domain = '';
let _region = 'z0';

async function refreshConfig() {
  try {
    const db = require('../db');
    const result = await db.execute('SELECT * FROM storage_settings WHERE id = 1');
    const row = result.rows[0];
    if (row && row.access_key && row.secret_key) {
      _mac = new qiniu.auth.digest.Mac(row.access_key, row.secret_key);
      _bucket = row.bucket || '';
      _domain = (row.domain || '').replace(/\/+$/, '');
      _region = row.region || 'z0';
    } else {
      const config = require('../config');
      if (config.qiniu.accessKey && config.qiniu.secretKey) {
        _mac = new qiniu.auth.digest.Mac(config.qiniu.accessKey, config.qiniu.secretKey);
      }
      _bucket = config.qiniu.bucket || '';
      _domain = config.qiniu.domain || '';
    }
  } catch (err) {
    console.warn('  七牛云配置刷新失败:', err.message);
  }
}

function ensureMac() {
  if (!_mac) throw new Error('七牛云未配置，请在后台设置中配置存储信息');
}

function getUploadToken(key) {
  ensureMac();
  const options = {
    scope: _bucket + ':' + key,
    deadline: Math.floor(Date.now() / 1000) + 3600,
  };
  const putPolicy = new qiniu.rs.PutPolicy(options);
  return putPolicy.uploadToken(_mac);
}

function getUploadTokenBatch() {
  ensureMac();
  const options = {
    scope: _bucket,
    deadline: Math.floor(Date.now() / 1000) + 7200,
    returnBody: '{"key":"$(key)","hash":"$(etag)","fsize":$(fsize)}',
  };
  const putPolicy = new qiniu.rs.PutPolicy(options);
  return putPolicy.uploadToken(_mac);
}

function uploadToQiniu(buffer, key, mimeType) {
  return new Promise((resolve, reject) => {
    ensureMac();
    const token = getUploadToken(key);

    const regionMap = {
      'z0': 'https://up.qiniup.com',
      'z1': 'https://up-z1.qiniup.com',
      'z2': 'https://up-z2.qiniup.com',
      'na0': 'https://up-na0.qiniup.com',
      'as0': 'https://up-as0.qiniup.com',
    };
    // 使用缓存的上传 URL
    const uploadURL = regionMap[_region] || 'https://up.qiniup.com';

    const formUploader = new qiniu.form_up.FormUploader({ uploadURL });
    const putExtra = new qiniu.form_up.PutExtra();
    if (mimeType) putExtra.mimeType = mimeType;

    formUploader.put(token, key, buffer, putExtra, (err, body, info) => {
      if (err) { reject(err); return; }
      if (info.statusCode === 200) resolve(body);
      else reject(new Error(`Upload failed: ${info.statusCode} - ${body}`));
    });
  });
}

function getFileUrl(key) {
  const encodedKey = encodeURIComponent(key);
  return `${_domain}/${encodedKey}`;
}

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

module.exports = {
  refreshConfig,
  getUploadToken,
  getUploadTokenBatch,
  uploadToQiniu,
  getFileUrl,
  deleteFromQiniu,
};
