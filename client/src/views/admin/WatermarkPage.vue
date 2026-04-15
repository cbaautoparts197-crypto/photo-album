<template>
  <div class="watermark-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('watermark') }}</h1>
        <p class="page-desc">{{ t('watermarkDesc') }}</p>
      </div>
      <button
        class="save-btn"
        :class="{ saving }"
        :disabled="saving"
        @click="handleSave"
      >
        <svg v-if="!saving" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        <span v-if="saving" class="spin-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
        </span>
        {{ saving ? t('saving') : t('save') }}
      </button>
    </div>

    <div class="page-body" v-if="form">
      <!-- 左侧设置 -->
      <div class="settings-section">
        <!-- 启用开关 -->
        <div class="settings-card enable-card">
          <div class="enable-row">
            <div class="enable-info">
              <div class="enable-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div>
                <div class="enable-label">{{ t('watermarkEnabled') }}</div>
                <div class="enable-hint">{{ t('watermarkTip') }}</div>
              </div>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="form.enabled">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- 水印类型 -->
        <div class="settings-card" v-if="form.enabled">
          <div class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            {{ t('watermarkMode') }}
          </div>
          <div class="mode-switch">
            <button
              class="mode-btn"
              :class="{ active: form.mode === 'text' }"
              @click="form.mode = 'text'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
              {{ t('watermarkModeText') }}
            </button>
            <button
              class="mode-btn"
              :class="{ active: form.mode === 'image' }"
              @click="form.mode = 'image'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              {{ t('watermarkModeImage') }}
            </button>
          </div>
        </div>

        <!-- 文字水印设置 -->
        <template v-if="form.enabled && form.mode === 'text'">
          <div class="settings-card">
            <div class="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
              {{ t('watermarkText') }}
            </div>
            <input
              type="text"
              class="form-input"
              v-model="form.text"
              :placeholder="t('watermarkTextPlaceholder')"
            >
          </div>

          <div class="settings-card">
            <div class="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              {{ t('watermarkFont') }} & {{ t('watermarkFontSize') }}
            </div>
            <div class="form-grid form-grid-2">
              <div class="form-group">
                <label>{{ t('watermarkFont') }}</label>
                <select class="form-input" v-model="form.font">
                  <option value="sans-serif">sans-serif</option>
                  <option value="simhei">黑体 (SimHei)</option>
                  <option value="simsun">宋体 (SimSun)</option>
                  <option value="microsoftyahei">微软雅黑</option>
                  <option value="arial">Arial</option>
                  <option value="timesnewroman">Times New Roman</option>
                  <option value="georgia">Georgia</option>
                  <option value="couriernew">Courier New</option>
                </select>
              </div>
              <div class="form-group">
                <label>{{ t('watermarkFontSize') }}</label>
                <div class="range-row">
                  <input type="range" min="12" max="120" v-model.number="form.font_size" class="form-range">
                  <span class="range-value">{{ form.font_size }}px</span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 图片水印设置 -->
        <div class="settings-card" v-if="form.enabled && form.mode === 'image'">
          <div class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            {{ t('watermarkImage') }}
          </div>
          <input
            type="url"
            class="form-input"
            v-model="form.image_url"
            :placeholder="t('watermarkImagePlaceholder')"
          >
          <div class="input-hint">七牛云存储的图片 URL（需 URL 安全的 Base64 编码）</div>
        </div>

        <!-- 通用样式设置 -->
        <template v-if="form.enabled">
          <div class="settings-card">
            <div class="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
              {{ t('watermarkColor') }} & {{ t('watermarkDissolve') }}
            </div>
            <div class="form-grid form-grid-2">
              <div class="form-group">
                <label>{{ t('watermarkColor') }}</label>
                <div class="color-row">
                  <input type="color" v-model="colorHex" class="form-color" @input="onColorChange">
                  <input type="text" class="form-input color-input" :value="form.fill_color" readonly>
                </div>
              </div>
              <div class="form-group">
                <label>{{ t('watermarkDissolve') }}: {{ form.dissolve }}%</label>
                <input type="range" min="0" max="100" v-model.number="form.dissolve" class="form-range">
              </div>
            </div>
          </div>

          <div class="settings-card">
            <div class="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              {{ t('watermarkPosition') }}
            </div>
            <div class="position-grid">
              <button
                v-for="pos in positions"
                :key="pos.value"
                class="pos-btn"
                :class="{ active: form.gravity === pos.value }"
                @click="form.gravity = pos.value"
                :style="{ gridColumn: pos.col, gridRow: pos.row }"
              >
                {{ pos.label }}
              </button>
            </div>
            <div class="form-grid form-grid-2" style="margin-top: 16px;">
              <div class="form-group">
                <label>{{ t('watermarkOffsetX') }}</label>
                <div class="range-row">
                  <input type="range" min="0" max="500" v-model.number="form.dx" class="form-range">
                  <span class="range-value">{{ form.dx }}px</span>
                </div>
              </div>
              <div class="form-group">
                <label>{{ t('watermarkOffsetY') }}</label>
                <div class="range-row">
                  <input type="range" min="0" max="500" v-model.number="form.dy" class="form-range">
                  <span class="range-value">{{ form.dy }}px</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 右侧预览 -->
      <div class="preview-section" v-if="form.enabled">
        <div class="settings-card preview-card">
          <div class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            {{ t('watermarkPreview') }}
          </div>
          <div class="preview-box">
            <div class="preview-img-wrap">
              <img src="https://www.qiniu.com/resources/logo.png" alt="preview" class="preview-img" @error="previewError = true">
              <!-- CSS 模拟水印预览 -->
              <div
                class="watermark-overlay"
                v-if="!previewError && form.mode === 'text' && form.text"
                :style="watermarkOverlayStyle"
              >{{ form.text }}</div>
            </div>
            <div class="preview-desc">{{ t('watermarkPreviewDesc') }}</div>
          </div>

          <!-- 水印参数 -->
          <div class="params-box">
            <div class="params-title">七牛云参数 (Qiniu API)</div>
            <code class="params-code">{{ previewParams || '--' }}</code>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-else class="loading-wrap">
      <div class="loading-spinner"></div>
      <p>{{ t('loading') }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { getWatermarkSettings, updateWatermarkSettings } from '../../api/modules';

const { t } = useI18n();
const form = ref(null);
const saving = ref(false);
const previewError = ref(false);
const colorHex = ref('#FFFFFF');

const positions = computed(() => [
  { value: 'NorthWest', label: t('posNorthWest'), col: '1', row: '1' },
  { value: 'North', label: t('posNorth'), col: '2', row: '1' },
  { value: 'NorthEast', label: t('posNorthEast'), col: '3', row: '1' },
  { value: 'West', label: t('posWest'), col: '1', row: '2' },
  { value: 'Center', label: t('posCenter'), col: '2', row: '2' },
  { value: 'East', label: t('posEast'), col: '3', row: '2' },
  { value: 'SouthWest', label: t('posSouthWest'), col: '1', row: '3' },
  { value: 'South', label: t('posSouth'), col: '2', row: '3' },
  { value: 'SouthEast', label: t('posSouthEast'), col: '3', row: '3' },
]);

// 颜色位置映射（七牛 gravity → CSS）
const gravityToFlex = {
  NorthWest: 'flex-start', North: 'center', NorthEast: 'flex-end',
  West: 'flex-start', Center: 'center', East: 'flex-end',
  SouthWest: 'flex-start', South: 'center', SouthEast: 'flex-end',
};

const gravityToAlign = {
  NorthWest: 'flex-start', North: 'flex-start', NorthEast: 'flex-start',
  West: 'center', Center: 'center', East: 'center',
  SouthWest: 'flex-end', South: 'flex-end', SouthEast: 'flex-end',
};

const watermarkOverlayStyle = computed(() => {
  if (!form.value) return {};
  const g = form.value.gravity || 'SouthEast';
  const alpha = Math.round(((form.value.dissolve || 70) / 100) * 255).toString(16).padStart(2, '0');
  const hex = colorHex.value.replace('#', '');
  const fillColor = `#${hex}${alpha}`;
  return {
    color: fillColor,
    fontSize: Math.max(12, (form.value.font_size || 24) * 0.6) + 'px',
    justifyContent: gravityToFlex[g] || 'flex-end',
    alignItems: gravityToAlign[g] || 'flex-end',
    padding: `${(form.value.dy || 20) * 0.5}px ${(form.value.dx || 20) * 0.5}px`,
    fontFamily: form.value.font || 'sans-serif',
  };
});

const previewParams = computed(() => {
  if (!form.value || !form.value.enabled) return '';
  const f = form.value;
  if (f.mode === 'image' && f.image_url) {
    let p = `watermark/1/image/${btoa(f.image_url)}`;
    p += `/dissolve/${f.dissolve}`;
    p += `/gravity/${f.gravity}`;
    if (f.dx) p += `/dx/${f.dx}`;
    if (f.dy) p += `/dy/${f.dy}`;
    return p;
  }
  if (f.mode === 'text' && f.text) {
    const encodedText = btoa(unescape(encodeURIComponent(f.text)));
    const fontStr = (f.font || 'sans-serif').replace(/ /g, '');
    const encodedFont = btoa(fontStr);
    let p = `watermark/2/text/${encodedText}/font/${encodedFont}/fontsize/${f.font_size}`;
    p += `/fill/${btoa(colorHex.value.replace('#', '').toUpperCase())}`;
    p += `/dissolve/${f.dissolve}`;
    p += `/gravity/${f.gravity}`;
    if (f.dx) p += `/dx/${f.dx}`;
    if (f.dy) p += `/dy/${f.dy}`;
    return p;
  }
  return '';
});

function onColorChange(e) {
  const hex = e.target.value.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  form.value.fill_color = `rgba(${r},${g},${b},0.3)`;
}

function hexFromRgba(rgba) {
  const m = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) {
    return '#' + [m[1], m[2], m[3]].map(v => parseInt(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  return '#FFFFFF';
}

async function loadSettings() {
  try {
    const res = await getWatermarkSettings();
    if (res.data.success) {
      form.value = res.data.data;
      colorHex.value = hexFromRgba(form.value.fill_color || 'rgba(255,255,255,0.3)');
    }
  } catch (e) {
    console.error('加载水印设置失败:', e);
  }
}

async function handleSave() {
  if (!form.value) return;
  saving.value = true;
  try {
    const res = await updateWatermarkSettings({
      enabled: form.value.enabled ? 1 : 0,
      text: form.value.text,
      font: form.value.font,
      font_size: Number(form.value.font_size),
      fill_color: form.value.fill_color,
      dissolve: Number(form.value.dissolve),
      gravity: form.value.gravity,
      dx: Number(form.value.dx),
      dy: Number(form.value.dy),
      image_url: form.value.image_url,
      mode: form.value.mode,
    });
    if (res.data.success) {
      form.value = res.data.data;
      colorHex.value = hexFromRgba(form.value.fill_color || 'rgba(255,255,255,0.3)');
      showToast(t('saveSuccess'), 'success');
    }
  } catch (e) {
    showToast(t('error'), 'error');
  } finally {
    saving.value = false;
  }
}

function showToast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2000);
}

onMounted(loadSettings);
</script>

<style scoped>
.watermark-page {
  max-width: 1200px;
  margin: 0 auto;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--gray-900);
  margin: 0;
}

.page-desc {
  font-size: 14px;
  color: var(--gray-500);
  margin: 4px 0 0;
}

.save-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  border: none;
  border-radius: var(--radius);
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  font-family: inherit;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.save-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
}

.save-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

/* Layout */
.page-body {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 24px;
  align-items: start;
}

/* Cards */
.settings-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: 24px;
  border: 1px solid var(--gray-200);
  transition: var(--transition);
}

.settings-card + .settings-card {
  margin-top: 16px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--gray-800);
  margin-bottom: 16px;
}

.card-title svg {
  color: #3b82f6;
}

/* Enable Card */
.enable-card {
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  border-color: #bae6fd;
}

.enable-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.enable-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.enable-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius);
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.enable-label {
  font-size: 16px;
  font-weight: 600;
  color: var(--gray-800);
}

.enable-hint {
  font-size: 13px;
  color: var(--gray-500);
  margin-top: 2px;
}

/* Toggle */
.toggle {
  position: relative;
  width: 52px;
  height: 28px;
  flex-shrink: 0;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: var(--gray-300);
  border-radius: 28px;
  cursor: pointer;
  transition: 0.3s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 22px;
  height: 22px;
  left: 3px;
  top: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

.toggle input:checked + .toggle-slider {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.toggle input:checked + .toggle-slider::before {
  transform: translateX(24px);
}

/* Mode Switch */
.mode-switch {
  display: flex;
  gap: 8px;
}

.mode-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius);
  background: white;
  color: var(--gray-600);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  font-family: inherit;
}

.mode-btn:hover {
  border-color: #93c5fd;
  color: #2563eb;
}

.mode-btn.active {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #1d4ed8;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Form Elements */
.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--gray-300);
  border-radius: var(--radius);
  font-size: 14px;
  color: var(--gray-800);
  background: white;
  transition: var(--transition);
  font-family: inherit;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-grid {
  display: grid;
  gap: 16px;
}

.form-grid-2 {
  grid-template-columns: 1fr 1fr;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--gray-600);
  margin-bottom: 6px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.input-hint {
  font-size: 12px;
  color: var(--gray-400);
  margin-top: 6px;
}

/* Range */
.range-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.form-range {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--gray-200);
  border-radius: 3px;
  outline: none;
}

.form-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
}

.range-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--gray-600);
  min-width: 48px;
  text-align: right;
}

/* Color */
.color-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.form-color {
  width: 40px;
  height: 40px;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius);
  cursor: pointer;
  padding: 2px;
}

.color-input {
  flex: 1;
}

/* Position Grid */
.position-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  width: 100%;
}

.pos-btn {
  padding: 8px 4px;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius);
  background: white;
  font-size: 12px;
  font-weight: 500;
  color: var(--gray-600);
  cursor: pointer;
  transition: var(--transition);
  font-family: inherit;
}

.pos-btn:hover {
  border-color: #93c5fd;
  color: #2563eb;
}

.pos-btn.active {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #1d4ed8;
}

/* Preview */
.preview-section {
  position: sticky;
  top: 92px;
}

.preview-card {
  padding: 20px;
}

.preview-box {
  margin-top: 4px;
}

.preview-img-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  background: var(--gray-100);
  border-radius: var(--radius);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.watermark-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  pointer-events: none;
  font-weight: 700;
  text-shadow: 0 1px 4px rgba(0,0,0,0.1);
  word-break: break-all;
}

.preview-desc {
  font-size: 12px;
  color: var(--gray-400);
  text-align: center;
  margin-top: 8px;
}

.params-box {
  margin-top: 16px;
  padding: 12px;
  background: var(--gray-50);
  border-radius: var(--radius);
  border: 1px solid var(--gray-200);
}

.params-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--gray-400);
  margin-bottom: 6px;
}

.params-code {
  display: block;
  font-size: 12px;
  color: var(--gray-600);
  word-break: break-all;
  line-height: 1.5;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

/* Loading */
.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  color: var(--gray-400);
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--gray-200);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spin-icon {
  display: flex;
  animation: spin 0.8s linear infinite;
}

/* Toast */
.toast {
  position: fixed;
  top: 24px;
  right: 24px;
  padding: 12px 24px;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
  color: white;
  z-index: 9999;
  opacity: 0;
  transform: translateY(-8px);
  transition: 0.3s;
}

.toast.show {
  opacity: 1;
  transform: translateY(0);
}

.toast-success {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.toast-error {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

/* Responsive */
@media (max-width: 900px) {
  .page-body {
    grid-template-columns: 1fr;
  }
  .preview-section {
    position: static;
  }
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}

@media (max-width: 600px) {
  .form-grid-2 {
    grid-template-columns: 1fr;
  }
  .settings-card {
    padding: 16px;
  }
}
</style>
