<template>
  <div class="about-page">
    <!-- Banner -->
    <section class="page-banner">
      <div class="banner-bg">
        <div class="banner-particle banner-particle-1"></div>
        <div class="banner-particle banner-particle-2"></div>
      </div>
      <div class="container">
        <h1 class="banner-title">{{ t('about') }}</h1>
        <p class="banner-desc">{{ t('featuresDesc') }}</p>
      </div>
    </section>

    <div class="container" style="padding: 56px 16px 80px;">
      <div class="about-content" v-if="company">
        <!-- 公司信息 Hero Card -->
        <div class="about-hero-card">
          <div class="about-hero-bg"></div>
          <div class="about-hero-body">
            <div v-if="company.logo_url" class="about-logo-wrap">
              <img :src="company.logo_url" alt="Logo" />
            </div>
            <h2 class="about-company-name">
              {{ company[companyNameKey] || t('companyName') }}
            </h2>
            <p class="about-company-desc">
              {{ company[descKey] || t('companyDesc') }}
            </p>
          </div>
        </div>

        <!-- 联系信息 -->
        <div class="contact-section">
          <div class="section-header">
            <span class="section-tag">{{ t('contactUs') }}</span>
            <h2 class="section-title">Get In Touch</h2>
          </div>
          <div class="contact-grid">
            <a v-if="company.email" :href="'mailto:' + company.email" class="contact-card">
              <div class="contact-icon contact-icon-email">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <div class="contact-card-info">
                <span class="contact-label">{{ t('email') }}</span>
                <span class="contact-value">{{ company.email }}</span>
              </div>
              <svg class="contact-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
            <a v-if="company.phone" :href="'tel:' + company.phone" class="contact-card">
              <div class="contact-icon contact-icon-phone">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </div>
              <div class="contact-card-info">
                <span class="contact-label">{{ t('phone') }}</span>
                <span class="contact-value">{{ company.phone }}</span>
              </div>
              <svg class="contact-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
            <a href="https://wa.me/8618030192592" target="_blank" class="contact-card contact-card-whatsapp">
              <div class="contact-icon contact-icon-whatsapp">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
              </div>
              <div class="contact-card-info">
                <span class="contact-label">WhatsApp</span>
                <span class="contact-value">{{ company.whatsapp }}</span>
              </div>
              <svg class="contact-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
            <div v-if="company.address" class="contact-card contact-card-address">
              <div class="contact-icon contact-icon-address">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <div class="contact-card-info">
                <span class="contact-label">{{ t('address') }}</span>
                <span class="contact-value">{{ company.address }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getCompanyInfo } from '../api/modules';

const { t, locale } = useI18n();

const company = ref({});
const companyNameKey = computed(() => ({ zh: 'company_name_zh', en: 'company_name_en', es: 'company_name_es' })[locale.value]);
const descKey = computed(() => ({ zh: 'description_zh', en: 'description_en', es: 'description_es' })[locale.value]);

onMounted(async () => {
  try {
    const res = await getCompanyInfo();
    if (res.success) company.value = res.data || {};
  } catch (e) {}
});
</script>

<style scoped>
/* ==================== Banner ==================== */
.page-banner {
  position: relative;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #1e40af 100%);
  color: white;
  padding: 64px 0;
  text-align: center;
  overflow: hidden;
}

.banner-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.banner-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.banner-particle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.15;
}

.banner-particle-1 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, #3b82f6, transparent 70%);
  top: -80px;
  right: -60px;
}

.banner-particle-2 {
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, #10b981, transparent 70%);
  bottom: -60px;
  left: -40px;
}

.banner-title {
  position: relative;
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-bottom: 12px;
}

.banner-desc {
  position: relative;
  font-size: 16px;
  opacity: 0.75;
  max-width: 480px;
  margin: 0 auto;
  line-height: 1.7;
}

/* ==================== About Hero Card ==================== */
.about-hero-card {
  position: relative;
  background: white;
  border-radius: var(--radius-xl);
  overflow: hidden;
  margin-bottom: 64px;
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-lg);
}

.about-hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 200px;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%);
}

.about-hero-body {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 48px 40px 40px;
}

.about-logo-wrap {
  display: inline-block;
  padding: 16px;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  margin-bottom: 20px;
}

.about-logo-wrap img {
  max-height: 80px;
  display: block;
}

.about-company-name {
  font-size: 28px;
  font-weight: 800;
  color: var(--gray-900);
  margin-bottom: 16px;
  letter-spacing: -0.02em;
}

.about-company-desc {
  font-size: 16px;
  color: var(--gray-500);
  line-height: 1.9;
  max-width: 600px;
  margin: 0 auto;
}

/* ==================== Section Header ==================== */
.section-header {
  text-align: center;
  margin-bottom: 32px;
}

.section-tag {
  display: inline-block;
  padding: 4px 14px;
  background: var(--primary-50);
  color: var(--primary-light);
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 12px;
}

.section-title {
  font-size: 28px;
  font-weight: 800;
  color: var(--gray-900);
  letter-spacing: -0.02em;
}

/* ==================== Contact Grid ==================== */
.contact-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  max-width: 640px;
  margin: 0 auto;
}

.contact-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  text-decoration: none;
  color: inherit;
  transition: var(--transition);
  position: relative;
  overflow: hidden;
}

.contact-card:not(.contact-card-address):hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
  border-color: transparent;
}

.contact-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
}

.contact-icon-email {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.contact-icon-phone {
  background: linear-gradient(135deg, #10b981, #059669);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.contact-icon-whatsapp {
  background: linear-gradient(135deg, #25d366, #128c7e);
  box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);
}

.contact-icon-address {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.contact-card-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.contact-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--gray-400);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.contact-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-800);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contact-arrow {
  flex-shrink: 0;
  color: var(--gray-300);
  transition: var(--transition);
}

.contact-card:not(.contact-card-address):hover .contact-arrow {
  color: var(--primary-light);
  transform: translateX(4px);
}

/* ==================== Responsive ==================== */
@media (max-width: 768px) {
  .page-banner {
    padding: 48px 0;
  }

  .banner-title {
    font-size: 28px;
  }

  .about-hero-body {
    padding: 40px 24px 32px;
  }

  .about-company-name {
    font-size: 22px;
  }

  .about-company-desc {
    font-size: 14px;
  }

  .contact-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .about-hero-bg {
    height: 140px;
  }
}
</style>
