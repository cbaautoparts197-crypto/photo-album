const config = require('../config');

/**
 * 水印参数构建工具
 * 基于七牛云图片处理 API
 */

// 内存缓存
let cachedSettings = null;

function updateSettings(settings) {
  cachedSettings = settings;
}

function clearCache() {
  cachedSettings = null;
}

function base64UrlEncode(str) {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function buildParams(settings) {
  if (!settings || !settings.enabled) return '';

  const fillColor = encodeColor(settings.fill_color || 'rgba(255,255,255,0.3)');

  if (settings.mode === 'image' && settings.image_url) {
    const encodedImage = base64UrlEncode(settings.image_url);
    let params = `watermark/1/image/${encodedImage}`;
    params += `/dissolve/${settings.dissolve || 70}`;
    params += `/gravity/${settings.gravity || 'SouthEast'}`;
    if (settings.dx) params += `/dx/${settings.dx}`;
    if (settings.dy) params += `/dy/${settings.dy}`;
    return params;
  }

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

function encodeColor(colorStr) {
  let r = 255, g = 255, b = 255;

  const rgbaMatch = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbaMatch) {
    r = parseInt(rgbaMatch[1]);
    g = parseInt(rgbaMatch[2]);
    b = parseInt(rgbaMatch[3]);
  } else if (colorStr.startsWith('#')) {
    const hex = colorStr.slice(1);
    if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
  }

  const hexStr = r.toString(16).padStart(2, '0')
    + g.toString(16).padStart(2, '0')
    + b.toString(16).padStart(2, '0')
    .toUpperCase();

  return base64UrlEncode(hexStr);
}

function apply(url, settings) {
  if (!url) return url;
  if (!config.qiniu.domain) return url;

  const s = settings || cachedSettings;
  if (!s || !s.enabled) return url;

  const domain = config.qiniu.domain.replace(/^https?:\/\//, '');
  if (!url.includes(domain)) return url;

  const params = buildParams(s);
  if (!params) return url;

  return `${url}|${params}`;
}

module.exports = {
  updateSettings,
  clearCache,
  buildParams,
  encodeColor,
  apply,
};
