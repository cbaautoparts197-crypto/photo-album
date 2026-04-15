<template>
  <div class="upload-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('upload') }}</h1>
        <p class="page-desc">{{ t('uploadHint') }}</p>
      </div>
    </div>

    <!-- Step 1: 选择分类 -->
    <div class="upload-step">
      <div class="step-header">
        <div class="step-number">1</div>
        <div>
          <h3 class="step-title">{{ t('selectCategory') }}</h3>
          <p class="step-desc">Choose the category for your images</p>
        </div>
      </div>
      <div class="step-body">
        <select v-model="selectedCategoryId" class="form-select category-select">
          <option value="">— {{ t('selectCategory') }} —</option>
          <option v-for="cat in flatCategories" :key="cat.id" :value="cat.id">{{ cat.label }}</option>
        </select>
      </div>
    </div>

    <!-- Step 2: 选择文件 -->
    <div class="upload-step">
      <div class="step-header">
        <div class="step-number">2</div>
        <div>
          <h3 class="step-title">{{ t('selectFiles') }}</h3>
          <p class="step-desc" v-if="fileList.length">{{ fileList.length }} / 200 {{ t('files') }} - {{ formatTotalSize() }}</p>
          <p class="step-desc" v-else>Drag & drop or click to select images</p>
        </div>
        <button v-if="fileList.length > 0" class="btn btn-outline btn-sm" @click="clearFiles" style="margin-left:auto;">
          {{ t('clearAll') }}
        </button>
      </div>
      <div class="step-body">
        <!-- 拖拽上传区域 -->
        <div
          class="drop-zone"
          :class="{ dragging: isDragging, 'has-files': fileList.length > 0 }"
          @click="triggerFileInput"
          @dragover.prevent="isDragging = true"
          @dragleave="isDragging = false"
          @drop.prevent="handleDrop"
        >
          <input
            ref="fileInput"
            type="file"
            multiple
            accept="image/*"
            style="display:none;"
            @change="handleFileSelect"
          />
          <div class="drop-content">
            <div class="drop-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <p class="drop-text">{{ t('dropOrClick') }}</p>
            <p class="drop-hint">{{ t('maxFiles') }}: 200</p>
          </div>
        </div>

        <!-- 文件预览列表 -->
        <div v-if="fileList.length > 0" class="file-list">
          <div class="file-grid">
            <div v-for="(file, idx) in fileList" :key="idx" class="file-item">
              <div class="file-thumb">
                <img :src="file.preview" alt="" />
                <button class="file-remove" @click="removeFile(idx)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div class="file-info">
                <span class="file-name" :title="file.parsedName">{{ file.parsedName }}</span>
                <span class="file-size">{{ formatSize(file.file.size) }}</span>
              </div>
              <input v-model="fileList[idx].customName" class="file-name-input" placeholder="产品名称" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 3: 开始上传 -->
    <div v-if="fileList.length > 0 && !uploading" class="upload-actions">
      <button
        class="btn btn-primary btn-lg upload-start-btn"
        :disabled="!selectedCategoryId"
        @click="startUpload"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        {{ t('startUpload') }} ({{ fileList.length }})
      </button>
    </div>

    <!-- 上传进度 -->
    <div v-if="uploading" class="upload-step upload-progress-step">
      <div class="step-header">
        <div class="step-number uploading">
          <div class="spinner-small"></div>
        </div>
        <div>
          <h3 class="step-title">{{ t('uploadProgress') }}</h3>
          <p class="step-desc">{{ uploadProgress.current }}/{{ uploadProgress.total }} ({{ Math.round(uploadProgress.current / uploadProgress.total * 100) }}%)</p>
        </div>
      </div>
      <div class="step-body">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: (uploadProgress.current / uploadProgress.total * 100) + '%' }"></div>
        </div>
        <div v-if="uploadProgress.currentFile" class="current-file">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
          {{ uploadProgress.currentFile }}
        </div>
        <!-- 错误日志 -->
        <div v-if="errors.length > 0" class="error-log">
          <div class="error-log-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            {{ t('errors') }} ({{ errors.length }})
          </div>
          <div v-for="(err, i) in errors" :key="i" class="error-item">
            {{ err.file }}: {{ err.message }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getCategoriesFlat, uploadImages } from '../../api/modules';

const { t } = useI18n();

const flatCategories = ref([]);
const selectedCategoryId = ref('');
const fileList = ref([]);
const fileInput = ref(null);
const isDragging = ref(false);
const uploading = ref(false);
const errors = ref([]);

const uploadProgress = ref({ current: 0, total: 0, currentFile: '' });

function parseFileName(name) {
  let base = name.replace(/\.[^.]+$/, '');
  base = base.replace(/[_\-\–\—]+/g, ' ');
  base = base.trim();
  return base;
}

function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

function formatTotalSize() {
  const total = fileList.value.reduce((sum, f) => sum + f.file.size, 0);
  return formatSize(total);
}

function triggerFileInput() {
  fileInput.value?.click();
}

function handleFileSelect(e) {
  addFiles(Array.from(e.target.files));
  e.target.value = '';
}

function handleDrop(e) {
  isDragging.value = false;
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  addFiles(files);
}

function addFiles(files) {
  const remaining = 200 - fileList.value.length;
  const toAdd = files.slice(0, remaining);
  toAdd.forEach(file => {
    const parsedName = parseFileName(file.name);
    fileList.value.push({
      file,
      preview: URL.createObjectURL(file),
      parsedName,
      customName: parsedName,
    });
  });
  if (files.length > remaining) {
    alert(`${t('maxFiles')} 200, ${t('truncated')} ${remaining}`);
  }
}

function removeFile(idx) {
  URL.revokeObjectURL(fileList.value[idx].preview);
  fileList.value.splice(idx, 1);
}

function clearFiles() {
  fileList.value.forEach(f => URL.revokeObjectURL(f.preview));
  fileList.value = [];
}

async function startUpload() {
  if (!selectedCategoryId.value || fileList.value.length === 0) return;

  uploading.value = true;
  errors.value = [];
  uploadProgress.value = { current: 0, total: fileList.value.length, currentFile: '' };

  try {
    const formData = new FormData();
    formData.append('category_id', selectedCategoryId.value);
    fileList.value.forEach(f => {
      formData.append('files', f.file);
      formData.append('names', f.customName || f.parsedName);
    });

    const res = await uploadImages(formData, (progress) => {
      uploadProgress.value = progress;
    });

    if (res.success) {
      const failed = res.data.failed || [];
      if (failed && failed.length > 0) {
        errors.value = failed.map(f => ({ file: f.filename, message: f.error }));
      }
      const successCount = fileList.value.length - errors.value.length;
      alert(`${t('uploadSuccess')}: ${successCount}/${fileList.value.length}`);
      clearFiles();
      selectedCategoryId.value = '';
    } else {
      errors.value = [{ file: '-', message: res.message }];
    }
  } catch (e) {
    errors.value = [{ file: '-', message: e.message || 'Network Error' }];
  }

  uploading.value = false;
}

onMounted(async () => {
  try {
    const res = await getCategoriesFlat();
    if (res.success) flatCategories.value = res.data;
  } catch (e) {}
});
</script>

<style scoped>
.page-header {
  margin-bottom: 28px;
}

.page-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--gray-900);
  letter-spacing: -0.02em;
  margin-bottom: 4px;
}

.page-desc {
  font-size: 14px;
  color: var(--gray-400);
}

/* Step Card */
.upload-step {
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  margin-bottom: 20px;
  overflow: hidden;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--gray-100);
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--primary-50);
  color: var(--primary-light);
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-number.uploading {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.step-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--gray-800);
}

.step-desc {
  font-size: 13px;
  color: var(--gray-400);
  margin-top: 2px;
}

.step-body {
  padding: 24px;
}

/* Category Select */
.category-select {
  max-width: 400px;
}

/* Drop Zone */
.drop-zone {
  border: 2px dashed var(--gray-300);
  border-radius: var(--radius-lg);
  padding: 48px 20px;
  text-align: center;
  cursor: pointer;
  transition: var(--transition);
  background: var(--gray-50);
}

.drop-zone:hover {
  border-color: var(--primary-light);
  background: #eff6ff;
}

.drop-zone.dragging {
  border-color: var(--primary-light);
  background: #dbeafe;
  transform: scale(1.01);
}

.drop-zone.has-files {
  padding: 24px;
}

.drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.drop-icon {
  color: var(--gray-400);
  margin-bottom: 4px;
}

.drop-text {
  font-size: 15px;
  font-weight: 500;
  color: var(--gray-600);
}

.drop-hint {
  font-size: 13px;
  color: var(--gray-400);
}

/* File Grid */
.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  max-height: 500px;
  overflow-y: auto;
  padding: 4px;
}

.file-item {
  background: white;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--gray-200);
  transition: var(--transition);
}

.file-item:hover {
  border-color: var(--gray-300);
  box-shadow: var(--shadow-sm);
}

.file-thumb {
  width: 100%;
  height: 140px;
  position: relative;
  overflow: hidden;
  background: var(--gray-100);
}

.file-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-remove {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  background: rgba(0,0,0,0.6);
  color: white;
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: var(--transition);
  backdrop-filter: blur(4px);
}

.file-thumb:hover .file-remove {
  opacity: 1;
}

.file-info {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-name {
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--gray-700);
}

.file-size {
  font-size: 11px;
  color: var(--gray-400);
}

.file-name-input {
  width: 100%;
  padding: 6px 10px;
  border-top: 1px solid var(--gray-100);
  border-left: none;
  border-right: none;
  border-bottom: none;
  font-size: 12px;
  color: var(--gray-600);
  background: var(--gray-50);
  font-family: inherit;
}

.file-name-input:focus {
  outline: none;
  background: #eff6ff;
}

/* Upload Actions */
.upload-actions {
  text-align: center;
  margin-bottom: 24px;
}

.upload-start-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 40px !important;
  font-size: 15px;
}

/* Progress */
.progress-bar {
  height: 10px;
  background: var(--gray-200);
  border-radius: 99px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  transition: width 0.3s ease;
  border-radius: 99px;
}

.current-file {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 13px;
  color: var(--gray-500);
  padding: 8px 12px;
  background: var(--gray-50);
  border-radius: var(--radius);
}

.error-log {
  margin-top: 16px;
  padding: 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius);
}

.error-log-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #dc2626;
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 10px;
}

.error-item {
  font-size: 12px;
  color: #b91c1c;
  padding: 4px 0;
  border-bottom: 1px solid #fecaca;
}

.error-item:last-child {
  border-bottom: none;
}

@media (max-width: 768px) {
  .file-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
  .file-thumb { height: 100px; }
  .step-header { padding: 16px; }
  .step-body { padding: 16px; }
}
</style>
