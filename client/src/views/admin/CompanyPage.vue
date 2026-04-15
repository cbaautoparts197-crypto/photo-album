<template>
  <div class="company-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('companyInfo') }}</h1>
        <p class="page-desc">{{ t('editCompanyDesc') || 'Manage your company information' }}</p>
      </div>
    </div>

    <div class="company-grid">
      <!-- 基本信息 -->
      <div class="card company-card">
        <div class="card-header-compact">
          <div class="card-header-icon" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <h3>{{ t('basicInfo') }}</h3>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">公司名称 (中文)</label>
            <input v-model="info.company_name_zh" class="form-input" placeholder="公司名称" />
          </div>
          <div class="form-group">
            <label class="form-label">Company Name (English)</label>
            <input v-model="info.company_name_en" class="form-input" placeholder="Company Name" />
          </div>
          <div class="form-group">
            <label class="form-label">Nombre de la Empresa (Español)</label>
            <input v-model="info.company_name_es" class="form-input" placeholder="Nombre de la Empresa" />
          </div>
          <div class="form-group">
            <label class="form-label">Logo URL</label>
            <input v-model="info.logo_url" class="form-input" placeholder="https://..." />
            <div v-if="info.logo_url" class="logo-preview">
              <img :src="info.logo_url" alt="Logo" />
            </div>
          </div>
        </div>
      </div>

      <!-- 联系信息 -->
      <div class="card company-card">
        <div class="card-header-compact">
          <div class="card-header-icon" style="background:linear-gradient(135deg,#10b981,#059669);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </div>
          <h3>{{ t('contactInfo') }}</h3>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">📧 {{ t('email') }}</label>
            <input v-model="info.email" class="form-input" placeholder="email@example.com" />
          </div>
          <div class="form-group">
            <label class="form-label">📱 {{ t('phone') }}</label>
            <input v-model="info.phone" class="form-input" placeholder="+86 ..." />
          </div>
          <div class="form-group">
            <label class="form-label">💬 WhatsApp</label>
            <input v-model="info.whatsapp" class="form-input" placeholder="+86 ..." />
          </div>
          <div class="form-group">
            <label class="form-label">📍 {{ t('address') }}</label>
            <textarea v-model="info.address" class="form-textarea" rows="2" placeholder="Address"></textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- 公司介绍 -->
    <div class="card company-card">
      <div class="card-header-compact">
        <div class="card-header-icon" style="background:linear-gradient(135deg,#f59e0b,#d97706);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        </div>
        <h3>{{ t('companyDesc') }}</h3>
      </div>
      <div class="card-body">
        <div class="lang-forms">
          <div class="lang-form-item">
            <div class="lang-form-label">
              <span class="lang-flag">🇨🇳</span> 中文介绍
            </div>
            <textarea v-model="info.description_zh" class="form-textarea" rows="4" placeholder="公司介绍..."></textarea>
          </div>
          <div class="lang-form-item">
            <div class="lang-form-label">
              <span class="lang-flag">🇺🇸</span> English Description
            </div>
            <textarea v-model="info.description_en" class="form-textarea" rows="4" placeholder="Company description..."></textarea>
          </div>
          <div class="lang-form-item">
            <div class="lang-form-label">
              <span class="lang-flag">🇪🇸</span> Descripción en Español
            </div>
            <textarea v-model="info.description_es" class="form-textarea" rows="4" placeholder="Descripción de la empresa..."></textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- SEO -->
    <div class="card company-card">
      <div class="card-header-compact">
        <div class="card-header-icon" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <h3>SEO</h3>
      </div>
      <div class="card-body">
        <div class="seo-grid">
          <div class="form-group">
            <label class="form-label">🇨🇳 Title</label>
            <input v-model="info.seo_title_zh" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">🇺🇸 Title</label>
            <input v-model="info.seo_title_en" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">🇪🇸 Title</label>
            <input v-model="info.seo_title_es" class="form-input" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">SEO Keywords</label>
          <input v-model="info.seo_keywords" class="form-input" placeholder="keyword1, keyword2, ..." />
        </div>
      </div>
    </div>

    <!-- Save -->
    <div class="save-bar">
      <button class="btn btn-primary btn-lg save-btn" @click="handleSave" :disabled="saving">
        <svg v-if="saving" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        {{ saving ? t('saving') : t('save') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getCompanyInfo, updateCompanyInfo } from '../../api/modules';

const { t } = useI18n();
const saving = ref(false);

const info = ref({
  company_name_zh: '',
  company_name_en: '',
  company_name_es: '',
  logo_url: '',
  email: '',
  phone: '',
  whatsapp: '',
  address: '',
  description_zh: '',
  description_en: '',
  description_es: '',
  seo_title_zh: '',
  seo_title_en: '',
  seo_title_es: '',
  seo_keywords: '',
});

async function loadData() {
  try {
    const res = await getCompanyInfo();
    if (res.success && res.data) {
      Object.assign(info.value, res.data);
    }
  } catch (e) {}
}

async function handleSave() {
  saving.value = true;
  try {
    await updateCompanyInfo(info.value);
    alert(t('saveSuccess'));
  } catch (e) {}
  saving.value = false;
}

onMounted(loadData);
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

.company-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.company-card {
  margin-bottom: 0;
}

.card-header-compact {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--gray-100);
}

.card-header-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.card-header-compact h3 {
  font-size: 15px;
  font-weight: 700;
  color: var(--gray-800);
}

.company-card + .company-card {
  margin-top: 20px;
}

/* Logo Preview */
.logo-preview {
  margin-top: 10px;
  padding: 16px;
  background: var(--gray-50);
  border-radius: var(--radius);
  text-align: center;
  border: 1px dashed var(--gray-200);
}

.logo-preview img {
  max-height: 80px;
}

/* Lang Forms */
.lang-forms {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.lang-form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--gray-600);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.lang-flag {
  font-size: 16px;
}

/* SEO Grid */
.seo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

/* Save Bar */
.save-bar {
  margin-top: 32px;
  display: flex;
  justify-content: center;
}

.save-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 48px !important;
  font-size: 15px;
  font-weight: 600;
}

.spin {
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1024px) {
  .company-grid {
    grid-template-columns: 1fr;
  }
  .lang-forms {
    grid-template-columns: 1fr;
  }
  .seo-grid {
    grid-template-columns: 1fr;
  }
}
</style>
