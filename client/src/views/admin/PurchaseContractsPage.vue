<template>
  <div class="purchase-page">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <h2 class="page-title">{{ t('purchaseContractManagement') }}</h2>
        <p class="page-desc">{{ t('purchaseContractDesc') }}</p>
      </div>
    </div>

    <!-- 状态统计卡片 -->
    <div class="stats-bar">
      <div class="stat-card" :class="{ active: filters.status === '' }" @click="filters.status = ''; loadContracts()">
        <span class="stat-num">{{ stats.total || 0 }}</span>
        <span class="stat-label">{{ t('pcAll') }}</span>
      </div>
      <div class="stat-card stat-pending" :class="{ active: filters.status === 'pending' }" @click="filters.status = 'pending'; loadContracts()">
        <span class="stat-num">{{ stats.pending || 0 }}</span>
        <span class="stat-label">{{ t('pcPending') }}</span>
      </div>
      <div class="stat-card stat-confirmed" :class="{ active: filters.status === 'confirmed' }" @click="filters.status = 'confirmed'; loadContracts()">
        <span class="stat-num">{{ stats.confirmed || 0 }}</span>
        <span class="stat-label">{{ t('pcConfirmed') }}</span>
      </div>
      <div class="stat-card stat-production" :class="{ active: filters.status === 'in_production' }" @click="filters.status = 'in_production'; loadContracts()">
        <span class="stat-num">{{ stats.in_production || 0 }}</span>
        <span class="stat-label">{{ t('pcInProduction') }}</span>
      </div>
      <div class="stat-card stat-delivered" :class="{ active: filters.status === 'delivered' }" @click="filters.status = 'delivered'; loadContracts()">
        <span class="stat-num">{{ stats.delivered || 0 }}</span>
        <span class="stat-label">{{ t('pcDelivered') }}</span>
      </div>
      <div class="stat-card stat-completed" :class="{ active: filters.status === 'completed' }" @click="filters.status = 'completed'; loadContracts()">
        <span class="stat-num">{{ stats.completed || 0 }}</span>
        <span class="stat-label">{{ t('pcCompleted') }}</span>
      </div>
    </div>

    <!-- 搜索筛选 -->
    <div class="filter-bar">
      <div class="filter-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>
        <input v-model="filters.supplier" :placeholder="t('supplierName')" @keyup.enter="loadContracts()" />
      </div>
      <button class="btn btn-sm btn-primary" @click="loadContracts()">{{ t('search') }}</button>
      <button v-if="selectedIds.length" class="btn btn-sm btn-danger-outline" @click="batchDelete">
        {{ t('delete') }} ({{ selectedIds.length }})
      </button>
    </div>

    <!-- 表格 -->
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th><input type="checkbox" :checked="allSelected" @change="toggleAll" /></th>
            <th>ID</th>
            <th>{{ t('supplierName') }}</th>
            <th>{{ t('pcItemCount') }}</th>
            <th>{{ t('totalAmount') }}</th>
            <th>{{ t('status') }}</th>
            <th>{{ t('createdAt') }}</th>
            <th>{{ t('actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in contracts" :key="item.id" class="contract-row" @click="openDetail(item)">
            <td @click.stop><input type="checkbox" :checked="selectedIds.includes(item.id)" @change="toggleSelect(item.id)" /></td>
            <td class="td-id">#{{ item.id }}</td>
            <td>
              <span class="supplier-tag">{{ item.supplier_name || '-' }}</span>
            </td>
            <td>{{ (item.items || []).length }} {{ t('orderItemUnit') }}</td>
            <td class="td-price">
              <span v-if="item.total_amount > 0">{{ formatAmount(item.total_amount, item.currency) }}</span>
              <span v-else class="no-price">-</span>
            </td>
            <td>
              <span :class="['status-badge', `status-${item.status}`]">{{ getStatusLabel(item.status) }}</span>
            </td>
            <td class="td-time">{{ formatDate(item.created_at) }}</td>
            <td class="td-actions" @click.stop>
              <button class="btn-icon" @click="openDetail(item)" :title="t('view')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <button class="btn-icon btn-icon-danger" @click="deleteOne(item.id)" :title="t('delete')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </td>
          </tr>
          <tr v-if="contracts.length === 0">
            <td colspan="8" class="td-empty">{{ t('noData') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div v-if="pagination.totalPages > 1" class="pagination-bar">
      <span class="page-info">{{ pagination.total }} records</span>
      <div class="pagination">
        <button class="page-btn" :disabled="currentPage <= 1" @click="currentPage--; loadContracts()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button v-for="n in visiblePages" :key="n" :class="['page-btn', { active: n === currentPage }]" @click="currentPage = n; loadContracts()">{{ n }}</button>
        <button class="page-btn" :disabled="currentPage >= pagination.totalPages" @click="currentPage++; loadContracts()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDetail" class="modal-overlay" @click.self="showDetail = false">
          <div class="form-modal detail-modal">
            <div class="form-modal-header">
              <h3>{{ t('purchaseContractDetail') }}</h3>
              <button class="modal-close" @click="showDetail = false">&times;</button>
            </div>
            <div class="form-body" v-if="detailData">
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">{{ t('contractId') }}</span>
                  <span class="detail-value">#{{ detailData.id }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">{{ t('supplierName') }}</span>
                  <span class="detail-value supplier-tag-lg">{{ detailData.supplier_name }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">{{ t('totalAmount') }}</span>
                  <span class="detail-value price-value">{{ formatAmount(detailData.total_amount, detailData.currency) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">{{ t('status') }}</span>
                  <span class="detail-value">
                    <select class="status-select" :value="detailData.status" @change="changeStatus(detailData.id, $event.target.value)">
                      <option value="pending">{{ t('pcPending') }}</option>
                      <option value="confirmed">{{ t('pcConfirmed') }}</option>
                      <option value="in_production">{{ t('pcInProduction') }}</option>
                      <option value="delivered">{{ t('pcDelivered') }}</option>
                      <option value="completed">{{ t('pcCompleted') }}</option>
                      <option value="cancelled">{{ t('pcCancelled') }}</option>
                    </select>
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">{{ t('createdAt') }}</span>
                  <span class="detail-value">{{ formatDate(detailData.created_at) }}</span>
                </div>
              </div>

              <!-- 关联订单 -->
              <div v-if="detailData.order_ids" class="detail-section">
                <span class="detail-label">{{ t('pcRelatedOrders') }}</span>
                <div class="order-tags">
                  <span v-for="oid in parseOrderIds(detailData.order_ids)" :key="oid" class="order-tag">#{{ oid }}</span>
                </div>
              </div>

              <!-- 合同明细 -->
              <div class="detail-section">
                <span class="detail-label">{{ t('pcItems') }}</span>
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>{{ t('oeNumber') }}</th>
                      <th>{{ t('quotationQuantity') }}</th>
                      <th>{{ t('unitPrice') }}</th>
                      <th>{{ t('subtotal') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in (detailData.items || [])" :key="item.id">
                      <td class="td-oe">{{ item.oe_number }}</td>
                      <td>{{ item.quantity }}</td>
                      <td>{{ item.unit_price > 0 ? `${item.unit_price} ${item.currency}` : '-' }}</td>
                      <td class="td-price">{{ formatAmount((item.unit_price || 0) * (item.quantity || 0), item.currency) }}</td>
                    </tr>
                    <tr v-if="!(detailData.items && detailData.items.length)">
                      <td colspan="4" class="td-empty">{{ t('noData') }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-if="detailData.remark" class="detail-remark">
                <span class="detail-label">{{ t('remark') }}</span>
                <p>{{ detailData.remark }}</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  getPurchaseContracts, updatePurchaseContractStatus,
  deletePurchaseContract, batchDeletePurchaseContracts
} from '../../api/modules';

const { t } = useI18n();

const contracts = ref([]);
const loading = ref(false);
const currentPage = ref(1);
const pagination = ref({ total: 0, totalPages: 0 });
const selectedIds = ref([]);
const stats = ref({});
const filters = ref({ supplier: '', status: '' });

// 详情
const showDetail = ref(false);
const detailData = ref(null);

const allSelected = computed(() => contracts.value.length > 0 && selectedIds.value.length === contracts.value.length);
const visiblePages = computed(() => {
  const pages = [];
  let s = Math.max(1, currentPage.value - 2);
  let e = Math.min(pagination.value.totalPages, s + 4);
  if (e - s < 4) s = Math.max(1, e - 4);
  for (let i = s; i <= e; i++) pages.push(i);
  return pages;
});

function getStatusLabel(status) {
  const map = {
    pending: t('pcPending'),
    confirmed: t('pcConfirmed'),
    in_production: t('pcInProduction'),
    delivered: t('pcDelivered'),
    completed: t('pcCompleted'),
    cancelled: t('pcCancelled'),
  };
  return map[status] || status;
}

function formatAmount(amount, currency) {
  if (!amount) return '-';
  return `${Number(amount).toFixed(2)} ${currency || 'USD'}`;
}

function formatDate(dt) {
  if (!dt) return '-';
  return dt.replace('T', ' ').substring(0, 16);
}

function parseOrderIds(ids) {
  try { return JSON.parse(ids); } catch(e) { return []; }
}

function toggleAll(e) {
  selectedIds.value = e.target.checked ? contracts.value.map(c => c.id) : [];
}
function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id);
  if (idx >= 0) selectedIds.value.splice(idx, 1);
  else selectedIds.value.push(id);
}

async function loadContracts() {
  loading.value = true;
  try {
    const params = { page: currentPage.value, limit: 20 };
    if (filters.value.supplier) params.supplier = filters.value.supplier;
    if (filters.value.status) params.status = filters.value.status;
    const res = await getPurchaseContracts(params);
    if (res.success) {
      contracts.value = res.data.items;
      pagination.value = res.data.pagination;
      stats.value = res.data.stats || {};
    }
  } catch (e) {}
  loading.value = false;
}

async function changeStatus(id, status) {
  try {
    await updatePurchaseContractStatus(id, status);
    if (detailData.value && detailData.value.id === id) {
      detailData.value.status = status;
    }
    await loadContracts();
  } catch (e) {}
}

function openDetail(item) {
  detailData.value = item;
  showDetail.value = true;
}

async function deleteOne(id) {
  if (!confirm(t('delete') + '?')) return;
  await deletePurchaseContract(id);
  selectedIds.value = selectedIds.value.filter(i => i !== id);
  await loadContracts();
}

async function batchDelete() {
  if (!confirm(t('confirmBatchDelete'))) return;
  await batchDeletePurchaseContracts(selectedIds.value);
  selectedIds.value = [];
  await loadContracts();
}

onMounted(() => loadContracts());
</script>

<style scoped>
.purchase-page { max-width: 1400px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
.page-title { font-size: 22px; font-weight: 700; color: var(--gray-900); margin-bottom: 4px; }
.page-desc { font-size: 14px; color: var(--gray-400); }

/* Stats Bar */
.stats-bar { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.stat-card { flex: 1; min-width: 90px; padding: 14px 18px; background: white; border: 1px solid var(--border-light); border-radius: var(--radius-lg); cursor: pointer; text-align: center; transition: var(--transition); }
.stat-card:hover { border-color: var(--primary-light); box-shadow: 0 2px 8px rgba(59,130,246,0.1); }
.stat-card.active { border-color: var(--primary-light); background: #f0f7ff; }
.stat-num { display: block; font-size: 24px; font-weight: 700; color: var(--gray-800); }
.stat-label { display: block; font-size: 12px; color: var(--gray-500); margin-top: 2px; }
.stat-pending .stat-num { color: #f59e0b; }
.stat-confirmed .stat-num { color: #3b82f6; }
.stat-production .stat-num { color: #8b5cf6; }
.stat-delivered .stat-num { color: #06b6d4; }
.stat-completed .stat-num { color: #10b981; }

/* Filter Bar */
.filter-bar { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
.filter-search { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: white; border: 1px solid var(--border-light); border-radius: var(--radius); min-width: 180px; }
.filter-search svg { color: var(--gray-400); flex-shrink: 0; }
.filter-search input { border: none; outline: none; font-size: 14px; width: 100%; font-family: inherit; color: var(--gray-700); }

/* Table */
.table-wrap { background: white; border-radius: var(--radius-lg); border: 1px solid var(--border-light); overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--gray-100); font-size: 14px; }
.data-table th { background: var(--gray-50); font-weight: 600; color: var(--gray-600); font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
.contract-row { cursor: pointer; }
.contract-row:hover td { background: #f8fafc; }
.td-id { font-weight: 600; color: var(--gray-500); white-space: nowrap; }
.supplier-tag { display: inline-block; padding: 2px 10px; background: #f0fdf4; color: #16a34a; border-radius: 12px; font-size: 13px; font-weight: 500; }
.supplier-tag-lg { font-size: 16px; font-weight: 700; color: #16a34a; }
.td-price { font-weight: 600; color: var(--gray-900); font-variant-numeric: tabular-nums; }
.td-time { font-size: 13px; color: var(--gray-500); white-space: nowrap; }
.td-actions { white-space: nowrap; }
.td-empty { text-align: center; color: var(--gray-400); padding: 48px 16px !important; }

/* Status Badge */
.status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.status-pending { background: #fffbeb; color: #d97706; }
.status-confirmed { background: #eff6ff; color: #2563eb; }
.status-in_production { background: #f5f3ff; color: #7c3aed; }
.status-delivered { background: #ecfeff; color: #0891b2; }
.status-completed { background: #f0fdf4; color: #16a34a; }
.status-cancelled { background: var(--gray-100); color: var(--gray-500); }

/* Buttons */
.btn-icon { width: 32px; height: 32px; border: none; background: none; border-radius: var(--radius); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; color: var(--gray-500); transition: var(--transition); }
.btn-icon:hover { background: var(--gray-100); color: var(--primary-light); }
.btn-icon-danger:hover { background: #fef2f2; color: #dc2626; }

/* Pagination */
.pagination-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
.page-info { font-size: 13px; color: var(--gray-400); }
.pagination { display: flex; gap: 4px; }
.page-btn { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-light); border-radius: var(--radius); background: white; color: var(--gray-600); font-size: 13px; cursor: pointer; transition: var(--transition); font-family: inherit; }
.page-btn:hover:not(:disabled) { border-color: var(--primary-light); color: var(--primary-light); }
.page-btn.active { background: var(--primary-light); color: white; border-color: var(--primary-light); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(15,23,42,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 24px; }
.form-modal { background: white; border-radius: var(--radius-xl); width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 60px rgba(0,0,0,0.2); }
.form-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--gray-100); }
.form-modal-header h3 { font-size: 17px; font-weight: 700; }
.modal-close { width: 32px; height: 32px; border: none; background: var(--gray-100); border-radius: var(--radius-full); font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--gray-500); }
.modal-close:hover { background: var(--gray-200); }
.form-body { padding: 24px; }

/* Detail */
.detail-modal { max-width: 750px; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.detail-item { display: flex; flex-direction: column; gap: 2px; }
.detail-label { font-size: 12px; font-weight: 600; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.04em; }
.detail-value { font-size: 14px; color: var(--gray-800); }
.price-value { font-size: 18px; font-weight: 700; color: var(--primary-light); }

.detail-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--gray-100); }
.detail-section .detail-label { margin-bottom: 10px; display: block; }
.detail-table { width: 100%; border-collapse: collapse; }
.detail-table th, .detail-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--gray-100); font-size: 13px; }
.detail-table th { background: var(--gray-50); font-weight: 600; color: var(--gray-500); font-size: 11px; text-transform: uppercase; }
.detail-table .td-oe { font-weight: 600; color: var(--primary-light); }
.detail-table .td-price { font-weight: 600; font-variant-numeric: tabular-nums; }
.detail-table .td-empty { text-align: center; color: var(--gray-400); padding: 32px !important; }

.detail-remark { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--gray-100); }
.detail-remark p { font-size: 14px; color: var(--gray-700); margin-top: 4px; line-height: 1.6; }

.status-select { padding: 5px 10px; border: 1px solid var(--border-light); border-radius: var(--radius); font-size: 13px; font-family: inherit; color: var(--gray-800); background: white; cursor: pointer; }

.order-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
.order-tag { display: inline-block; padding: 2px 10px; background: #eff6ff; color: #2563eb; border-radius: 12px; font-size: 12px; font-weight: 500; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

@media (max-width: 640px) {
  .detail-grid { grid-template-columns: 1fr; }
  .filter-search { min-width: 150px; }
  .stats-bar { gap: 8px; }
  .stat-card { min-width: 70px; padding: 10px 12px; }
  .stat-num { font-size: 20px; }
}
</style>
