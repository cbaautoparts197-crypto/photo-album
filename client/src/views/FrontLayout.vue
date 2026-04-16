<template>
  <div class="front-layout">
    <!-- Header - Glassmorphism -->
    <header class="front-header">
      <div class="container header-inner">
        <router-link to="/" class="logo-link">
          <img v-if="company.logo_url" :src="company.logo_url" alt="Logo" class="logo-img" />
          <span class="logo-text">{{ company[companyNameKey] || 'Gallery' }}</span>
        </router-link>

        <nav class="main-nav" :class="{ open: navOpen }">
          <router-link to="/" class="nav-link" @click="navOpen = false">{{ t('home') }}</router-link>
          <router-link to="/products" class="nav-link" @click="navOpen = false">{{ t('products') }}</router-link>
          <router-link to="/videos" class="nav-link" @click="navOpen = false">{{ t('videoCenter') }}</router-link>
          <router-link to="/about" class="nav-link" @click="navOpen = false">{{ t('about') }}</router-link>
          <a href="https://wa.me/8618030192592" class="nav-link" target="_blank">WhatsApp</a>
        </nav>

        <div class="header-right">
          <div class="lang-switch">
            <button
              v-for="lang in languages"
              :key="lang.code"
              :class="['lang-btn', { active: locale === lang.code }]"
              @click="switchLang(lang.code)"
            >{{ lang.label }}</button>
          </div>

          <button class="mobile-menu-btn" @click="navOpen = !navOpen">
            <span v-if="navOpen" class="menu-icon-close">&#x2715;</span>
            <span v-else class="menu-icon">&#9776;</span>
          </button>
        </div>
      </div>

      <!-- Mobile nav -->
      <div v-if="navOpen" class="mobile-nav">
        <router-link to="/" class="mobile-nav-link" @click="navOpen = false">{{ t('home') }}</router-link>
        <router-link to="/products" class="mobile-nav-link" @click="navOpen = false">{{ t('products') }}</router-link>
        <router-link to="/videos" class="mobile-nav-link" @click="navOpen = false">{{ t('videoCenter') }}</router-link>
        <router-link to="/about" class="mobile-nav-link" @click="navOpen = false">{{ t('about') }}</router-link>
        <a href="https://wa.me/8618030192592" class="mobile-nav-link" target="_blank">WhatsApp</a>
      </div>
    </header>

    <!-- Content -->
    <main class="front-main">
      <router-view />
    </main>

    <!-- Footer -->
    <footer class="front-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-about">
            <div class="footer-logo">
              <img v-if="company.logo_url" :src="company.logo_url" alt="Logo" />
              <span v-else class="footer-logo-text">{{ company[companyNameKey] || 'Gallery' }}</span>
            </div>
            <p class="footer-desc">{{ company[descKey] || '' }}</p>
          </div>
          <div class="footer-links">
            <h4>{{ t('quickLinks') }}</h4>
            <router-link to="/">{{ t('home') }}</router-link>
            <router-link to="/products">{{ t('products') }}</router-link>
            <router-link to="/videos">{{ t('videoCenter') }}</router-link>
            <router-link to="/about">{{ t('about') }}</router-link>
          </div>
          <div class="footer-contact">
            <h4>{{ t('contactUs') }}</h4>
            <div v-if="company.email" class="footer-contact-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4l-10 8L2 4"/></svg>
              <span>{{ company.email }}</span>
            </div>
            <div v-if="company.phone" class="footer-contact-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
              <span>{{ company.phone }}</span>
            </div>
            <div v-if="company.whatsapp" class="footer-contact-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              <span>{{ company.whatsapp }}</span>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; {{ new Date().getFullYear() }} {{ company[companyNameKey] || 'Gallery' }}. All rights reserved.</p>
          <router-link to="/admin" class="admin-link">Admin</router-link>
        </div>
      </div>
    </footer>

    <!-- Global WhatsApp Floating Button -->
    <a
      href="https://wa.me/8618030192592?text=%2B"
      target="_blank"
      class="whatsapp-float-btn"
      :title="'WhatsApp'"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
    </a>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getCompanyInfo } from '../api/modules';

const { t, locale } = useI18n();

const company = ref({});
const navOpen = ref(false);

const languages = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
];

const companyNameKey = computed(() => ({ zh: 'company_name_zh', en: 'company_name_en', es: 'company_name_es' })[locale.value]);
const descKey = computed(() => ({ zh: 'description_zh', en: 'description_en', es: 'description_es' })[locale.value]);

function switchLang(code) {
  locale.value = code;
  localStorage.setItem('lang', code);
}

onMounted(async () => {
  if (!localStorage.getItem('lang')) {
    locale.value = 'en';
    localStorage.setItem('lang', 'en');
  }
  try {
    const res = await getCompanyInfo();
    if (res.success) company.value = res.data || {};
  } catch (e) {}
});
</script>

<style scoped>
/* Header - Glassmorphism */
.front-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0,0,0,0.06);
  transition: var(--transition);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72px;
}

.logo-link {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: var(--gray-900);
  font-weight: 800;
  font-size: 20px;
  flex-shrink: 0;
  letter-spacing: -0.02em;
}

.logo-img { height: 40px; }

.main-nav {
  display: flex;
  gap: 4px;
}

.nav-link {
  padding: 8px 18px;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
  color: var(--gray-600);
  text-decoration: none;
  transition: var(--transition);
  position: relative;
}

.nav-link:hover {
  background: var(--gray-100);
  color: var(--gray-900);
}

.nav-link.router-link-exact-active {
  color: var(--primary-light);
  background: var(--primary-50);
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Language Switch */
.lang-switch {
  display: flex;
  background: var(--gray-100);
  border-radius: var(--radius-full);
  padding: 3px;
  gap: 2px;
}

.lang-btn {
  padding: 5px 14px;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  color: var(--gray-500);
  transition: var(--transition);
}

.lang-btn.active {
  background: white;
  color: var(--primary-light);
  box-shadow: var(--shadow-sm);
}

.lang-btn:hover:not(.active) {
  color: var(--gray-700);
}

/* Mobile Menu */
.mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--gray-600);
  width: 40px;
  height: 40px;
  border-radius: var(--radius);
  align-items: center;
  justify-content: center;
  transition: var(--transition);
}

.mobile-menu-btn:hover {
  background: var(--gray-100);
}

.menu-icon { font-size: 24px; }
.menu-icon-close { font-size: 20px; }

.mobile-nav {
  display: none;
  flex-direction: column;
  border-top: 1px solid var(--border-light);
  padding: 8px 24px;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(20px);
}

.mobile-nav-link {
  padding: 14px 0;
  font-size: 15px;
  font-weight: 500;
  color: var(--gray-600);
  text-decoration: none;
  border-bottom: 1px solid var(--border-light);
  transition: var(--transition-fast);
}

.mobile-nav-link:hover {
  color: var(--primary-light);
}

/* Footer */
.front-footer {
  background: var(--gray-900);
  color: var(--gray-300);
  padding: 72px 0 0;
  margin-top: 80px;
}

.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 48px;
  padding-bottom: 40px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.footer-logo {
  margin-bottom: 16px;
}

.footer-logo img {
  max-height: 48px;
  filter: brightness(2);
}

.footer-logo-text {
  font-size: 20px;
  font-weight: 700;
  color: white;
}

.footer-desc {
  font-size: 14px;
  line-height: 1.8;
  color: var(--gray-400);
  max-width: 360px;
}

.footer-links h4,
.footer-contact h4 {
  color: white;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 20px;
}

.footer-links a {
  display: block;
  color: var(--gray-400);
  font-size: 14px;
  margin-bottom: 10px;
  text-decoration: none;
  transition: var(--transition-fast);
}

.footer-links a:hover {
  color: white;
  transform: translateX(4px);
}

.footer-contact-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  margin-bottom: 14px;
  color: var(--gray-400);
}

.footer-contact-item svg {
  flex-shrink: 0;
  opacity: 0.7;
}

.footer-bottom {
  padding: 20px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--gray-500);
}

.admin-link {
  font-size: 12px;
  color: var(--gray-500) !important;
  transition: var(--transition-fast);
}

.admin-link:hover {
  color: var(--gray-300) !important;
}

/* Spacer for fixed header */
.front-main {
  padding-top: 72px;
}

@media (max-width: 768px) {
  .main-nav { display: none; }
  .mobile-menu-btn { display: flex; }
  .mobile-nav { display: flex; }
  .footer-grid { grid-template-columns: 1fr; gap: 32px; }
  .footer-bottom { flex-direction: column; gap: 10px; text-align: center; }
  .header-inner { height: 64px; }
  .front-main { padding-top: 64px; }
  .logo-text { font-size: 17px; }
}

/* Global WhatsApp Floating Button */
.whatsapp-float-btn {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 999;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #25D366;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(37, 211, 102, 0.4);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  text-decoration: none;
  animation: wa-float-pulse 2s ease-in-out infinite;
}

.whatsapp-float-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 24px rgba(37, 211, 102, 0.5);
}

@keyframes wa-float-pulse {
  0%, 100% { box-shadow: 0 4px 16px rgba(37, 211, 102, 0.4); }
  50% { box-shadow: 0 4px 24px rgba(37, 211, 102, 0.65); }
}
</style>
