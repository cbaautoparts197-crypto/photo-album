<template>
  <div class="quotations-page">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <h2 class="page-title">{{ t('quotationManagement') }}</h2>
        <p class="page-desc">{{ t('quotationDesc') }}</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-outline" @click="showImport = true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          {{ t('importExcel') }}
        </button>
        <button class="btn btn-primary" @click="openForm()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {{ t('addQuotation') }}
        </button>
      </div>
    </div>

    <!-- 状态统计卡片 -->
    <div class="stats-bar">
      <div class="stat-card" :class="{ active: filters.status === '' }" @click="filters.status = ''; loadQuotations()">
        <span class="stat-num">{{ stats.total || 0 }}</span>
        <span class="stat-label">{{ t('quotationAll') }}</span>
      </div>
      <div class="stat-card stat-pending" :class="{ active: filters.status === 'pending' }" @click="filters.status = 'pending'; loadQuotations()">
        <span class="stat-num">{{ stats.pending || 0 }}</span>
        <span class="stat-label">{{ t('quotationPending') }}</span>
      </div>
      <div class="stat-card stat-quoted" :class="{ active: filters.status === 'quoted' }" @click="filters.status = 'quoted'; loadQuotations()">
        <span class="stat-num">{{ stats.quoted || 0 }}</span>
        <span class="stat-label">{{ t('quotationQuoted') }}</span>
      </div>
      <div class="stat-card stat-sent" :class="{ active: filters.status === 'sent' }" @click="filters.status = 'sent'; loadQuotations()">
        <span class="stat-num">{{ stats.sent || 0 }}</span>
        <span class="stat-label">{{ t('quotationSent') }}</span>
      </div>
      <div class="stat-card stat-closed" :class="{ active: filters.status === 'closed' }" @click="filters.status = 'closed'; loadQuotations()">
        <span class="stat-num">{{ stats.closed || 0 }}</span>
        <span class="stat-label">{{ t('quotationClosed') }}</span>
      </div>
    </div>

    <!-- 搜索筛选 -->
    <div class="filter-bar">
      <div class="filter-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="filters.oe_number" :placeholder="t('oeNumber')" @keyup.enter="loadQuotations()" />
      </div>
      <div class="filter-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <input v-model="filters.customer" :placeholder="t('quotationCustomer')" @keyup.enter="loadQuotations()" />
      </div>
      <select v-model="filters.source" class="filter-select" @change="loadQuotations()">
        <option value="">{{ t('quotationAllSources') }}</option>
        <option value="inquiry">{{ t('quotationSourceInquiry') }}</option>
        <option value="internal">{{ t('quotationSourceInternal') }}</option>
      </select>
      <button class="btn btn-sm btn-primary" @click="loadQuotations()">{{ t('search') }}</button>
      <button v-if="selectedIds.length" class="btn btn-sm btn-auto-price" @click="doBatchAutoPrice">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        {{ t('quotationAutoPrice') }} ({{ selectedIds.length }})
      </button>
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
            <th>{{ t('oeNumber') }}</th>
            <th>{{ t('quotationCustomer') }}</th>
            <th>{{ t('quotationQuantity') }}</th>
            <th>{{ t('unitPrice') }}</th>
            <th>{{ t('supplierName') }}</th>
            <th>{{ t('status') }}</th>
            <th>{{ t('quotationSource') }}</th>
            <th>{{ t('actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in quotations" :key="item.id" class="quotation-row" @click="openDetail(item)">
            <td @click.stop><input type="checkbox" :checked="selectedIds.includes(item.id)" @change="toggleSelect(item.id)" /></td>
            <td class="td-oe">
              {{ item.oe_number }}
              <div v-if="item.product_images && item.product_images.length" class="td-images">
                <img v-for="(img, idx) in item.product_images.slice(0, 3)" :key="idx" :src="img.qiniu_url" class="td-thumb" @click.stop />
              </div>
            </td>
            <td>
              <div class="td-customer">{{ item.customer_name || '-' }}</div>
              <div v-if="item.customer_company" class="td-company">{{ item.customer_company }}</div>
            </td>
            <td>{{ item.quantity }}</td>
            <td class="td-price">
              <span v-if="item.unit_price > 0">{{ item.unit_price }} <small>{{ item.currency }}</small></span>
              <span v-else class="no-price">-</span>
            </td>
            <td>{{ item.supplier_name || '-' }}</td>
            <td>
              <span :class="['status-badge', `status-${item.status}`]">{{ getStatusLabel(item.status) }}</span>
            </td>
            <td>
              <span :class="['source-badge', `source-${item.source}`]">{{ item.source === 'inquiry' ? t('quotationSourceInquiry') : t('quotationSourceInternal') }}</span>
            </td>
            <td class="td-actions" @click.stop>
              <button v-if="item.status === 'pending'" class="btn-icon btn-icon-price" @click="autoPriceOne(item.id)" :title="t('quotationAutoPrice')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </button>
              <button class="btn-icon" @click="openForm(item)" :title="t('edit')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon btn-icon-danger" @click="deleteOne(item.id)" :title="t('delete')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </td>
          </tr>
          <tr v-if="quotations.length === 0">
            <td colspan="9" class="td-empty">{{ t('noData') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div v-if="pagination.totalPages > 1" class="pagination-bar">
      <span class="page-info">{{ pagination.total }} records</span>
      <div class="pagination">
        <button class="page-btn" :disabled="currentPage <= 1" @click="currentPage--; loadQuotations()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button v-for="n in visiblePages" :key="n" :class="['page-btn', { active: n === currentPage }]" @click="currentPage = n; loadQuotations()">{{ n }}</button>
        <button class="page-btn" :disabled="currentPage >= pagination.totalPages" @click="currentPage++; loadQuotations()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>

    <!-- 添加/编辑弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
          <div class="form-modal">
            <div class="form-modal-header">
              <h3>{{ editingId ? t('editQuotation') : t('addQuotation') }}</h3>
              <button class="modal-close" @click="showForm = false">&times;</button>
            </div>
            <form class="form-body" @submit.prevent="saveQuotation">
              <div class="form-grid">
                <div class="form-field">
                  <label>{{ t('oeNumber') }} *</label>
                  <input v-model="form.oe_number" required placeholder="e.g. 12305-0P010" />
                </div>
                <div class="form-field">
                  <label>{{ t('quotationQuantity') }}</label>
                  <input v-model.number="form.quantity" type="number" min="1" placeholder="1" />
                </div>
                <div class="form-field">
                  <label>{{ t('quotationCustomer') }}</label>
                  <input v-model="form.customer_name" :placeholder="t('quotationCustomer')" />
                </div>
                <div class="form-field">
                  <label>{{ t('inquiryCompany') }}</label>
                  <input v-model="form.customer_company" :placeholder="t('inquiryCompany')" />
                </div>
                <div class="form-field">
                  <label>{{ t('unitPrice') }}</label>
                  <input v-model.number="form.unit_price" type="number" step="0.01" min="0" placeholder="0.00 (auto)" />
                </div>
                <div class="form-field">
                  <label>{{ t('currency') }}</label>
                  <select v-model="form.currency">
                    <option value="USD">USD</option>
                    <option value="CNY">CNY</option>
                    <option value="EUR">EUR</option>
                    <option value="JPY">JPY</option>
                  </select>
                </div>
                <div class="form-field">
                  <label>{{ t('supplierName') }}</label>
                  <input v-model="form.supplier_name" :placeholder="t('supplierName') + ' (auto)'" />
                </div>
                <div class="form-field">
                  <label>{{ t('status') }}</label>
                  <select v-model="form.status">
                    <option value="pending">{{ t('quotationPending') }}</option>
                    <option value="quoted">{{ t('quotationQuoted') }}</option>
                    <option value="sent">{{ t('quotationSent') }}</option>
                    <option value="closed">{{ t('quotationClosed') }}</option>
                  </select>
                </div>
              </div>
              <div class="form-field" style="margin-top:12px;">
                <label>{{ t('remark') }}</label>
                <textarea v-model="form.remark" rows="2" :placeholder="t('remark')"></textarea>
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-outline" @click="showForm = false">{{ t('cancel') }}</button>
                <button type="submit" class="btn btn-primary">{{ t('save') }}</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 详情弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDetail" class="modal-overlay" @click.self="showDetail = false">
          <div class="form-modal detail-modal">
            <div class="form-modal-header">
              <h3>{{ t('quotationDetail') }}</h3>
              <button class="modal-close" @click="showDetail = false">&times;</button>
            </div>
            <div class="form-body" v-if="detailData">
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">{{ t('oeNumber') }}</span>
                  <span class="detail-value">{{ detailData.oe_number }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">{{ t('quotationCustomer') }}</span>
                  <span class="detail-value">{{ detailData.customer_name || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">{{ t('inquiryCompany') }}</span>
                  <span class="detail-value">{{ detailData.customer_company || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">{{ t('inquiryEmail') }}</span>
                  <span class="detail-value">{{ detailData.customer_email || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">{{ t('inquiryPhone') }}</span>
                  <span class="detail-value">{{ detailData.customer_phone || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">{{ t('quotationQuantity') }}</span>
                  <span class="detail-value">{{ detailData.quantity }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">{{ t('unitPrice') }}</span>
                  <span class="detail-value price-value">{{ detailData.unit_price > 0 ? `${detailData.unit_price} ${detailData.currency}` : '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">{{ t('supplierName') }}</span>
                  <span class="detail-value">{{ detailData.supplier_name || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">{{ t('status') }}</span>
                  <span class="detail-value"><span :class="['status-badge', `status-${detailData.status}`]">{{ getStatusLabel(detailData.status) }}</span></span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">{{ t('quotationSource') }}</span>
                  <span class="detail-value">{{ detailData.source === 'inquiry' ? t('quotationSourceInquiry') : t('quotationSourceInternal') }}</span>
                </div>
              </div>
              <div v-if="detailData.remark" class="detail-remark">
                <span class="detail-label">{{ t('remark') }}</span>
                <p>{{ detailData.remark }}</p>
              </div>

              <!-- 关联产品图片 -->
              <div v-if="detailData.product_images && detailData.product_images.length" class="detail-images">
                <span class="detail-label">{{ t('quotationProductImages') }}</span>
                <div class="images-grid">
                  <div v-for="img in detailData.product_images" :key="img.id" class="image-card">
                    <img :src="img.qiniu_url" :alt="img.name" />
                    <div class="image-name">{{ img.name }}</div>
                    <div v-if="img.oe_number" class="image-oe">OE: {{ img.oe_number }}</div>
                  </div>
                </div>
              </div>
              <div v-else class="no-images">
                {{ t('quotationNoImages') }}
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 导入弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showImport" class="modal-overlay" @click.self="showImport = false">
          <div class="form-modal" style="max-width:520px;">
            <div class="form-modal-header">
              <h3>{{ t('importExcel') }}</h3>
              <button class="modal-close" @click="showImport = false">&times;</button>
            </div>
            <div class="form-body">
              <p class="import-hint">{{ t('quotationImportHint') }}</p>
              <div class="import-upload-area">
                <input type="file" ref="fileInput" accept=".xlsx,.xls,.csv" style="display:none" @change="onFileChange" />
                <button class="btn btn-outline" @click="$refs.fileInput.click()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  {{ t('importBtn') }}
                </button>
                <span v-if="importFile" class="import-filename">{{ importFile.name }}</span>
              </div>
              <div v-if="importResult" class="import-result" :class="{ 'import-result-success': importResult.success }">
                {{ importResult.message }}
              </div>
              <div class="form-actions" style="margin-top:16px;">
                <button type="button" class="btn btn-outline" @click="showImport = false">{{ t('cancel') }}</button>
                <button type="button" class="btn btn-primary" :disabled="!importFile || importing" @click="doImport">
                  {{ importing ? t('importing') : t('importBtn') }}
                </button>
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
  getQuotations, createQuotation, updateQuotation, deleteQuotation,
  batchDeleteQuotations, autoPriceQuotation, batchAutoPrice, importQuotations
} from '../../api/modules';

const { t } = useI18n();

const quotations = ref([]);
const loading = ref(false);
const currentPage = ref(1);
const pagination = ref({ total: 0, totalPages: 0 });
const selectedIds = ref([]);
const stats = ref({});

const filters = ref({ oe_number: '', customer: '', source: '', status: '' });

// 表单
const showForm = ref(false);
const editingId = ref(null);
const form = ref({
  oe_number: '', quantity: 1, customer_name: '', customer_company: '',
  customer_email: '', customer_phone: '', unit_price: 0,
  currency: 'USD', supplier_name: '', remark: '', status: 'pending'
});

// 详情
const showDetail = ref(false);
const detailData = ref(null);

// 导入
const showImport = ref(false);
const importFile = ref(null);
const importing = ref(false);
const importResult = ref(null);

const allSelected = computed(() => quotations.value.length > 0 && selectedIds.value.length === quotations.value.length);
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
    pending: t('quotationPending'),
    quoted: t('quotationQuoted'),
    sent: t('quotationSent'),
    closed: t('quotationClosed'),
  };
  return map[status] || status;
}

function toggleAll(e) {
  selectedIds.value = e.target.checked ? quotations.value.map(q => q.id) : [];
}
function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id);
  if (idx >= 0) selectedIds.value.splice(idx, 1);
  else selectedIds.value.push(id);
}

async function loadQuotations() {
  loading.value = true;
  try {
    const params = { page: currentPage.value, limit: 20 };
    if (filters.value.oe_number) params.oe_number = filters.value.oe_number;
    if (filters.value.customer) params.customer = filters.value.customer;
    if (filters.value.source) params.source = filters.value.source;
    if (filters.value.status) params.status = filters.value.status;
    const res = await getQuotations(params);
    if (res.success) {
      quotations.value = res.data.items;
      pagination.value = res.data.pagination;
      stats.value = res.data.stats || {};
    }
  } catch (e) {}
  loading.value = false;
}

function openForm(item) {
  if (item) {
    editingId.value = item.id;
    form.value = {
      oe_number: item.oe_number, quantity: item.quantity,
      customer_name: item.customer_name || '', customer_company: item.customer_company || '',
      customer_email: item.customer_email || '', customer_phone: item.customer_phone || '',
      unit_price: item.unit_price || 0, currency: item.currency || 'USD',
      supplier_name: item.supplier_name || '', remark: item.remark || '',
      status: item.status || 'pending'
    };
  } else {
    editingId.value = null;
    form.value = {
      oe_number: '', quantity: 1, customer_name: '', customer_company: '',
      customer_email: '', customer_phone: '', unit_price: 0,
      currency: 'USD', supplier_name: '', remark: '', status: 'pending'
    };
  }
  showForm.value = true;
}

async function saveQuotation() {
  try {
    if (editingId.value) {
      await updateQuotation(editingId.value, form.value);
    } else {
      await createQuotation(form.value);
    }
    showForm.value = false;
    await loadQuotations();
  } catch (e) {}
}

async function deleteOne(id) {
  if (!confirm(t('delete') + '?')) return;
  await deleteQuotation(id);
  selectedIds.value = selectedIds.value.filter(i => i !== id);
  await loadQuotations();
}

async function batchDelete() {
  if (!confirm(t('confirmBatchDelete'))) return;
  await batchDeleteQuotations(selectedIds.value);
  selectedIds.value = [];
  await loadQuotations();
}

async function autoPriceOne(id) {
  try {
    const res = await autoPriceQuotation(id);
    if (res.success) {
      await loadQuotations();
    } else {
      alert(res.message);
    }
  } catch (e) {}
}

async function doBatchAutoPrice() {
  const pendingIds = selectedIds.value;
  try {
    const res = await batchAutoPrice(pendingIds);
    alert(res.message);
    if (res.success) {
      selectedIds.value = [];
      await loadQuotations();
    }
  } catch (e) {}
}

function openDetail(item) {
  detailData.value = item;
  showDetail.value = true;
}

function onFileChange(e) {
  importFile.value = e.target.files[0] || null;
  importResult.value = null;
}

async function doImport() {
  if (!importFile.value) return;
  importing.value = true;
  importResult.value = null;
  try {
    const fd = new FormData();
    fd.append('file', importFile.value);
    const res = await importQuotations(fd);
    importResult.value = res;
    if (res.success) {
      importFile.value = null;
      await loadQuotations();
    }
  } catch (e) {
    importResult.value = { success: false, message: e.message };
  }
  importing.value = false;
}

onMounted(() => loadQuotations());
</script>

<style scoped>
.quotations-page { max-width: 1400px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
.page-title { font-size: 22px; font-weight: 700; color: var(--gray-900); margin-bottom: 4px; }
.page-desc { font-size: 14px; color: var(--gray-400); }
.header-actions { display: flex; gap: 10px; }

/* Stats Bar */
.stats-bar { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.stat-card { flex: 1; min-width: 100px; padding: 14px 18px; background: white; border: 1px solid var(--border-light); border-radius: var(--radius-lg); cursor: pointer; text-align: center; transition: var(--transition); }
.stat-card:hover { border-color: var(--primary-light); box-shadow: 0 2px 8px rgba(59,130,246,0.1); }
.stat-card.active { border-color: var(--primary-light); background: #f0f7ff; }
.stat-num { display: block; font-size: 24px; font-weight: 700; color: var(--gray-800); }
.stat-label { display: block; font-size: 12px; color: var(--gray-500); margin-top: 2px; }
.stat-pending .stat-num { color: #f59e0b; }
.stat-quoted .stat-num { color: #3b82f6; }
.stat-sent .stat-num { color: #10b981; }
.stat-closed .stat-num { color: var(--gray-400); }

/* Filter Bar */
.filter-bar { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
.filter-search { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: white; border: 1px solid var(--border-light); border-radius: var(--radius); min-width: 180px; }
.filter-search svg { color: var(--gray-400); flex-shrink: 0; }
.filter-search input { border: none; outline: none; font-size: 14px; width: 100%; font-family: inherit; color: var(--gray-700); }
.filter-select { padding: 8px 14px; border: 1px solid var(--border-light); border-radius: var(--radius); font-size: 14px; font-family: inherit; color: var(--gray-700); background: white; cursor: pointer; }

.btn-auto-price { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; border: none; display: inline-flex; align-items: center; gap: 6px; }
.btn-auto-price:hover { box-shadow: 0 2px 8px rgba(59,130,246,0.3); }

/* Table */
.table-wrap { background: white; border-radius: var(--radius-lg); border: 1px solid var(--border-light); overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--gray-100); font-size: 14px; }
.data-table th { background: var(--gray-50); font-weight: 600; color: var(--gray-600); font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
.quotation-row { cursor: pointer; }
.quotation-row:hover td { background: #f8fafc; }
.td-oe { font-weight: 600; color: var(--primary-light); white-space: nowrap; }
.td-images { display: flex; gap: 4px; margin-top: 4px; }
.td-thumb { width: 28px; height: 28px; object-fit: cover; border-radius: 4px; border: 1px solid var(--gray-200); }
.td-customer { font-weight: 500; }
.td-company { font-size: 12px; color: var(--gray-400); }
.td-price { font-weight: 600; color: var(--gray-900); font-variant-numeric: tabular-nums; }
.td-price small { font-size: 11px; color: var(--gray-400); font-weight: 400; }
.no-price { color: var(--gray-300); }
.td-actions { white-space: nowrap; }
.td-empty { text-align: center; color: var(--gray-400); padding: 48px 16px !important; }

/* Status Badge */
.status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.status-pending { background: #fffbeb; color: #d97706; }
.status-quoted { background: #eff6ff; color: #2563eb; }
.status-sent { background: #f0fdf4; color: #16a34a; }
.status-closed { background: var(--gray-100); color: var(--gray-500); }

/* Source Badge */
.source-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; }
.source-inquiry { background: #fdf4ff; color: #9333ea; }
.source-internal { background: #f0f9ff; color: #0284c7; }

/* Buttons */
.btn-icon { width: 32px; height: 32px; border: none; background: none; border-radius: var(--radius); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; color: var(--gray-500); transition: var(--transition); }
.btn-icon:hover { background: var(--gray-100); color: var(--primary-light); }
.btn-icon-price:hover { background: #eff6ff; color: #2563eb; }
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
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-field { display: flex; flex-direction: column; gap: 4px; }
.form-field label { font-size: 12px; font-weight: 600; color: var(--gray-600); }
.form-field input, .form-field select, .form-field textarea { padding: 9px 12px; border: 1px solid var(--border-light); border-radius: var(--radius); font-size: 14px; font-family: inherit; color: var(--gray-800); transition: var(--transition); }
.form-field input:focus, .form-field select:focus, .form-field textarea:focus { outline: none; border-color: var(--primary-light); box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }

/* Detail Modal */
.detail-modal { max-width: 700px; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.detail-item { display: flex; flex-direction: column; gap: 2px; }
.detail-label { font-size: 12px; font-weight: 600; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.04em; }
.detail-value { font-size: 14px; color: var(--gray-800); }
.price-value { font-size: 18px; font-weight: 700; color: var(--primary-light); }
.detail-remark { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--gray-100); }
.detail-remark p { font-size: 14px; color: var(--gray-700); margin-top: 4px; line-height: 1.6; }

/* Product Images in Detail */
.detail-images { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--gray-100); }
.images-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; margin-top: 8px; }
.image-card { border: 1px solid var(--border-light); border-radius: var(--radius); overflow: hidden; }
.image-card img { width: 100%; height: 100px; object-fit: cover; }
.image-name { padding: 6px 8px; font-size: 12px; font-weight: 500; color: var(--gray-700); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.image-oe { padding: 0 8px 6px; font-size: 11px; color: var(--primary-light); }
.no-images { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--gray-100); text-align: center; color: var(--gray-400); font-size: 14px; }

/* Import */
.import-hint { font-size: 13px; color: var(--gray-500); margin-bottom: 16px; line-height: 1.6; }
.import-upload-area { display: flex; align-items: center; gap: 12px; padding: 24px; border: 2px dashed var(--border-light); border-radius: var(--radius-lg); text-align: center; }
.import-filename { font-size: 13px; color: var(--gray-600); font-weight: 500; }
.import-result { margin-top: 12px; padding: 10px 14px; border-radius: var(--radius); font-size: 13px; font-weight: 500; background: #fef2f2; color: #dc2626; }
.import-result-success { background: #f0fdf4; color: #16a34a; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

@media (max-width: 640px) {
  .form-grid, .detail-grid { grid-template-columns: 1fr; }
  .filter-search { min-width: 150px; }
  .stats-bar { gap: 8px; }
  .stat-card { min-width: 70px; padding: 10px 12px; }
  .stat-num { font-size: 20px; }
}
</style>
