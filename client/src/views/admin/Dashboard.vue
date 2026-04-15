<template>
  <div class="dashboard-page">
    <div class="dashboard-header">
      <div>
        <h1 class="page-title">{{ t('welcomeAdmin') || 'Dashboard' }}</h1>
        <p class="page-desc">{{ t('dashboardDesc') || 'Overview of your gallery system' }}</p>
      </div>
      <router-link to="/admin/upload" class="btn btn-primary header-action">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        {{ t('upload') }}
      </router-link>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-card-bg stat-bg-1"></div>
        <div class="stat-card-content">
          <div class="stat-icon-wrap stat-icon-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ stats.totalProducts }}</div>
            <div class="stat-label">{{ t('products') }}</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-bg stat-bg-2"></div>
        <div class="stat-card-content">
          <div class="stat-icon-wrap stat-icon-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ stats.totalCategories }}</div>
            <div class="stat-label">{{ t('categories') }}</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-bg stat-bg-3"></div>
        <div class="stat-card-content">
          <div class="stat-icon-wrap stat-icon-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ stats.todayUploads }}</div>
            <div class="stat-label">{{ t('todayUploads') || 'Today Uploads' }}</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-bg stat-bg-4"></div>
        <div class="stat-card-content">
          <div class="stat-icon-wrap stat-icon-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ stats.totalSize }}</div>
            <div class="stat-label">Total Size</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="actions-grid">
      <div class="action-card">
        <div class="action-card-header">
          <div class="action-icon action-icon-upload">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <div>
            <h3>{{ t('upload') }}</h3>
            <p>{{ t('uploadHint') }}</p>
          </div>
        </div>
        <router-link to="/admin/upload" class="action-link">
          {{ t('upload') }}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </router-link>
      </div>
      <div class="action-card">
        <div class="action-card-header">
          <div class="action-icon action-icon-category">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div>
            <h3>{{ t('categories') }}</h3>
            <p>{{ stats.totalCategories }} {{ t('categories') }}</p>
          </div>
        </div>
        <router-link to="/admin/categories" class="action-link">
          {{ t('manage') || 'Manage' }}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </router-link>
      </div>
      <div class="action-card">
        <div class="action-card-header">
          <div class="action-icon action-icon-company">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div>
            <h3>{{ t('companyInfo') }}</h3>
            <p>{{ t('editCompanyDesc') || 'Edit your company details' }}</p>
          </div>
        </div>
        <router-link to="/admin/company" class="action-link">
          {{ t('edit') || 'Edit' }}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getProducts, getCategories } from '../../api/modules';

const { t } = useI18n();
const stats = ref({
  totalProducts: 0,
  totalCategories: 0,
  todayUploads: 0,
  totalSize: '0 MB',
});

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

onMounted(async () => {
  try {
    const [prodRes, catRes] = await Promise.all([
      getProducts({ limit: 1 }),
      getCategories(),
    ]);
    if (prodRes.success) {
      stats.value.totalProducts = prodRes.data.pagination.total;
    }
    if (catRes.success) {
      const countAll = (cats) => {
        let c = cats.length;
        cats.forEach(cat => { c += countAll(cat.children || []); });
        return c;
      };
      stats.value.totalCategories = countAll(catRes.data);
    }
  } catch (e) {}
});
</script>

<style scoped>
.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.header-action {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 28px;
}

.stat-card {
  background: white;
  border-radius: var(--radius-lg);
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border-light);
  transition: var(--transition);
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
  border-color: transparent;
}

.stat-card-bg {
  position: absolute;
  top: 0;
  right: 0;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  opacity: 0.06;
  transform: translate(30px, -30px);
}

.stat-bg-1 { background: #3b82f6; }
.stat-bg-2 { background: #f59e0b; }
.stat-bg-3 { background: #10b981; }
.stat-bg-4 { background: #8b5cf6; }

.stat-card-content {
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.stat-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
}

.stat-icon-1 { background: linear-gradient(135deg, #3b82f6, #1d4ed8); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
.stat-icon-2 { background: linear-gradient(135deg, #f59e0b, #d97706); box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3); }
.stat-icon-3 { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
.stat-icon-4 { background: linear-gradient(135deg, #8b5cf6, #7c3aed); box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3); }

.stat-number {
  font-size: 28px;
  font-weight: 800;
  color: var(--gray-900);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--gray-400);
  font-weight: 500;
}

/* Actions Grid */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.action-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: 24px;
  border: 1px solid var(--border-light);
  transition: var(--transition);
}

.action-card:hover {
  box-shadow: var(--shadow);
  border-color: var(--gray-200);
}

.action-card-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.action-card-header h3 {
  font-size: 15px;
  font-weight: 700;
  color: var(--gray-800);
  margin-bottom: 4px;
}

.action-card-header p {
  font-size: 13px;
  color: var(--gray-400);
  line-height: 1.5;
}

.action-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
}

.action-icon-upload { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
.action-icon-category { background: linear-gradient(135deg, #f59e0b, #d97706); }
.action-icon-company { background: linear-gradient(135deg, #10b981, #059669); }

.action-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--primary-light);
  text-decoration: none;
  transition: var(--transition);
}

.action-link:hover {
  gap: 10px;
  color: var(--primary);
}

/* Responsive */
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  .actions-grid {
    grid-template-columns: 1fr;
  }
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  .header-action {
    width: 100%;
    justify-content: center;
  }
}
</style>
