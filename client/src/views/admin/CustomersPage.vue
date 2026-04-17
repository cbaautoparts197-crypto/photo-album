<template>
  <div class="customers-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h1>{{ t('customerManagement') }}</h1>
        <span class="total-count">{{ t('total') }}: {{ pagination.total }}</span>
      </div>
      <div class="header-actions">
        <input v-model="keyword" :placeholder="t('customerSearchPlaceholder')" class="search-input" @keyup.enter="loadData" />
        <select v-model="sourceFilter" class="filter-select" @change="goPage(1)">
          <option value="">{{ t('customerAllSources') }}</option>
          <option value="inquiry">{{ t('customerSourceInquiry') }}</option>
          <option value="manual">{{ t('customerSourceManual') }}</option>
          <option value="excel">{{ t('customerSourceExcel') }}</option>
        </select>
        <button class="btn btn-primary" @click="openForm()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {{ t('addCustomer') }}
        </button>
        <button v-if="selectedIds.length" class="btn btn-danger" @click="handleBatchDelete">
          {{ t('batchDelete') }} ({{ selectedIds.length }})
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-number">{{ pagination.total }}</div>
        <div class="stat-label">{{ t('customerTotal') }}</div>
      </div>
      <div class="stat-card stat-inquiry">
        <div class="stat-number">{{ stats.inquiry || 0 }}</div>
        <div class="stat-label">{{ t('customerSourceInquiry') }}</div>
      </div>
      <div class="stat-card stat-manual">
        <div class="stat-number">{{ stats.manual || 0 }}</div>
        <div class="stat-label">{{ t('customerSourceManual') }}</div>
      </div>
      <div class="stat-card stat-excel">
        <div class="stat-number">{{ stats.excel || 0 }}</div>
        <div class="stat-label">{{ t('customerSourceExcel') }}</div>
      </div>
    </div>

    <!-- Table -->
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th><input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" /></th>
            <th>ID</th>
            <th>{{ t('customerName') }}</th>
            <th>{{ t('email') }}</th>
            <th>{{ t('inquiryCompany') }}</th>
            <th>{{ t('phone') }}</th>
            <th>{{ t('customerCountry') }}</th>
            <th>{{ t('customerSource') }}</th>
            <th>{{ t('customerQuotations') }}</th>
            <th>{{ t('customerInquiries') }}</th>
            <th>{{ t('createdAt') }}</th>
            <th>{{ t('actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="12" class="center-cell">
              <div class="spinner"></div>
            </td>
          </tr>
          <tr v-else-if="!customers.length">
            <td colspan="12" class="center-cell empty">{{ t('noData') }}</td>
          </tr>
          <tr v-for="c in customers" :key="c.id" :class="{ selected: selectedIds.includes(c.id) }" @click="viewDetail(c)">
            <td @click.stop><input type="checkbox" :checked="selectedIds.includes(c.id)" @change="toggleSelect(c.id)" /></td>
            <td>{{ c.id }}</td>
            <td class="name-cell">{{ c.name }}</td>
            <td class="mono">{{ c.email || '-' }}</td>
            <td>{{ c.company || '-' }}</td>
            <td class="mono">{{ c.phone || '-' }}</td>
            <td>{{ c.country || '-' }}</td>
            <td>
              <span :class="['source-tag', `source-${c.source}`]">{{ t(`customerSource${capitalize(c.source)}`) || c.source }}</span>
            </td>
            <td>
              <span v-if="c.quotation_count" class="count-badge">{{ c.quotation_count }}</span>
              <span v-else class="text-muted">0</span>
            </td>
            <td>
              <span v-if="c.inquiry_count" class="count-badge">{{ c.inquiry_count }}</span>
              <span v-else class="text-muted">0</span>
            </td>
            <td class="date-cell">{{ formatDate(c.created_at) }}</td>
            <td class="action-cell" @click.stop>
              <button class="btn-icon" :title="t('edit')" @click="openForm(c)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon btn-icon-danger" :title="t('delete')" @click="handleDelete(c)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.total > pagination.limit" class="pagination">
      <button class="btn" :disabled="pagination.page <= 1" @click="goPage(pagination.page - 1)">{{ t('prev') }}</button>
      <span class="page-info">{{ pagination.page }} / {{ totalPages }}</span>
      <button class="btn" :disabled="pagination.page >= totalPages" @click="goPage(pagination.page + 1)">{{ t('next') }}</button>
    </div>

    <!-- Form Modal -->
    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal-content form-modal">
        <div class="modal-header">
          <h2>{{ editing ? t('editCustomer') : t('addCustomer') }}</h2>
          <button class="modal-close" @click="showForm = false">&times;</button>
        </div>
        <div class="modal-body form-grid">
          <div class="form-group">
            <label>{{ t('customerName') }} *</label>
            <input v-model="form.name" :placeholder="t('customerName')" />
          </div>
          <div class="form-group">
            <label>{{ t('email') }}</label>
            <input v-model="form.email" type="email" :placeholder="t('email')" />
          </div>
          <div class="form-group">
            <label>{{ t('phone') }}</label>
            <input v-model="form.phone" :placeholder="t('phone')" />
          </div>
          <div class="form-group">
            <label>{{ t('inquiryCompany') }}</label>
            <input v-model="form.company" :placeholder="t('inquiryCompany')" />
          </div>
          <div class="form-group">
            <label>{{ t('customerCountry') }}</label>
            <input v-model="form.country" :placeholder="t('customerCountry')" />
          </div>
          <div class="form-group">
            <label>{{ t('customerSource') }}</label>
            <select v-model="form.source">
              <option value="manual">{{ t('customerSourceManual') }}</option>
              <option value="inquiry">{{ t('customerSourceInquiry') }}</option>
              <option value="excel">{{ t('customerSourceExcel') }}</option>
            </select>
          </div>
          <div class="form-group full">
            <label>{{ t('address') }}</label>
            <input v-model="form.address" :placeholder="t('address')" />
          </div>
          <div class="form-group full">
            <label>{{ t('remark') }}</label>
            <textarea v-model="form.remark" :placeholder="t('remark')" rows="3" class="form-textarea"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showForm = false">{{ t('cancel') }}</button>
          <button class="btn btn-primary" :disabled="!form.name || saving" @click="handleSave">
            <span v-if="saving" class="spinner-sm"></span>
            {{ t('save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetail" class="modal-overlay" @click.self="showDetail = false">
      <div class="modal-content detail-modal">
        <div class="modal-header">
          <h2>{{ t('customerDetail') }} - {{ detailCustomer.name }}</h2>
          <button class="modal-close" @click="showDetail = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">{{ t('customerName') }}</span>
              <span class="detail-value">{{ detailCustomer.name }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">{{ t('email') }}</span>
              <span class="detail-value mono">{{ detailCustomer.email || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">{{ t('phone') }}</span>
              <span class="detail-value mono">{{ detailCustomer.phone || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">{{ t('inquiryCompany') }}</span>
              <span class="detail-value">{{ detailCustomer.company || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">{{ t('customerCountry') }}</span>
              <span class="detail-value">{{ detailCustomer.country || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">{{ t('address') }}</span>
              <span class="detail-value">{{ detailCustomer.address || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">{{ t('customerSource') }}</span>
              <span :class="['source-tag', `source-${detailCustomer.source}`]">{{ t(`customerSource${capitalize(detailCustomer.source)}`) || detailCustomer.source }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">{{ t('remark') }}</span>
              <span class="detail-value">{{ detailCustomer.remark || '-' }}</span>
            </div>
          </div>

          <!-- Related Quotations -->
          <div class="detail-section">
            <h3>{{ t('customerQuotations') }} ({{ detailCustomer.quotations?.length || 0 }})</h3>
            <div v-if="detailCustomer.quotations?.length" class="mini-table-wrap">
              <table class="mini-table">
                <thead>
                  <tr>
                    <th>{{ t('oeNumber') }}</th>
                    <th>{{ t('quotationQuantity') }}</th>
                    <th>{{ t('unitPrice') }}</th>
                    <th>{{ t('supplierName') }}</th>
                    <th>{{ t('status') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="q in detailCustomer.quotations" :key="q.id">
                    <td class="mono">{{ q.oe_number }}</td>
                    <td>{{ q.quantity }}</td>
                    <td>{{ q.unit_price ? `${q.currency || 'USD'} ${q.unit_price}` : '-' }}</td>
                    <td>{{ q.supplier_name || '-' }}</td>
                    <td>
                      <span :class="['status-tag', `status-${q.status}`]">{{ t(`quotation${capitalize(q.status)}`) || q.status }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="text-muted">{{ t('noData') }}</div>
          </div>

          <!-- Related Inquiries -->
          <div class="detail-section">
            <h3>{{ t('customerInquiries') }} ({{ detailCustomer.inquiries?.length || 0 }})</h3>
            <div v-if="detailCustomer.inquiries?.length" class="mini-table-wrap">
              <table class="mini-table">
                <thead>
                  <tr>
                    <th>{{ t('inquiryProduct') }}</th>
                    <th>{{ t('oeNumber') }}</th>
                    <th>{{ t('quotationQuantity') }}</th>
                    <th>{{ t('status') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in detailCustomer.inquiries" :key="item.id">
                    <td>{{ item.product_name }}</td>
                    <td class="mono">{{ item.oe_number || '-' }}</td>
                    <td>{{ item.quantity }}</td>
                    <td>
                      <span :class="['status-tag', `status-${item.status}`]">{{ t(`inquiry${capitalize(item.status)}`) || item.status }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="text-muted">{{ t('noData') }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer, batchDeleteCustomers } from '../../api/modules';

const { t } = useI18n();

const customers = ref([]);
const loading = ref(false);
const saving = ref(false);
const keyword = ref('');
const sourceFilter = ref('');
const selectedIds = ref([]);
const showForm = ref(false);
const showDetail = ref(false);
const editing = ref(null);
const detailCustomer = ref({});
const stats = ref({});

const pagination = ref({ total: 0, page: 1, limit: 20 });

const form = ref({
  name: '', email: '', phone: '', company: '', country: '', address: '', remark: '', source: 'manual'
});

const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.limit));
const isAllSelected = computed(() => customers.value.length > 0 && customers.value.every(c => selectedIds.value.includes(c.id)));

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id);
  if (idx >= 0) selectedIds.value.splice(idx, 1);
  else selectedIds.value.push(id);
}

function toggleSelectAll() {
  if (isAllSelected.value) selectedIds.value.splice(0);
  else selectedIds.value = customers.value.map(c => c.id);
}

async function loadData() {
  loading.value = true;
  try {
    const res = await getCustomers({
      page: pagination.value.page,
      limit: pagination.value.limit,
      search: keyword.value || undefined,
      source: sourceFilter.value || undefined,
    });
    if (res.success) {
      customers.value = res.data.items;
      pagination.value.total = res.data.pagination.total;
      stats.value = res.data.stats || {};
    }
  } catch (e) { console.error(e); }
  loading.value = false;
}

function goPage(p) {
  pagination.value.page = p;
  loadData();
}

function openForm(row) {
  if (row) {
    editing.value = row.id;
    form.value = {
      name: row.name || '',
      email: row.email || '',
      phone: row.phone || '',
      company: row.company || '',
      country: row.country || '',
      address: row.address || '',
      remark: row.remark || '',
      source: row.source || 'manual',
    };
  } else {
    editing.value = null;
    form.value = { name: '', email: '', phone: '', company: '', country: '', address: '', remark: '', source: 'manual' };
  }
  showForm.value = true;
}

async function handleSave() {
  if (!form.value.name) return;
  saving.value = true;
  try {
    if (editing.value) {
      const res = await updateCustomer(editing.value, form.value);
      if (!res.success && res.message) alert(res.message);
    } else {
      const res = await createCustomer(form.value);
      if (!res.success && res.message) alert(res.message);
    }
    showForm.value = false;
    loadData();
  } catch (e) { console.error(e); }
  saving.value = false;
}

async function handleDelete(row) {
  if (!confirm(t('confirmDeleteCustomer'))) return;
  await deleteCustomer(row.id);
  loadData();
}

async function handleBatchDelete() {
  if (!confirm(t('confirmBatchDeleteCustomers'))) return;
  await batchDeleteCustomers(selectedIds.value);
  selectedIds.value.splice(0);
  loadData();
}

async function viewDetail(row) {
  try {
    const res = await getCustomerById(row.id);
    if (res.success) {
      detailCustomer.value = res.data;
      showDetail.value = true;
    }
  } catch (e) { console.error(e); }
}

function formatDate(d) {
  if (!d) return '';
  return d.replace('T', ' ').substring(0, 16);
}

onMounted(loadData);
</script>

<style scoped>
.customers-page { padding: 0; }

.page-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24px; flex-wrap: wrap; gap: 16px;
}

.header-left { display: flex; align-items: baseline; gap: 12px; }
.header-left h1 { font-size: 22px; font-weight: 700; color: var(--gray-900); }
.total-count { font-size: 13px; color: var(--gray-400); }

.header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.search-input {
  padding: 8px 14px; border: 1.5px solid var(--gray-200); border-radius: 8px;
  font-size: 13px; width: 200px; transition: border-color 0.2s;
}
.search-input:focus { outline: none; border-color: var(--primary); }

.filter-select {
  padding: 8px 12px; border: 1.5px solid var(--gray-200); border-radius: 8px;
  font-size: 13px; background: white; cursor: pointer; color: var(--gray-700);
}
.filter-select:focus { outline: none; border-color: var(--primary); }

.btn {
  padding: 8px 16px; border-radius: 8px; border: 1px solid var(--gray-200);
  background: white; font-size: 13px; font-weight: 500; cursor: pointer;
  transition: all 0.15s; display: inline-flex; align-items: center; gap: 6px;
  color: var(--gray-700);
}
.btn:hover { background: var(--gray-50); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: var(--primary); color: white; border-color: var(--primary); }
.btn-primary:hover { background: #2563eb; }
.btn-danger { background: #ef4444; color: white; border-color: #ef4444; }
.btn-danger:hover { background: #dc2626; }

/* Stats */
.stats-cards {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;
}
.stat-card {
  background: white; border-radius: 12px; border: 1px solid var(--gray-200);
  padding: 16px 20px; display: flex; flex-direction: column; gap: 4px;
}
.stat-number { font-size: 24px; font-weight: 700; color: var(--gray-900); }
.stat-label { font-size: 12px; color: var(--gray-500); font-weight: 500; }
.stat-inquiry { border-left: 3px solid #3b82f6; }
.stat-inquiry .stat-number { color: #3b82f6; }
.stat-manual { border-left: 3px solid #8b5cf6; }
.stat-manual .stat-number { color: #8b5cf6; }
.stat-excel { border-left: 3px solid #f59e0b; }
.stat-excel .stat-number { color: #f59e0b; }

/* Table */
.table-wrap {
  background: white; border-radius: 12px; border: 1px solid var(--gray-200);
  overflow-x: auto;
}

table { width: 100%; border-collapse: collapse; font-size: 13px; }
thead { background: var(--gray-50); }
th { padding: 10px 12px; text-align: left; font-weight: 600; color: var(--gray-500); white-space: nowrap; border-bottom: 1px solid var(--gray-200); }
td { padding: 10px 12px; border-bottom: 1px solid var(--gray-100); color: var(--gray-700); white-space: nowrap; cursor: pointer; }
tr.selected { background: #eff6ff; }
tr:hover { background: var(--gray-50); }

.name-cell { font-weight: 600; color: var(--gray-900); max-width: 140px; overflow: hidden; text-overflow: ellipsis; }
.mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; }
.date-cell { color: var(--gray-400); font-size: 12px; }
.text-muted { color: var(--gray-400); font-size: 12px; }

/* Tags */
.source-tag {
  display: inline-block; padding: 2px 10px; border-radius: 12px;
  font-size: 11px; font-weight: 600;
}
.source-inquiry { background: #eff6ff; color: #3b82f6; }
.source-manual { background: #f5f3ff; color: #8b5cf6; }
.source-excel { background: #fffbeb; color: #f59e0b; }

.count-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 22px; height: 22px; padding: 0 6px;
  background: var(--gray-900); color: white; border-radius: 11px;
  font-size: 11px; font-weight: 600;
}

.status-tag {
  display: inline-block; padding: 2px 8px; border-radius: 10px;
  font-size: 11px; font-weight: 600;
}
.status-pending { background: #fef3c7; color: #d97706; }
.status-quoted { background: #d1fae5; color: #059669; }
.status-sent { background: #dbeafe; color: #2563eb; }
.status-closed { background: #f3f4f6; color: #6b7280; }
.status-new { background: #fef3c7; color: #d97706; }
.status-read { background: #dbeafe; color: #2563eb; }
.status-replied { background: #d1fae5; color: #059669; }

.action-cell { display: flex; gap: 4px; }
.btn-icon {
  width: 30px; height: 30px; border: none; background: transparent; border-radius: 6px;
  cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--gray-400);
}
.btn-icon:hover { background: var(--gray-100); color: var(--primary); }
.btn-icon-danger:hover { background: #fef2f2; color: #ef4444; }

.center-cell { text-align: center; padding: 40px; }
.empty { color: var(--gray-400); }

.spinner { width: 24px; height: 24px; border: 3px solid var(--gray-200); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.6s linear infinite; margin: 0 auto; }
.spinner-sm { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }

.pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 20px; }
.page-info { font-size: 13px; color: var(--gray-500); }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}

.modal-content {
  background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  max-height: 90vh; overflow-y: auto; width: 100%;
}

.form-modal { max-width: 640px; }
.detail-modal { max-width: 800px; }

.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px; border-bottom: 1px solid var(--gray-100);
}
.modal-header h2 { font-size: 18px; font-weight: 700; color: var(--gray-900); }
.modal-close { width: 32px; height: 32px; border: none; background: var(--gray-100); border-radius: 8px; cursor: pointer; font-size: 18px; color: var(--gray-500); }
.modal-close:hover { background: var(--gray-200); }

.modal-body { padding: 24px; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group.full { grid-column: 1 / -1; }
.form-group label { font-size: 13px; font-weight: 600; color: var(--gray-600); }
.form-group input, .form-group select {
  padding: 9px 12px; border: 1.5px solid var(--gray-200); border-radius: 8px;
  font-size: 13px; transition: border-color 0.2s; background: white;
}
.form-group input:focus, .form-group select:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.form-textarea {
  padding: 9px 12px; border: 1.5px solid var(--gray-200); border-radius: 8px;
  font-size: 13px; transition: border-color 0.2s; resize: vertical; font-family: inherit;
}
.form-textarea:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

.modal-footer { padding: 16px 24px; border-top: 1px solid var(--gray-100); display: flex; justify-content: flex-end; gap: 10px; }

/* Detail */
.detail-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
}
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-label { font-size: 12px; color: var(--gray-500); font-weight: 600; }
.detail-value { font-size: 14px; color: var(--gray-800); word-break: break-all; }

.detail-section { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--gray-100); }
.detail-section h3 { font-size: 15px; font-weight: 700; color: var(--gray-900); margin-bottom: 12px; }

.mini-table-wrap { overflow-x: auto; }
.mini-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.mini-table th { padding: 8px 10px; background: var(--gray-50); font-weight: 600; color: var(--gray-500); text-align: left; border-bottom: 1px solid var(--gray-200); }
.mini-table td { padding: 8px 10px; border-bottom: 1px solid var(--gray-100); color: var(--gray-700); }

@media (max-width: 768px) {
  .stats-cards { grid-template-columns: 1fr 1fr; }
  .page-header { flex-direction: column; align-items: stretch; }
  .header-actions { flex-direction: column; }
  .search-input { width: 100%; }
  .form-grid { grid-template-columns: 1fr; }
  .detail-grid { grid-template-columns: 1fr; }
}
</style>
