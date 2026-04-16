<template>
  <div class="admin-layout">
    <!-- Sidebar -->
    <aside :class="['admin-sidebar', { collapsed: sidebarCollapsed }]">
      <div class="sidebar-header">
        <router-link to="/" class="sidebar-logo">
          <div class="logo-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </div>
          <span v-if="!sidebarCollapsed" class="logo-text">Admin Panel</span>
        </router-link>
      </div>

      <nav class="sidebar-nav">
        <div v-if="!sidebarCollapsed" class="nav-section-label">Main</div>
        <router-link to="/admin/dashboard" class="nav-item" :class="{ active: $route.path === '/admin/dashboard' }">
          <span class="nav-icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </span>
          <span v-if="!sidebarCollapsed" class="nav-label">{{ t('home') }}</span>
        </router-link>
        <div v-if="!sidebarCollapsed" class="nav-section-label">Manage</div>
        <router-link to="/admin/categories" class="nav-item" :class="{ active: $route.path === '/admin/categories' }">
          <span class="nav-icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </span>
          <span v-if="!sidebarCollapsed" class="nav-label">{{ t('categories') }}</span>
        </router-link>
        <router-link to="/admin/products" class="nav-item" :class="{ active: $route.path === '/admin/products' }">
          <span class="nav-icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </span>
          <span v-if="!sidebarCollapsed" class="nav-label">{{ t('products') }}</span>
        </router-link>
        <router-link to="/admin/upload" class="nav-item" :class="{ active: $route.path === '/admin/upload' }">
          <span class="nav-icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </span>
          <span v-if="!sidebarCollapsed" class="nav-label">{{ t('upload') }}</span>
        </router-link>
        <div v-if="!sidebarCollapsed" class="nav-section-label">Settings</div>
        <router-link to="/admin/company" class="nav-item" :class="{ active: $route.path === '/admin/company' }">
          <span class="nav-icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </span>
          <span v-if="!sidebarCollapsed" class="nav-label">{{ t('companyInfo') }}</span>
        </router-link>
        <router-link to="/admin/watermark" class="nav-item" :class="{ active: $route.path === '/admin/watermark' }">
          <span class="nav-icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </span>
          <span v-if="!sidebarCollapsed" class="nav-label">{{ t('watermark') }}</span>
        </router-link>
        <router-link to="/admin/storage" class="nav-item" :class="{ active: $route.path === '/admin/storage' }">
          <span class="nav-icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
          </span>
          <span v-if="!sidebarCollapsed" class="nav-label">{{ t('storageSettings') }}</span>
        </router-link>
        <div v-if="!sidebarCollapsed" class="nav-section-label">Business</div>
        <router-link to="/admin/prices" class="nav-item" :class="{ active: $route.path === '/admin/prices' }">
          <span class="nav-icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </span>
          <span v-if="!sidebarCollapsed" class="nav-label">{{ t('priceManagement') }}</span>
        </router-link>
        <router-link to="/admin/videos" class="nav-item" :class="{ active: $route.path === '/admin/videos' }">
          <span class="nav-icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          </span>
          <span v-if="!sidebarCollapsed" class="nav-label">{{ t('videoManagement') }}</span>
        </router-link>
        <router-link to="/admin/news" class="nav-item" :class="{ active: $route.path === '/admin/news' }">
          <span class="nav-icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/></svg>
          </span>
          <span v-if="!sidebarCollapsed" class="nav-label">{{ t('newsManagement') }}</span>
        </router-link>
        <router-link to="/admin/inquiries" class="nav-item" :class="{ active: $route.path === '/admin/inquiries' }">
          <span class="nav-icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </span>
          <span v-if="!sidebarCollapsed" class="nav-label">{{ t('inquiryManagement') }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <router-link to="/" class="nav-item nav-item-external">
          <span class="nav-icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </span>
          <span v-if="!sidebarCollapsed" class="nav-label">前台</span>
        </router-link>
        <button class="nav-item logout-btn" @click="doLogout">
          <span class="nav-icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </span>
          <span v-if="!sidebarCollapsed" class="nav-label">{{ t('logout') || 'Logout' }}</span>
        </button>
      </div>
    </aside>

    <!-- Main -->
    <div :class="['admin-main', { collapsed: sidebarCollapsed }]">
      <header class="admin-topbar">
        <button class="toggle-sidebar" @click="sidebarCollapsed = !sidebarCollapsed">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div class="topbar-breadcrumb">
          <span class="breadcrumb-title">{{ currentPageTitle }}</span>
        </div>
        <div class="topbar-right">
          <div class="lang-switcher">
            <button
              v-for="lang in languages"
              :key="lang.code"
              :class="['lang-btn', { active: locale === lang.code }]"
              @click="switchLang(lang.code)"
            >
              {{ lang.label }}
            </button>
          </div>
        </div>
      </header>

      <main class="admin-content">
        <router-view />
      </main>
    </div>

    <!-- Mobile overlay -->
    <div v-if="!sidebarCollapsed && isMobile" class="sidebar-overlay" @click="sidebarCollapsed = true"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();
const router = useRouter();
const route = useRoute();

const sidebarCollapsed = ref(false);
const isMobile = ref(false);

const pageTitles = {
  '/admin/dashboard': 'dashboard',
  '/admin/categories': 'categories',
  '/admin/products': 'products',
  '/admin/upload': 'upload',
  '/admin/company': 'companyInfo',
  '/admin/watermark': 'watermark',
  '/admin/prices': 'priceManagement',
  '/admin/inquiries': 'inquiryManagement',
  '/admin/videos': 'videoManagement',
  '/admin/news': 'newsManagement',
};

const currentPageTitle = computed(() => {
  const key = pageTitles[route.path];
  return key ? t(key) : 'Admin';
});

const languages = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
];

function switchLang(code) {
  locale.value = code;
  localStorage.setItem('lang', code);
}

function doLogout() {
  localStorage.removeItem('token');
  router.push('/admin/login');
}

function checkMobile() {
  isMobile.value = window.innerWidth < 768;
  if (isMobile.value) sidebarCollapsed.value = true;
}

onMounted(() => {
  if (!localStorage.getItem('lang')) {
    locale.value = 'zh';
    localStorage.setItem('lang', 'zh');
  }
  checkMobile();
  window.addEventListener('resize', checkMobile);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: var(--gray-50);
}

/* ==================== Sidebar ==================== */
.admin-sidebar {
  width: 260px;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  color: white;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 200;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  border-right: 1px solid rgba(255,255,255,0.06);
}

.admin-sidebar.collapsed {
  width: 72px;
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  color: white;
  text-decoration: none;
}

.logo-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: var(--radius);
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  color: white;
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  white-space: nowrap;
}

/* Nav */
.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}

.nav-section-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.3);
  padding: 16px 12px 6px;
}

.nav-section-label:first-child {
  padding-top: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius);
  color: rgba(255,255,255,0.6);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: var(--transition);
  white-space: nowrap;
  background: none;
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
  font-family: inherit;
}

.nav-item:hover {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.9);
}

.nav-item.active {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
}

.nav-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(255,255,255,0.06);
  transition: var(--transition);
}

.nav-item.active .nav-icon-wrap {
  background: rgba(255,255,255,0.15);
}

.nav-item:hover .nav-icon-wrap {
  background: rgba(255,255,255,0.1);
}

.nav-label {
  overflow: hidden;
}

/* Footer */
.sidebar-footer {
  padding: 12px;
  border-top: 1px solid rgba(255,255,255,0.08);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
}

.logout-btn:hover .nav-icon-wrap {
  background: rgba(239, 68, 68, 0.2);
}

/* ==================== Main ==================== */
.admin-main {
  flex: 1;
  margin-left: 260px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.admin-main.collapsed {
  margin-left: 72px;
}

/* Topbar */
.admin-topbar {
  height: 64px;
  background: white;
  border-bottom: 1px solid var(--gray-200);
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.toggle-sidebar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: var(--gray-500);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
}

.toggle-sidebar:hover {
  background: var(--gray-100);
  color: var(--gray-700);
}

.topbar-breadcrumb {
  flex: 1;
}

.breadcrumb-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--gray-800);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-content {
  flex: 1;
  padding: 28px;
}

/* Language Switcher */
.lang-switcher {
  display: flex;
  background: var(--gray-100);
  border-radius: var(--radius-full);
  padding: 3px;
  gap: 2px;
}

.lang-btn {
  padding: 5px 12px;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--gray-500);
  transition: var(--transition);
  font-family: inherit;
}

.lang-btn.active {
  background: white;
  color: var(--gray-800);
  box-shadow: var(--shadow-sm);
}

/* Mobile overlay */
.sidebar-overlay {
  display: none;
}

/* ==================== Responsive ==================== */
@media (max-width: 768px) {
  .admin-sidebar {
    transform: translateX(-100%);
    width: 260px;
  }
  .admin-sidebar:not(.collapsed) {
    transform: translateX(0);
  }
  .admin-sidebar.collapsed {
    transform: translateX(-100%);
  }
  .admin-main {
    margin-left: 0 !important;
  }
  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 150;
    backdrop-filter: blur(4px);
  }
  .admin-content {
    padding: 16px;
  }
}
</style>
