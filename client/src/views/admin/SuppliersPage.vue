<template>
  <div class="suppliers-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h1>{{ t('supplierManagement') }}</h1>
        <span class="total-count">{{ t('total') }}: {{ pagination.total }}</span>
      </div>
      <div class="header-actions">
        <input v-model="keyword" :placeholder="t('searchPlaceholder')" class="search-input" @keyup.enter="loadData" />
        <button class="btn btn-primary" @click="openForm()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {{ t('addSupplier') }}
        </button>
        <button v-if="selectedIds.length" class="btn btn-danger" @click="handleBatchDelete">
          {{ t('batchDelete') }} ({{ selectedIds.length }})
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th><input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" /></th>
            <th>ID</th>
            <th>{{ t('supplierName') }}</th>
            <th>{{ t('bankAccountName') }}</th>
            <th>{{ t('bankCardNumber') }}</th>
            <th>{{ t('bankName') }}</th>
            <th>{{ t('contactPerson') }}</th>
            <th>{{ t('contactPhone') }}</th>
            <th>{{ t('carModels') }}</th>
            <th>{{ t('factoryCatalogs') }}</th>
            <th>{{ t('supplierPriority') }}</th>
            <th>{{ t('createdAt') }}</th>
            <th>{{ t('actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="13" class="center-cell">
              <div class="spinner"></div>
            </td>
          </tr>
          <tr v-else-if="!suppliers.length">
            <td colspan="13" class="center-cell empty">{{ t('noData') }}</td>
          </tr>
          <tr v-for="s in suppliers" :key="s.id" :class="{ selected: selectedIds.includes(s.id) }">
            <td><input type="checkbox" :checked="selectedIds.includes(s.id)" @change="toggleSelect(s.id)" /></td>
            <td>{{ s.id }}</td>
            <td class="name-cell">{{ s.name }}</td>
            <td>{{ s.bank_account_name }}</td>
            <td class="mono">{{ s.bank_card_number }}</td>
            <td>{{ s.bank_name }}</td>
            <td>{{ s.contact_person }}</td>
            <td class="mono">{{ s.contact_phone }}</td>
            <td>
              <span v-if="s.car_models" class="tag">{{ s.car_models }}</span>
            </td>
            <td>
              <button v-if="s.factory_catalogs && s.factory_catalogs !== '[]'" class="btn-link" @click="viewCatalogs(s)">
                {{ JSON.parse(s.factory_catalogs || '[]').length }} {{ t('files') }}
              </button>
            </td>
            <td>
              <span :class="['priority-badge', `priority-${s.priority || 'normal'}`]">
                {{ t(`priority_${s.priority || 'normal'}`) }}
              </span>
            </td>
            <td class="date-cell">{{ formatDate(s.created_at) }}</td>
            <td class="action-cell">
              <button class="btn-icon btn-icon-products" :title="t('viewSupplierProducts')" @click="openProductsModal(s)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
              </button>
              <button class="btn-icon" :title="t('edit')" @click="openForm(s)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon btn-icon-danger" :title="t('delete')" @click="handleDelete(s)">
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
          <h2>{{ editing ? t('editSupplier') : t('addSupplier') }}</h2>
          <button class="modal-close" @click="showForm = false">&times;</button>
        </div>
        <div class="modal-body form-grid">
          <div class="form-group full">
            <label>{{ t('supplierName') }} *</label>
            <input v-model="form.name" :placeholder="t('supplierName')" />
          </div>
          <div class="form-group">
            <label>{{ t('bankAccountName') }}</label>
            <input v-model="form.bank_account_name" :placeholder="t('bankAccountName')" />
          </div>
          <div class="form-group">
            <label>{{ t('bankCardNumber') }}</label>
            <input v-model="form.bank_card_number" :placeholder="t('bankCardNumber')" />
          </div>
          <div class="form-group">
            <label>{{ t('bankName') }}</label>
            <input v-model="form.bank_name" :placeholder="t('bankName')" />
          </div>
          <div class="form-group">
            <label>{{ t('contactPerson') }}</label>
            <input v-model="form.contact_person" :placeholder="t('contactPerson')" />
          </div>
          <div class="form-group">
            <label>{{ t('contactPhone') }}</label>
            <input v-model="form.contact_phone" :placeholder="t('contactPhone')" />
          </div>
          <div class="form-group full">
            <label>{{ t('carModels') }}</label>
            <input v-model="form.car_models" :placeholder="t('carModelsPlaceholder')" />
          </div>
          <div class="form-group">
            <label>{{ t('supplierPriority') }}</label>
            <select v-model="form.priority">
              <option value="high">{{ t('priority_high') }}</option>
              <option value="normal">{{ t('priority_normal') }}</option>
              <option value="backup">{{ t('priority_backup') }}</option>
            </select>
          </div>
          <div class="form-group full">
            <label>{{ t('factoryCatalogs') }}</label>
            <div class="upload-area" @click="$refs.catalogInput.click()">
              <input ref="catalogInput" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" style="display:none" @change="handleCatalogUpload" />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span>{{ t('clickToUpload') }}</span>
            </div>
            <div v-if="form.factory_catalogs.length" class="file-list">
              <div v-for="(f, i) in form.factory_catalogs" :key="i" class="file-item">
                <span class="file-name">{{ f.name || f }}</span>
                <button class="file-remove" @click="removeCatalog(i)">&times;</button>
              </div>
            </div>
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

    <!-- Catalog Preview Modal -->
    <div v-if="showCatalogs" class="modal-overlay" @click.self="showCatalogs = false">
      <div class="modal-content catalog-modal">
        <div class="modal-header">
          <h2>{{ t('factoryCatalogs') }}</h2>
          <button class="modal-close" @click="showCatalogs = false">&times;</button>
        </div>
        <div class="modal-body">
          <div v-for="(f, i) in catalogFiles" :key="i" class="catalog-item">
            <span class="catalog-name">{{ f.name || f }}</span>
            <a v-if="f.url" :href="f.url" target="_blank" class="btn-link">{{ t('view') }}</a>
          </div>
        </div>
      </div>
    </div>

    <!-- Supplier Products Modal -->
    <div v-if="showProductsModal" class="modal-overlay" @click.self="showProductsModal = false">
      <div class="modal-content products-modal">
        <div class="modal-header">
          <div>
            <h2>{{ t('viewSupplierProducts') }}</h2>
            <p class="modal-subtitle">{{ activeSupplierName }}</p>
          </div>
          <button class="modal-close" @click="showProductsModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="productsLoading" class="center-cell"><div class="spinner"></div></div>
          <div v-else-if="supplierProducts.length === 0" class="center-cell empty">{{ t('noData') }}</div>
          <div v-else>
            <div class="products-count">{{ t('total') }}: {{ supplierProducts.length }} {{ t('priceRecords') }}</div>
            <table class="sp-table">
              <thead>
                <tr>
                  <th>{{ t('oeNumber') }}</th>
                  <th>{{ t('unitPrice') }}</th>
                  <th>MOQ</th>
                  <th>{{ t('leadTime') }}</th>
                  <th>{{ t('remark') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in supplierProducts" :key="p.id">
                  <td class="sp-oe">{{ p.oe_number }}</td>
                  <td class="sp-price">
                    <span v-if="p.unit_price > 0" class="price-val">{{ p.unit_price }} <small>{{ p.currency }}</small></span>
                    <span v-else class="no-price">-</span>
                  </td>
                  <td>{{ p.moq || 1 }}</td>
                  <td>{{ p.lead_time || '-' }}</td>
                  <td class="sp-remark">{{ p.remark || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier, batchDeleteSuppliers, getPricesBySupplierId } from '../../api/modules';

const { t } = useI18n();

const suppliers = ref([]);
const loading = ref(false);
const saving = ref(false);
const keyword = ref('');
const selectedIds = ref([]);
const showForm = ref(false);
const showCatalogs = ref(false);
const editing = ref(null);
const catalogFiles = ref([]);

// 供应商产品弹窗
const showProductsModal = ref(false);
const productsLoading = ref(false);
const supplierProducts = ref([]);
const activeSupplierName = ref('');

const pagination = ref({ total: 0, page: 1, limit: 50 });

const form = ref({
      name: '', bank_account_name: '', bank_card_number: '', bank_name: '',
  contact_person: '', contact_phone: '', car_models: '', factory_catalogs: [], priority: 'normal'
});

const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.limit));
const isAllSelected = computed(() => suppliers.value.length > 0 && suppliers.value.every(s => selectedIds.value.includes(s.id)));

function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id);
  if (idx >= 0) selectedIds.value.splice(idx, 1);
  else selectedIds.value.push(id);
}

function toggleSelectAll() {
  if (isAllSelected.value) selectedIds.value.splice(0);
  else selectedIds.value = suppliers.value.map(s => s.id);
}

async function loadData() {
  loading.value = true;
  try {
    const res = await getSuppliers({ page: pagination.value.page, limit: pagination.value.limit, keyword: keyword.value || undefined });
    if (res.success) {
      suppliers.value = res.data;
      pagination.value.total = res.pagination.total;
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
      bank_account_name: row.bank_account_name || '',
      bank_card_number: row.bank_card_number || '',
      bank_name: row.bank_name || '',
      contact_person: row.contact_person || '',
      contact_phone: row.contact_phone || '',
      car_models: row.car_models || '',
      factory_catalogs: [],
      priority: row.priority || 'normal'
    };
    try { form.value.factory_catalogs = JSON.parse(row.factory_catalogs || '[]'); } catch { form.value.factory_catalogs = []; }
  } else {
    editing.value = null;
    form.value = { name: '', bank_account_name: '', bank_card_number: '', bank_name: '', contact_person: '', contact_phone: '', car_models: '', factory_catalogs: [], priority: 'normal' };
  }
  showForm.value = true;
}

async function handleSave() {
  if (!form.value.name) return;
  saving.value = true;
  try {
    if (editing.value) {
      await updateSupplier(editing.value, form.value);
    } else {
      await createSupplier(form.value);
    }
    showForm.value = false;
    loadData();
  } catch (e) { console.error(e); }
  saving.value = false;
}

async function handleDelete(row) {
  if (!confirm(t('confirmDelete'))) return;
  await deleteSupplier(row.id);
  loadData();
}

async function handleBatchDelete() {
  if (!confirm(t('confirmBatchDelete'))) return;
  await batchDeleteSuppliers(selectedIds.value);
  selectedIds.value.splice(0);
  loadData();
}

function handleCatalogUpload(e) {
  const files = Array.from(e.target.files || []);
  files.forEach(f => {
    const reader = new FileReader();
    reader.onload = () => {
      form.value.factory_catalogs.push({ name: f.name, type: f.type, size: f.size, data: reader.result });
    };
    reader.readAsDataURL(f);
  });
  e.target.value = '';
}

function removeCatalog(i) {
  form.value.factory_catalogs.splice(i, 1);
}

function viewCatalogs(row) {
  try { catalogFiles.value = JSON.parse(row.factory_catalogs || '[]'); } catch { catalogFiles.value = []; }
  showCatalogs.value = true;
}

async function openProductsModal(row) {
  activeSupplierName.value = row.name;
  showProductsModal.value = true;
  productsLoading.value = true;
  supplierProducts.value = [];
  try {
    const res = await getPricesBySupplierId(row.id, { limit: 500 });
    if (res.success) supplierProducts.value = res.data.items || [];
  } catch (e) {}
  productsLoading.value = false;
}

function formatDate(d) {
  if (!d) return '';
  return d.replace('T', ' ').substring(0, 16);
}

onMounted(loadData);
</script>

<style scoped>
.suppliers-page { padding: 0; }

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
  font-size: 13px; width: 220px; transition: border-color 0.2s;
}
.search-input:focus { outline: none; border-color: var(--primary); }

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

.table-wrap {
  background: white; border-radius: 12px; border: 1px solid var(--gray-200);
  overflow-x: auto;
}

table { width: 100%; border-collapse: collapse; font-size: 13px; }
thead { background: var(--gray-50); }
th { padding: 10px 12px; text-align: left; font-weight: 600; color: var(--gray-500); white-space: nowrap; border-bottom: 1px solid var(--gray-200); }
td { padding: 10px 12px; border-bottom: 1px solid var(--gray-100); color: var(--gray-700); white-space: nowrap; }
tr.selected { background: #eff6ff; }
tr:hover { background: var(--gray-50); }

.name-cell { font-weight: 600; color: var(--gray-900); max-width: 160px; overflow: hidden; text-overflow: ellipsis; }
.mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; }
.tag { display: inline-block; padding: 2px 8px; background: #f0fdf4; color: #16a34a; border-radius: 12px; font-size: 11px; font-weight: 500; }
.priority-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; min-width: 32px; text-align: center; }
.priority-high { background: #dcfce7; color: #16a34a; }
.priority-normal { background: #dbeafe; color: #2563eb; }
.priority-backup { background: var(--gray-100); color: var(--gray-500); }
.date-cell { color: var(--gray-400); font-size: 12px; }

.action-cell { display: flex; gap: 4px; }
.btn-icon {
  width: 30px; height: 30px; border: none; background: transparent; border-radius: 6px;
  cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--gray-400);
}
.btn-icon:hover { background: var(--gray-100); color: var(--primary); }
.btn-icon-danger:hover { background: #fef2f2; color: #ef4444; }
.btn-link { font-size: 12px; color: var(--primary); cursor: pointer; background: none; border: none; text-decoration: underline; }

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
.catalog-modal { max-width: 480px; }

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
.form-group input {
  padding: 9px 12px; border: 1.5px solid var(--gray-200); border-radius: 8px;
  font-size: 13px; transition: border-color 0.2s;
}
.form-group input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.form-group select {
  padding: 9px 12px; border: 1.5px solid var(--gray-200); border-radius: 8px;
  font-size: 13px; transition: border-color 0.2s; background: white; cursor: pointer;
}
.form-group select:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

.upload-area {
  border: 2px dashed var(--gray-200); border-radius: 10px; padding: 20px;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  cursor: pointer; color: var(--gray-400); font-size: 13px; transition: all 0.2s;
}
.upload-area:hover { border-color: var(--primary); color: var(--primary); }

.file-list { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
.file-item { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: var(--gray-50); border-radius: 6px; font-size: 12px; }
.file-name { color: var(--gray-600); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-remove { background: none; border: none; cursor: pointer; color: var(--gray-400); font-size: 16px; }
.file-remove:hover { color: #ef4444; }

.modal-footer { padding: 16px 24px; border-top: 1px solid var(--gray-100); display: flex; justify-content: flex-end; gap: 10px; }

.catalog-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--gray-100); }
.catalog-name { font-size: 13px; color: var(--gray-700); }

.btn-icon-products:hover { background: #f0fdf4; color: #16a34a; }

/* Products Modal */
.products-modal { max-width: 700px; }
.modal-subtitle { font-size: 13px; color: var(--gray-400); margin-top: 2px; }
.products-count { font-size: 13px; color: var(--gray-400); margin-bottom: 12px; }
.sp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sp-table th { padding: 8px 12px; background: var(--gray-50); font-weight: 600; color: var(--gray-500); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid var(--gray-200); text-align: left; white-space: nowrap; }
.sp-table td { padding: 9px 12px; border-bottom: 1px solid var(--gray-100); }
.sp-table tr:hover td { background: var(--gray-50); }
.sp-oe { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; color: var(--primary, #3b82f6); font-weight: 600; }
.sp-price .price-val { font-weight: 700; color: #16a34a; }
.sp-price .price-val small { font-size: 11px; color: var(--gray-400); font-weight: 400; }
.no-price { color: var(--gray-300); }
.sp-remark { font-size: 12px; color: var(--gray-500); max-width: 140px; white-space: normal; word-break: break-word; }

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: stretch; }
  .header-actions { flex-direction: column; }
  .search-input { width: 100%; }
  .form-grid { grid-template-columns: 1fr; }
}
</style>
