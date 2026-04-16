const qiniu = require('qiniu');

// 内存缓存
let _mac = null;
let _accessKey = '';
let _secretKey = '';
let _bucket = '';
let _domain = '';
let _region = 'z0';

async function refreshConfig() {
  try {
    const db = require('../db');
    console.log('[qiniu] refreshConfig: reading from storage_settings...');
    const result = await db.execute('SELECT * FROM storage_settings WHERE id = 1');
    const row = result.rows[0];
    if (row && row.access_key && row.secret_key) {
      _mac = new qiniu.auth.digest.Mac(row.access_key, row.secret_key);
      _accessKey = row.access_key;
      _secretKey = row.secret_key;
      _bucket = row.bucket || '';
      _domain = (row.domain || '').replace(/\/+$/, '');
      _region = row.region || 'z0';
      console.log('[qiniu] refreshConfig: OK, bucket =', _bucket, ', domain =', _domain, ', region =', _region);
    } else {
      console.log('[qiniu] refreshConfig: no config found');
    }
  } catch (err) {
    console.error('[qiniu] refreshConfig FAILED:', err.message);
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

// Region → upload URL mapping
const regionMap = {
  'z0': 'https://up.qiniup.com',
  'z1': 'https://up-z1.qiniup.com',
  'z2': 'https://up-z2.qiniup.com',
  'na0': 'https://up-na0.qiniup.com',
  'as0': 'https://up-as0.qiniup.com',
  'cn-east-2': 'https://up-cn-east-2.qiniup.com',
  'ap-northeast-1': 'https://up-ap-northeast-1.qiniup.com',
};

function uploadToQiniu(buffer, key, mimeType) {
  ensureMac();

  const token = getUploadToken(key);
  const uploadURL = regionMap[_region] || 'https://up.qiniup.com';

  // Use native fetch to avoid qiniu SDK's internal getRegionsProvider issue
  const FormData = require('form-data');
  const form = new FormData();
  form.append('token', token);
  form.append('key', key);
  form.append('file', buffer, {
    filename: key.split('/').pop(),
    contentType: mimeType || 'application/octet-stream',
  });

  return new Promise((resolve, reject) => {
    form.submit(uploadURL, (err, response) => {
      if (err) return reject(err);

      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`Upload failed (${response.statusCode}): ${data}`));
        }
      });
      response.on('error', reject);
    });
  });
}

function getFileUrl(key) {
  const encodedKey = encodeURIComponent(key);
  return `${_domain}/${encodedKey}`;
}

function deleteFromQiniu(key) {
  ensureMac();
  const bucketManager = new qiniu.rs.BucketManager(_mac, null);
  return new Promise((resolve, reject) => {
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
