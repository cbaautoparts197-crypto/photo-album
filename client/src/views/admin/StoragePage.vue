<template>
  <div class="storage-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('storageSettings') }}</h1>
        <p class="page-desc">{{ t('storageDesc') }}</p>
      </div>
      <button class="btn-test" :class="{ testing: testing }" @click="doTest">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        {{ testing ? t('testing') : t('testConnection') }}
      </button>
    </div>

    <!-- Status Banner -->
    <div :class="['status-banner', testResult ? (testResult.success ? 'status-ok' : 'status-fail') : '']" v-if="testResult">
      <div class="status-icon">
        <svg v-if="testResult.success" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      </div>
      <div class="status-text">
        <strong>{{ testResult.success ? t('testSuccess') : t('testFailed') }}</strong>
        <span>{{ testResult.message }}</span>
        <div v-if="testResult.data" class="status-detail">
          Bucket: {{ testResult.data.bucket }} · Region: {{ testResult.data.region }}
        </div>
      </div>
    </div>

    <!-- Form -->
    <div class="storage-card">
      <div class="card-section">
        <div class="section-header">
          <span class="section-icon icon-credentials">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </span>
          <div>
            <h3 class="section-title">{{ t('storageCredentials') }}</h3>
            <p class="section-desc">{{ t('storageCredentialsDesc') }}</p>
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>{{ t('accessKey') }}</label>
            <div class="input-wrap">
              <input
                v-model="form.access_key"
                :type="showAk ? 'text' : 'password'"
                :placeholder="t('accessKeyPlaceholder')"
              />
              <button class="toggle-eye" @click="showAk = !showAk">
                <svg v-if="!showAk" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>{{ t('secretKey') }}</label>
            <div class="input-wrap">
              <input
                v-model="form.secret_key"
                :type="showSk ? 'text' : 'password'"
                :placeholder="t('secretKeyPlaceholder')"
              />
              <button class="toggle-eye" @click="showSk = !showSk">
                <svg v-if="!showSk" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="card-section">
        <div class="section-header">
          <span class="section-icon icon-bucket">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </span>
          <div>
            <h3 class="section-title">{{ t('storageBucket') }}</h3>
            <p class="section-desc">{{ t('storageBucketDesc') }}</p>
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>{{ t('bucketName') }}</label>
            <input v-model="form.bucket" :placeholder="t('bucketNamePlaceholder')" />
          </div>
          <div class="form-group">
            <label>{{ t('cdnDomain') }}</label>
            <input v-model="form.domain" :placeholder="t('cdnDomainPlaceholder')" />
          </div>
          <div class="form-group">
            <label>{{ t('storageRegion') }}</label>
            <select v-model="form.region">
              <option value="z0">{{ t('regionEastChina') }}</option>
              <option value="z1">{{ t('regionNorthChina') }}</option>
              <option value="z2">{{ t('regionSouthChina') }}</option>
              <option value="na0">{{ t('regionNorthAmerica') }}</option>
              <option value="as0">{{ t('regionSoutheastAsia') }}</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Save -->
    <div class="save-bar">
      <button class="btn-save" :disabled="saving" @click="doSave">
        <svg v-if="saving" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        {{ saving ? t('saving') : t('save') }}
      </button>
    </div>

    <!-- Help -->
    <div class="help-card">
      <h4>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        {{ t('storageHelp') }}
      </h4>
      <ol>
        <li>{{ t('storageHelpStep1') }}</li>
        <li>{{ t('storageHelpStep2') }}</li>
        <li>{{ t('storageHelpStep3') }}</li>
        <li>{{ t('storageHelpStep4') }}</li>
        <li>{{ t('storageHelpStep5') }}</li>
      </ol>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getStorageSettings, updateStorageSettings, testStorageConnection } from '../../api/modules';

const { t } = useI18n();

const form = ref({
  access_key: '',
  secret_key: '',
  bucket: '',
  domain: '',
  region: 'z0',
});

const showAk = ref(false);
const showSk = ref(false);
const saving = ref(false);
const testing = ref(false);
const testResult = ref(null);

onMounted(async () => {
  try {
    const res = await getStorageSettings();
    if (res.success) {
      form.value = { ...form.value, ...res.data };
    }
  } catch (e) {
    console.error('Failed to load storage settings:', e);
  }
});

async function doSave() {
  saving.value = true;
  try {
    const res = await updateStorageSettings(form.value);
    if (res.success) {
      testResult.value = null;
      alert(t('saveSuccess'));
    } else {
      alert(res.message || t('error'));
    }
  } catch (e) {
    alert(e.response?.data?.message || t('error'));
  } finally {
    saving.value = false;
  }
}

async function doTest() {
  testing.value = true;
  try {
    // 先保存再测试
    await doSave();
    const res = await testStorageConnection();
    testResult.value = res;
  } catch (e) {
    testResult.value = {
      success: false,
      message: e.response?.data?.message || e.message || t('error'),
    };
  } finally {
    testing.value = false;
  }
}
</script>

<style scoped>
.storage-page {
  padding: 24px;
  max-width: 820px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px;
}

.page-desc {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

/* Status Banner */
.status-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 12px;
  margin-bottom: 20px;
  transition: all 0.3s;
}

.status-banner.status-ok {
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  border: 1px solid #a7f3d0;
}

.status-banner.status-fail {
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
  border: 1px solid #fecaca;
}

.status-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-ok .status-icon {
  background: #10b981;
  color: white;
}

.status-fail .status-icon {
  background: #ef4444;
  color: white;
}

.status-text strong {
  display: block;
  font-size: 14px;
  color: #1e293b;
  margin-bottom: 2px;
}

.status-text span {
  font-size: 13px;
  color: #64748b;
}

.status-detail {
  margin-top: 6px;
  font-size: 12px;
  color: #94a3b8;
  font-family: 'SF Mono', monospace;
}

/* Card */
.storage-card {
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.card-section {
  padding: 24px;
  border-bottom: 1px solid #f1f5f9;
}

.card-section:last-child {
  border-bottom: none;
}

.section-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}

.section-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-credentials {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
}

.icon-bucket {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 2px;
}

.section-desc {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}

/* Form */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.form-group input,
.form-group select {
  padding: 10px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  color: #1e293b;
  background: #f8fafc;
  transition: all 0.2s;
  outline: none;
  font-family: 'Inter', sans-serif;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
  background: white;
}

.form-group input::placeholder {
  color: #cbd5e1;
}

.input-wrap {
  position: relative;
}

.input-wrap input {
  width: 100%;
  padding-right: 42px;
}

.toggle-eye {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  padding: 4px;
  display: flex;
  align-items: center;
}

.toggle-eye:hover {
  color: #64748b;
}

/* Buttons */
.btn-test {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  color: #475569;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-test:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #eff6ff;
}

.btn-test.testing {
  opacity: 0.7;
  cursor: wait;
}

.save-bar {
  display: flex;
  justify-content: flex-end;
  margin: 20px 0;
}

.btn-save {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 28px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(37,99,235,0.3);
}

.btn-save:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37,99,235,0.4);
}

.btn-save:disabled {
  opacity: 0.7;
  cursor: wait;
}

/* Help Card */
.help-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px 24px;
}

.help-card h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin: 0 0 12px;
}

.help-card ol {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #64748b;
  line-height: 1.8;
}

.help-card li::marker {
  color: #3b82f6;
  font-weight: 700;
}

/* Spin Animation */
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 640px) {
  .storage-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    gap: 12px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
