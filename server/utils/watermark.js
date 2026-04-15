const config = require('../config');
const db = require('../db');

/**
 * 水印参数构建工具
 * 基于七牛云图片处理 API
 * 文档: https://developer.qiniu.com/dora/1316/image-watermarking-processing-watermark
 */

// 内存缓存，避免每次请求查库
let cachedSettings = null;

/**
 * 从数据库加载水印设置
 */
function loadSettings() {
  if (cachedSettings) return cachedSettings;
  const row = db.prepare('SELECT * FROM watermark_settings WHERE id = 1').get();
  if (row) {
    row.enabled = !!row.enabled;
    cachedSettings = row;
  }
  return row;
}

/**
 * 更新内存缓存
 */
function updateSettings(settings) {
  cachedSettings = settings;
}

/**
 * 清除缓存（设置变更时调用）
 */
function clearCache() {
  cachedSettings = null;
}

/**
 * 构建 Base64 编码的文字水印参数
 * 七牛云 text 参数需要 Base64URL 编码
 */
function base64UrlEncode(str) {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * 构建七牛云水印 URL 参数
 * @param {Object} settings - 水印设置对象
 * @returns {string} URL 参数字符串，如 "watermark/2/text/xxx/font/xxx/..."
 */
function buildParams(settings) {
  if (!settings || !settings.enabled) return '';

  // 颜色转换：rgba → 七牛格式
  // 七牛颜色格式：十六进制如 I0ZGRkZGRg==（Base64 编码的十六进制颜色）
  const fillColor = encodeColor(settings.fill_color || 'rgba(255,255,255,0.3)');

  if (settings.mode === 'image' && settings.image_url) {
    // 图片水印模式
    // 水印图片 URL 也需要 Base64URL 编码
    const encodedImage = base64UrlEncode(settings.image_url);
    let params = `watermark/1/image/${encodedImage}`;
    params += `/dissolve/${settings.dissolve || 70}`;
    params += `/gravity/${settings.gravity || 'SouthEast'}`;
    if (settings.dx) params += `/dx/${settings.dx}`;
    if (settings.dy) params += `/dy/${settings.dy}`;
    return params;
  }

  // 文字水印模式
  const text = settings.text || '';
  if (!text) return '';

  const encodedText = base64UrlEncode(text);
  const fontStr = (settings.font || 'sans-serif').replace(/ /g, '');
  const fontSize = settings.font_size || 24;

  let params = `watermark/2/text/${encodedText}/font/${base64UrlEncode(fontStr)}/fontsize/${fontSize}`;
  params += `/fill/${fillColor}`;
  params += `/dissolve/${settings.dissolve || 70}`;
  params += `/gravity/${settings.gravity || 'SouthEast'}`;
  if (settings.dx) params += `/dx/${settings.dx}`;
  if (settings.dy) params += `/dy/${settings.dy}`;

  return params;
}

/**
 * 将颜色值转换为七牛格式
 * 支持输入: "rgba(255,255,255,0.3)" / "#FFFFFF" / "white" 等
 * 输出: Base64URL 编码的十六进制颜色
 */
function encodeColor(colorStr) {
  let r = 255, g = 255, b = 255;

  // 解析 rgba(r,g,b,a) 格式
  const rgbaMatch = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbaMatch) {
    r = parseInt(rgbaMatch[1]);
    g = parseInt(rgbaMatch[2]);
    b = parseInt(rgbaMatch[3]);
  }
  // 解析 #RRGGBB 格式
  else if (colorStr.startsWith('#')) {
    const hex = colorStr.slice(1);
    if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
  }

  // 转为十六进制字符串
  const hexStr = r.toString(16).padStart(2, '0')
    + g.toString(16).padStart(2, '0')
    + b.toString(16).padStart(2, '0')
    .toUpperCase();

  return base64UrlEncode(hexStr);
}

/**
 * 为 URL 添加水印参数
 * @param {string} url - 原始图片 URL
 * @param {Object} [settings] - 水印设置（不传则自动加载）
 * @returns {string} 带水印参数的 URL
 */
function apply(url, settings) {
  if (!url) return url;
  if (!config.qiniu.domain) return url; // 未配置七牛云时不处理

  const s = settings || loadSettings();
  if (!s || !s.enabled) return url;

  // 只对七牛域名下的 URL 添加水印
  const domain = config.qiniu.domain.replace(/^https?:\/\//, '');
  if (!url.includes(domain)) return url;

  const params = buildParams(s);
  if (!params) return url;

  // 七牛云使用 | 分隔
  return `${url}|${params}`;
}

/**
 * 获取带水印的文件 URL
 * @param {string} key - 七牛云 key
 * @returns {string} 带水印的完整 URL（如水印启用）
 */
function getFileUrlWithWatermark(key) {
  const { getFileUrl } = require('./qiniu');
  const url = getFileUrl(key);
  return apply(url);
}

/**
 * 重置缓存（用于设置变更后）
 */
function reset() {
  clearCache();
}

module.exports = {
  loadSettings,
  updateSettings,
  clearCache,
  buildParams,
  encodeColor,
  apply,
  getFileUrlWithWatermark,
  reset,
};
