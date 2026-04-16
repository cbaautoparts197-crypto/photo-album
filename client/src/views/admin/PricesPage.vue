<template>
  <div class="prices-page">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <h2 class="page-title">{{ t('priceManagement') }}</h2>
        <p class="page-desc">{{ t('priceDesc') }}</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-outline" @click="showImport = true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          {{ t('importExcel') }}
        </button>
        <button class="btn btn-primary" @click="openForm()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {{ t('addPrice') }}
        </button>
      </div>
    </div>

    <!-- 搜索筛选 -->
    <div class="filter-bar">
      <div class="filter-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="filters.oe_number" :placeholder="t('oeNumber')" @keyup.enter="loadPrices()" />
      </div>
      <div class="filter-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <input v-model="filters.supplier" :placeholder="t('supplierName')" @keyup.enter="loadPrices()" />
      </div>
      <button class="btn btn-sm btn-primary" @click="loadPrices()">{{ t('search') }}</button>
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
            <th>{{ t('supplierName') }}</th>
            <th>{{ t('unitPrice') }}</th>
            <th>{{ t('currency') }}</th>
            <th>{{ t('moq') }}</th>
            <th>{{ t('leadTime') }}</th>
            <th>{{ t('actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in prices" :key="item.id">
            <td><input type="checkbox" :checked="selectedIds.includes(item.id)" @change="toggleSelect(item.id)" /></td>
            <td class="td-oe">{{ item.oe_number }}</td>
            <td>{{ item.supplier_name }}</td>
            <td class="td-price">{{ item.unit_price }}</td>
            <td>{{ item.currency }}</td>
            <td>{{ item.moq }}</td>
            <td>{{ item.lead_time || '-' }}</td>
            <td class="td-actions">
              <button class="btn-icon" @click="openForm(item)" :title="t('edit')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon btn-icon-danger" @click="deleteOne(item.id)" :title="t('delete')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </td>
          </tr>
          <tr v-if="prices.length === 0">
            <td colspan="8" class="td-empty">{{ t('noPriceData') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div v-if="pagination.totalPages > 1" class="pagination-bar">
      <span class="page-info">{{ pagination.total }} {{ t('noData') === '暂无数据' ? '条' : 'records' }}</span>
      <div class="pagination">
        <button class="page-btn" :disabled="currentPage <= 1" @click="currentPage--; loadPrices()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button v-for="n in visiblePages" :key="n" :class="['page-btn', { active: n === currentPage }]" @click="currentPage = n; loadPrices()">{{ n }}</button>
        <button class="page-btn" :disabled="currentPage >= pagination.totalPages" @click="currentPage++; loadPrices()">
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
              <h3>{{ editingId ? t('editPrice') : t('addPrice') }}</h3>
              <button class="modal-close" @click="showForm = false">&times;</button>
            </div>
            <form class="form-body" @submit.prevent="savePrice">
              <div class="form-grid">
                <div class="form-field">
                  <label>{{ t('oeNumber') }} *</label>
                  <input v-model="form.oe_number" required :placeholder="'如 12305-0P010'" />
                </div>
                <div class="form-field">
                  <label>{{ t('supplierName') }} *</label>
                  <input v-model="form.supplier_name" required :placeholder="t('supplierName')" />
                </div>
                <div class="form-field">
                  <label>{{ t('unitPrice') }}</label>
                  <input v-model.number="form.unit_price" type="number" step="0.01" min="0" placeholder="0.00" />
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
                  <label>{{ t('moq') }}</label>
                  <input v-model.number="form.moq" type="number" min="1" placeholder="1" />
                </div>
                <div class="form-field">
                  <label>{{ t('leadTime') }}</label>
                  <input v-model="form.lead_time" placeholder="如 7-15 days" />
                </div>
              </div>
              <div class="form-field" style="margin-top:12px;">
                <label>{{ t('remark') || '备注' }}</label>
                <textarea v-model="form.remark" rows="2" :placeholder="t('remark') || '备注'"></textarea>
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
              <p class="import-hint">{{ t('importHint') }}</p>
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
import { getPrices, createPrice, updatePrice, deletePrice, batchDeletePrices, importPrices } from '../../api/modules';

const { t } = useI18n();

const prices = ref([]);
const loading = ref(false);
const currentPage = ref(1);
const pagination = ref({ total: 0, totalPages: 0 });
const selectedIds = ref([]);

const filters = ref({ oe_number: '', supplier: '' });

// 表单
const showForm = ref(false);
const editingId = ref(null);
const form = ref({ oe_number: '', supplier_name: '', unit_price: 0, currency: 'USD', moq: 1, lead_time: '', remark: '' });

// 导入
const showImport = ref(false);
const importFile = ref(null);
const importing = ref(false);
const importResult = ref(null);

const allSelected = computed(() => prices.value.length > 0 && selectedIds.value.length === prices.value.length);
const visiblePages = computed(() => {
  const pages = [];
  let s = Math.max(1, currentPage.value - 2);
  let e = Math.min(pagination.value.totalPages, s + 4);
  if (e - s < 4) s = Math.max(1, e - 4);
  for (let i = s; i <= e; i++) pages.push(i);
  return pages;
});

function toggleAll(e) {
  selectedIds.value = e.target.checked ? prices.value.map(p => p.id) : [];
}
function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id);
  if (idx >= 0) selectedIds.value.splice(idx, 1);
  else selectedIds.value.push(id);
}

async function loadPrices() {
  loading.value = true;
  try {
    const params = { page: currentPage.value, limit: 50 };
    if (filters.value.oe_number) params.oe_number = filters.value.oe_number;
    if (filters.value.supplier) params.supplier = filters.value.supplier;
    const res = await getPrices(params);
    if (res.success) {
      prices.value = res.data.items;
      pagination.value = res.data.pagination;
    }
  } catch (e) {}
  loading.value = false;
}

function openForm(item) {
  if (item) {
    editingId.value = item.id;
    form.value = { oe_number: item.oe_number, supplier_name: item.supplier_name, unit_price: item.unit_price, currency: item.currency, moq: item.moq, lead_time: item.lead_time || '', remark: item.remark || '' };
  } else {
    editingId.value = null;
    form.value = { oe_number: '', supplier_name: '', unit_price: 0, currency: 'USD', moq: 1, lead_time: '', remark: '' };
  }
  showForm.value = true;
}

async function savePrice() {
  try {
    if (editingId.value) {
      await updatePrice(editingId.value, form.value);
    } else {
      await createPrice(form.value);
    }
    showForm.value = false;
    await loadPrices();
  } catch (e) {}
}

async function deleteOne(id) {
  if (!confirm(t('delete') + '?')) return;
  await deletePrice(id);
  selectedIds.value = selectedIds.value.filter(i => i !== id);
  await loadPrices();
}

async function batchDelete() {
  if (!confirm(t('deletePriceConfirm'))) return;
  await batchDeletePrices(selectedIds.value);
  selectedIds.value = [];
  await loadPrices();
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
    const res = await importPrices(fd);
    importResult.value = res;
    if (res.success) {
      importFile.value = null;
      await loadPrices();
    }
  } catch (e) {
    importResult.value = { success: false, message: e.message };
  }
  importing.value = false;
}

onMounted(() => loadPrices());
</script>

<style scoped>
.prices-page { max-width: 1200px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
.page-title { font-size: 22px; font-weight: 700; color: var(--gray-900); margin-bottom: 4px; }
.page-desc { font-size: 14px; color: var(--gray-400); }
.header-actions { display: flex; gap: 10px; }

.filter-bar { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
.filter-search { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: white; border: 1px solid var(--border-light); border-radius: var(--radius); min-width: 200px; }
.filter-search svg { color: var(--gray-400); flex-shrink: 0; }
.filter-search input { border: none; outline: none; font-size: 14px; width: 100%; font-family: inherit; color: var(--gray-700); }

.table-wrap { background: white; border-radius: var(--radius-lg); border: 1px solid var(--border-light); overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--gray-100); font-size: 14px; }
.data-table th { background: var(--gray-50); font-weight: 600; color: var(--gray-600); font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
.data-table tr:hover td { background: var(--gray-50); }
.td-oe { font-weight: 600; color: var(--primary-light); white-space: nowrap; }
.td-price { font-weight: 600; color: var(--gray-900); font-variant-numeric: tabular-nums; }
.td-actions { white-space: nowrap; }
.td-empty { text-align: center; color: var(--gray-400); padding: 48px 16px !important; }
.td-actions input[type="checkbox"] { margin-right: 4px; }

.btn-icon { width: 32px; height: 32px; border: none; background: none; border-radius: var(--radius); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; color: var(--gray-500); transition: var(--transition); }
.btn-icon:hover { background: var(--gray-100); color: var(--primary-light); }
.btn-icon-danger:hover { background: #fef2f2; color: #dc2626; }

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

.import-hint { font-size: 13px; color: var(--gray-500); margin-bottom: 16px; line-height: 1.6; }
.import-upload-area { display: flex; align-items: center; gap: 12px; padding: 24px; border: 2px dashed var(--border-light); border-radius: var(--radius-lg); text-align: center; }
.import-filename { font-size: 13px; color: var(--gray-600); font-weight: 500; }
.import-result { margin-top: 12px; padding: 10px 14px; border-radius: var(--radius); font-size: 13px; font-weight: 500; background: #fef2f2; color: #dc2626; }
.import-result-success { background: #f0fdf4; color: #16a34a; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
  .filter-search { min-width: 150px; }
}
</style>
