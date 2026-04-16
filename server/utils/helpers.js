const path = require('path');

/**
 * 从文件名中解析出产品名称
 * 去除常见后缀（.jpg, .png 等）、OE 号前缀、尺寸信息等
 * 
 * 示例：
 *   "12345-ABC-500_front.jpg" → "12345-ABC-500_front"
 *   "Honda Civic Headlight Left.jpg" → "Honda Civic Headlight Left"
 *   "OE-81150-SDA-A03_brand new.png" → "OE-81150-SDA-A03_brand new"
 * 
 * @param {string} filename
 * @returns {string} 解析后的名称
 */
function parseFilename(filename) {
  // 取文件名（不含目录和扩展名）
  const ext = path.extname(filename);
  const name = path.basename(filename, ext);

  if (!name || name.trim() === '') return filename;

  // 替换常见分隔符为空格（保留连字符 -）
  let parsed = name
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 首字母大写（标题格式）
  parsed = parsed
    .split(' ')
    .map(word => {
      if (/^\d+$/.test(word)) return word; // 纯数字不处理
      if (/^\d+\.\d+$/.test(word)) return word; // 小数不处理
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

  return parsed;
}

/**
 * 生成七牛云存储 key
 * @param {string} originalName 原始文件名
 * @param {string} categoryPath 分类路径，如 "honda/civic"
 * @returns {string} 七牛云 key，如 "products/honda/civic/2024/01/abc123.jpg"
 */
function generateQiniuKey(originalName, categoryPath = '') {
  const now = new Date();
  const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  const uuid = require('crypto').randomBytes(8).toString('hex');
  const ext = path.extname(originalName).toLowerCase();
  const baseName = uuid + ext;

  if (categoryPath) {
    return `products/${categoryPath}/${datePath}/${baseName}`;
  }
  return `products/${datePath}/${baseName}`;
}

/**
 * 格式化文件大小
 * @param {number} bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

module.exports = {
  parseFilename,
  generateQiniuKey,
  formatFileSize,
};
