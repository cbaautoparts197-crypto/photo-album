<template>
  <div class="inquiries-page">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <h2 class="page-title">{{ t('inquiryManagement') }}</h2>
        <p class="page-desc">{{ t('inquiryDesc') }}</p>
      </div>
    </div>

    <!-- 状态筛选 + 搜索 -->
    <div class="filter-bar">
      <div class="status-tabs">
        <button :class="['status-tab', { active: statusFilter === 'all' }]" @click="statusFilter = 'all'; loadInquiries()">
          {{ t('all') }} <span v-if="stats.all" class="tab-count">{{ stats.all }}</span>
        </button>
        <button :class="['status-tab', { active: statusFilter === 'new' }]" @click="statusFilter = 'new'; loadInquiries()">
          {{ t('inquiryNew') }} <span v-if="stats.new" class="tab-count badge-new">{{ stats.new }}</span>
        </button>
        <button :class="['status-tab', { active: statusFilter === 'read' }]" @click="statusFilter = 'read'; loadInquiries()">
          {{ t('inquiryRead') }} <span v-if="stats.read" class="tab-count">{{ stats.read }}</span>
        </button>
        <button :class="['status-tab', { active: statusFilter === 'replied' }]" @click="statusFilter = 'replied'; loadInquiries()">
          {{ t('inquiryReplied') }} <span v-if="stats.replied" class="tab-count">{{ stats.replied }}</span>
        </button>
        <button :class="['status-tab', { active: statusFilter === 'closed' }]" @click="statusFilter = 'closed'; loadInquiries()">
          {{ t('inquiryClosed') }} <span v-if="stats.closed" class="tab-count">{{ stats.closed }}</span>
        </button>
      </div>
      <div class="filter-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="searchKeyword" :placeholder="t('search') + '...'" @keyup.enter="loadInquiries()" />
      </div>
      <button class="btn btn-sm btn-primary" @click="loadInquiries()">{{ t('search') }}</button>
    </div>

    <!-- 询盘列表 -->
    <div v-if="loading" class="loading-spinner" style="margin:48px auto;"></div>
    <div v-else-if="inquiries.length === 0" class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
      <p>{{ t('inquiryNoData') }}</p>
    </div>
    <div v-else class="inquiry-list">
      <div v-for="inq in inquiries" :key="inq.id" class="inquiry-card">
        <div class="inq-header">
          <div class="inq-header-left">
            <span :class="['status-badge', `status-${inq.status}`]">{{ statusLabel(inq.status) }}</span>
            <span class="inq-date">{{ formatTime(inq.created_at) }}</span>
          </div>
          <div class="inq-header-right">
            <select :value="inq.status" class="status-select" @change="changeStatus(inq.id, $event.target.value)">
              <option value="new">{{ t('inquiryNew') }}</option>
              <option value="read">{{ t('inquiryRead') }}</option>
              <option value="replied">{{ t('inquiryReplied') }}</option>
              <option value="closed">{{ t('inquiryClosed') }}</option>
            </select>
            <button class="btn-icon btn-icon-danger" @click="removeInquiry(inq.id)" :title="t('delete')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>

        <div class="inq-body">
          <!-- 客户信息 -->
          <div class="inq-section">
            <div class="inq-section-title">{{ t('inquiryCustomer') }}</div>
            <div class="inq-info-grid">
              <div class="info-item">
                <span class="info-label">{{ t('inquiryName') }}</span>
                <span class="info-value">{{ inq.customer_name }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ t('inquiryEmail') }}</span>
                <a :href="'mailto:' + inq.customer_email" class="info-value info-link">{{ inq.customer_email }}</a>
              </div>
              <div v-if="inq.customer_phone" class="info-item">
                <span class="info-label">{{ t('inquiryPhone') }}</span>
                <span class="info-value">{{ inq.customer_phone }}</span>
              </div>
            </div>
          </div>

          <!-- 产品信息 -->
          <div v-if="inq.product_name || inq.oe_number" class="inq-section">
            <div class="inq-section-title">{{ t('inquiryProduct') }}</div>
            <div class="inq-info-grid">
              <div v-if="inq.product_name" class="info-item">
                <span class="info-label">{{ t('inquiryProduct') }}</span>
                <span class="info-value">{{ inq.product_name }}</span>
              </div>
              <div v-if="inq.oe_number" class="info-item">
                <span class="info-label">OE</span>
                <span class="info-value">{{ inq.oe_number }}</span>
              </div>
              <div v-if="inq.category_name" class="info-item">
                <span class="info-label">{{ t('categories') }}</span>
                <span class="info-value">{{ inq.category_name }}</span>
              </div>
            </div>
          </div>

          <!-- 询盘内容 -->
          <div v-if="inq.customer_message" class="inq-section">
            <div class="inq-section-title">{{ t('inquiryContent') }}</div>
            <p class="inq-message">{{ inq.customer_message }}</p>
          </div>

          <!-- 历史回复 -->
          <div v-if="inq.admin_reply" class="inq-section inq-reply-section">
            <div class="inq-section-title">{{ t('inquiryReply') }}
              <span v-if="inq.replied_at" class="reply-time">{{ formatTime(inq.replied_at) }}</span>
            </div>
            <p class="inq-reply-text">{{ inq.admin_reply }}</p>
          </div>

          <!-- 回复框 -->
          <div class="inq-reply-box">
            <textarea v-model="replyForms[inq.id]" rows="2" :placeholder="t('replyPlaceholder')"></textarea>
            <button class="btn btn-primary btn-sm" :disabled="!replyForms[inq.id]?.trim()" @click="sendReply(inq.id)">
              {{ t('sendReply') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="pagination.totalPages > 1" class="pagination-bar">
      <div class="pagination">
        <button class="page-btn" :disabled="currentPage <= 1" @click="currentPage--; loadInquiries()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button v-for="n in visiblePages" :key="n" :class="['page-btn', { active: n === currentPage }]" @click="currentPage = n; loadInquiries()">{{ n }}</button>
        <button class="page-btn" :disabled="currentPage >= pagination.totalPages" @click="currentPage++; loadInquiries()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getInquiries, updateInquiryStatus, replyInquiry, deleteInquiry } from '../../api/modules';

const { t } = useI18n();

const inquiries = ref([]);
const loading = ref(false);
const currentPage = ref(1);
const pagination = ref({ total: 0, totalPages: 0 });
const statusFilter = ref('all');
const searchKeyword = ref('');
const stats = reactive({ all: 0, new: 0, read: 0, replied: 0, closed: 0 });
const replyForms = reactive({});

const visiblePages = computed(() => {
  const pages = [];
  let s = Math.max(1, currentPage.value - 2);
  let e = Math.min(pagination.value.totalPages, s + 4);
  if (e - s < 4) s = Math.max(1, e - 4);
  for (let i = s; i <= e; i++) pages.push(i);
  return pages;
});

function statusLabel(s) {
  const map = { new: t('inquiryNew'), read: t('inquiryRead'), replied: t('inquiryReplied'), closed: t('inquiryClosed') };
  return map[s] || s;
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function loadInquiries() {
  loading.value = true;
  try {
    const params = { page: currentPage.value, limit: 20 };
    if (statusFilter.value !== 'all') params.status = statusFilter.value;
    if (searchKeyword.value) params.search = searchKeyword.value;
    const res = await getInquiries(params);
    if (res.success) {
      inquiries.value = res.data.items;
      pagination.value = res.data.pagination;
      // 更新统计
      Object.assign(stats, { all: 0, new: 0, read: 0, replied: 0, closed: 0 });
      stats.all = res.data.pagination.total;
      for (const [k, v] of Object.entries(res.data.stats)) { stats[k] = v; }
    }
  } catch (e) {}
  loading.value = false;
}

async function changeStatus(id, status) {
  await updateInquiryStatus(id, status);
  const item = inquiries.value.find(i => i.id === id);
  if (item) item.status = status;
  await loadInquiries();
}

async function sendReply(id) {
  const text = replyForms[id]?.trim();
  if (!text) return;
  await replyInquiry(id, { admin_reply: text, status: 'replied' });
  replyForms[id] = '';
  await loadInquiries();
}

async function removeInquiry(id) {
  if (!confirm(t('delete') + '?')) return;
  await deleteInquiry(id);
  await loadInquiries();
}

onMounted(() => loadInquiries());
</script>

<style scoped>
.inquiries-page { max-width: 1000px; }
.page-header { margin-bottom: 24px; }
.page-title { font-size: 22px; font-weight: 700; color: var(--gray-900); margin-bottom: 4px; }
.page-desc { font-size: 14px; color: var(--gray-400); }

.filter-bar { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
.status-tabs { display: flex; gap: 4px; background: var(--gray-100); border-radius: var(--radius-lg); padding: 3px; }
.status-tab { padding: 7px 14px; border: none; border-radius: var(--radius); background: transparent; font-size: 13px; font-weight: 500; color: var(--gray-500); cursor: pointer; transition: var(--transition); font-family: inherit; display: flex; align-items: center; gap: 6px; }
.status-tab.active { background: white; color: var(--gray-800); box-shadow: var(--shadow-sm); font-weight: 600; }
.tab-count { font-size: 11px; background: var(--gray-200); color: var(--gray-600); padding: 1px 7px; border-radius: var(--radius-full); font-weight: 600; }
.badge-new { background: #fef2f2; color: #dc2626; }
.filter-search { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: white; border: 1px solid var(--border-light); border-radius: var(--radius); min-width: 200px; }
.filter-search svg { color: var(--gray-400); flex-shrink: 0; }
.filter-search input { border: none; outline: none; font-size: 14px; width: 100%; font-family: inherit; color: var(--gray-700); }

.empty-state { text-align: center; padding: 64px 24px; color: var(--gray-400); }
.empty-state svg { margin-bottom: 12px; opacity: 0.3; }

.inquiry-list { display: flex; flex-direction: column; gap: 16px; }
.inquiry-card { background: white; border: 1px solid var(--border-light); border-radius: var(--radius-lg); overflow: hidden; }
.inq-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; background: var(--gray-50); border-bottom: 1px solid var(--gray-100); gap: 12px; flex-wrap: wrap; }
.inq-header-left { display: flex; align-items: center; gap: 10px; }
.inq-header-right { display: flex; align-items: center; gap: 8px; }
.inq-date { font-size: 12px; color: var(--gray-400); }

.status-badge { display: inline-flex; padding: 3px 10px; border-radius: var(--radius-full); font-size: 11px; font-weight: 600; }
.status-new { background: #dbeafe; color: #1d4ed8; }
.status-read { background: #f3f4f6; color: #4b5563; }
.status-replied { background: #d1fae5; color: #059669; }
.status-closed { background: #f3f4f6; color: #9ca3af; }

.status-select { padding: 5px 8px; border: 1px solid var(--border-light); border-radius: var(--radius); font-size: 12px; font-family: inherit; color: var(--gray-600); background: white; cursor: pointer; }
.status-select:focus { outline: none; border-color: var(--primary-light); }

.btn-icon { width: 32px; height: 32px; border: none; background: none; border-radius: var(--radius); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; color: var(--gray-500); transition: var(--transition); }
.btn-icon:hover { background: var(--gray-100); }
.btn-icon-danger:hover { background: #fef2f2; color: #dc2626; }

.inq-body { padding: 20px; }
.inq-section { margin-bottom: 16px; }
.inq-section:last-child { margin-bottom: 0; }
.inq-section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--gray-400); margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
.reply-time { font-weight: 400; text-transform: none; letter-spacing: 0; font-size: 11px; }
.inq-info-grid { display: flex; gap: 20px; flex-wrap: wrap; }
.info-item { display: flex; flex-direction: column; gap: 2px; }
.info-label { font-size: 11px; color: var(--gray-400); font-weight: 500; }
.info-value { font-size: 14px; color: var(--gray-800); font-weight: 500; }
.info-link { color: var(--primary-light); text-decoration: none; }
.info-link:hover { text-decoration: underline; }

.inq-message { font-size: 14px; color: var(--gray-700); line-height: 1.7; white-space: pre-wrap; background: var(--gray-50); padding: 12px 16px; border-radius: var(--radius); }

.inq-reply-section { background: #f0fdf4; border-radius: var(--radius); padding: 12px 16px; }
.inq-reply-text { font-size: 14px; color: #065f46; line-height: 1.7; white-space: pre-wrap; }

.inq-reply-box { display: flex; gap: 10px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--gray-100); }
.inq-reply-box textarea { flex: 1; padding: 8px 12px; border: 1px solid var(--border-light); border-radius: var(--radius); font-size: 13px; font-family: inherit; color: var(--gray-800); resize: vertical; }
.inq-reply-box textarea:focus { outline: none; border-color: var(--primary-light); box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

.pagination-bar { display: flex; justify-content: center; margin-top: 24px; }
.pagination { display: flex; gap: 4px; }
.page-btn { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-light); border-radius: var(--radius); background: white; color: var(--gray-600); font-size: 13px; cursor: pointer; transition: var(--transition); font-family: inherit; }
.page-btn:hover:not(:disabled) { border-color: var(--primary-light); color: var(--primary-light); }
.page-btn.active { background: var(--primary-light); color: white; border-color: var(--primary-light); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.loading-spinner { width: 32px; height: 32px; border: 3px solid var(--gray-200); border-top-color: var(--primary-light); border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 640px) {
  .inq-header { flex-direction: column; align-items: flex-start; }
  .inq-info-grid { flex-direction: column; gap: 10px; }
  .inq-reply-box { flex-direction: column; }
}
</style>
