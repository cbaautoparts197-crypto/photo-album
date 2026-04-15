<template>
  <div class="products-admin-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('products') }}</h1>
        <p class="page-desc">{{ total }} {{ t('products') }}</p>
      </div>
      <router-link to="/admin/upload" class="btn btn-primary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        {{ t('upload') }}
      </router-link>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-group">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        <select v-model="filters.categoryId" class="filter-select" @change="loadProducts()">
          <option value="">{{ t('allCategories') }}</option>
          <option v-for="cat in flatCategories" :key="cat.id" :value="cat.id">{{ cat.label }}</option>
        </select>
      </div>
      <div class="filter-group filter-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="filters.keyword" class="filter-input" :placeholder="t('search')" @keyup.enter="loadProducts()" />
      </div>
      <button class="btn btn-outline" @click="loadProducts()">{{ t('search') }}</button>
    </div>

    <!-- 产品列表 -->
    <div class="card">
      <div v-if="loading" class="loading-spinner"></div>
      <div v-else-if="products.length === 0" class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        <p>{{ t('noData') }}</p>
      </div>
      <div v-else class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:60px;">ID</th>
              <th style="width:80px;">{{ t('image') }}</th>
              <th>{{ t('productName') }}</th>
              <th>{{ t('categories') }}</th>
              <th>{{ t('fileSize') }}</th>
              <th style="width:140px;">{{ t('uploadTime') }}</th>
              <th style="width:100px;">{{ t('actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in products" :key="p.id">
              <td class="cell-id">{{ p.id }}</td>
              <td>
                <div class="table-thumb">
                  <img v-if="p.qiniu_url" :src="p.qiniu_url" alt="" loading="lazy" />
                  <div v-else class="no-img">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  </div>
                </div>
              </td>
              <td>
                <div class="product-name-cell">
                  <span class="name-main">{{ p.name }}</span>
                  <span v-if="p.oe_number" class="name-sub">OE: {{ p.oe_number }}</span>
                </div>
              </td>
              <td>
                <span v-if="p.category_name_zh" class="cat-badge">{{ p.category_name_zh }}</span>
                <span v-else class="cell-empty">—</span>
              </td>
              <td class="cell-muted">{{ formatSize(p.file_size) }}</td>
              <td class="cell-muted">{{ formatDate(p.created_at) }}</td>
              <td>
                <div class="row-actions">
                  <button class="action-btn edit" @click="openEdit(p)" title="Edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="action-btn delete" @click="handleDelete(p)" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="pagination">
        <button class="page-btn" :disabled="page <= 1" @click="page--; loadProducts()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button v-for="n in visiblePages" :key="n" :class="['page-btn', { active: n === page }]" @click="page = n; loadProducts()">{{ n }}</button>
        <button class="page-btn" :disabled="page >= totalPages" @click="page++; loadProducts()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showEdit" class="modal-overlay" @click.self="showEdit = false">
          <div class="modal">
            <div class="modal-header">
              <h3>{{ t('editProduct') }}</h3>
              <button class="modal-close" @click="showEdit = false">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="edit-preview" v-if="editProduct.qiniu_url">
                <img :src="editProduct.qiniu_url" alt="" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ t('productName') }} (中文) <span class="required">*</span></label>
                <input v-model="editProduct.name" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">OE Number</label>
                <input v-model="editProduct.oe_number" class="form-input" placeholder="如: 51602-SNA-A51" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ t('categories') }}</label>
                <select v-model="editProduct.category_id" class="form-select">
                  <option value="">—</option>
                  <option v-for="cat in flatCategories" :key="cat.id" :value="cat.id">{{ cat.label }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">备注</label>
                <textarea v-model="editProduct.remark" class="form-textarea" rows="3"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" @click="showEdit = false">{{ t('cancel') }}</button>
              <button class="btn btn-primary" @click="handleSaveEdit">{{ t('save') }}</button>
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
import { getProducts, deleteProduct, updateProduct, getCategoriesFlat } from '../../api/modules';

const { t } = useI18n();

const products = ref([]);
const flatCategories = ref([]);
const loading = ref(false);
const page = ref(1);
const pageSize = 20;
const total = ref(0);
const totalPages = computed(() => Math.ceil(total.value / pageSize));
const visiblePages = computed(() => {
  const pages = [];
  let start = Math.max(1, page.value - 2);
  let end = Math.min(totalPages.value, start + 4);
  if (end - start < 4) start = Math.max(1, end - 4);
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
});

const filters = ref({ categoryId: '', keyword: '' });
const showEdit = ref(false);
const editProduct = ref({});

function formatSize(bytes) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('zh-CN');
}

async function loadProducts() {
  loading.value = true;
  try {
    const params = { page: page.value, limit: pageSize };
    if (filters.value.categoryId) params.category_id = filters.value.categoryId;
    if (filters.value.keyword) params.search = filters.value.keyword;
    const res = await getProducts(params);
    if (res.success) {
      products.value = res.data.items;
      total.value = res.data.pagination.total;
    }
  } catch (e) {}
  loading.value = false;
}

function openEdit(p) {
  editProduct.value = { ...p, category_id: p.category_id || '' };
  showEdit.value = true;
}

async function handleSaveEdit() {
  try {
    await updateProduct(editProduct.value.id, {
      name: editProduct.value.name,
      name_zh: editProduct.value.name,
      oe_number: editProduct.value.oe_number,
      category_id: editProduct.value.category_id || null,
      remark: editProduct.value.remark,
    });
    showEdit.value = false;
    await loadProducts();
  } catch (e) {}
}

async function handleDelete(p) {
  if (!confirm(`确定删除「${p.name}」？`)) return;
  try { await deleteProduct(p.id); await loadProducts(); } catch (e) {}
}

onMounted(async () => {
  try {
    const catRes = await getCategoriesFlat();
    if (catRes.success) flatCategories.value = catRes.data;
  } catch (e) {}
  await loadProducts();
});
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-header .btn {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--gray-900);
  letter-spacing: -0.02em;
}

.page-desc {
  font-size: 14px;
  color: var(--gray-400);
}

/* Filter Bar */
.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
}

.filter-group {
  position: relative;
  display: flex;
  align-items: center;
}

.filter-group svg {
  position: absolute;
  left: 12px;
  color: var(--gray-400);
  z-index: 1;
  pointer-events: none;
}

.filter-select {
  padding: 9px 14px 9px 36px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  font-size: 13px;
  font-family: inherit;
  background: white;
  color: var(--gray-700);
  cursor: pointer;
  appearance: auto;
  transition: var(--transition);
  min-width: 200px;
}

.filter-select:focus {
  outline: none;
  border-color: var(--primary-light);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.filter-search {
  flex: 1;
  min-width: 200px;
}

.filter-input {
  width: 100%;
  padding: 9px 14px 9px 36px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  font-size: 13px;
  font-family: inherit;
  background: white;
  color: var(--gray-700);
  transition: var(--transition);
}

.filter-input:focus {
  outline: none;
  border-color: var(--primary-light);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Table */
.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th {
  text-align: left;
  padding: 12px 14px;
  font-size: 11px;
  font-weight: 700;
  color: var(--gray-400);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: var(--gray-50);
  border-bottom: 1px solid var(--gray-200);
  white-space: nowrap;
}

.data-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--gray-100);
  vertical-align: middle;
}

.data-table tbody tr {
  transition: var(--transition);
}

.data-table tbody tr:hover td {
  background: var(--gray-50);
}

.cell-id {
  color: var(--gray-400);
  font-weight: 500;
}

.table-thumb {
  width: 52px;
  height: 52px;
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--gray-100);
  display: flex;
  align-items: center;
  justify-content: center;
}

.table-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-img {
  color: var(--gray-300);
}

.product-name-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.name-main {
  font-weight: 600;
  color: var(--gray-800);
}

.name-sub {
  font-size: 12px;
  color: var(--gray-400);
}

.cat-badge {
  font-size: 12px;
  font-weight: 600;
  background: var(--primary-50);
  color: var(--primary-light);
  padding: 3px 10px;
  border-radius: var(--radius-full);
  white-space: nowrap;
}

.cell-muted {
  font-size: 12px;
  color: var(--gray-400);
}

.cell-empty {
  color: var(--gray-300);
}

.row-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
  background: transparent;
  color: var(--gray-400);
}

.action-btn.edit:hover {
  background: #eff6ff;
  color: var(--primary-light);
}

.action-btn.delete:hover {
  background: #fef2f2;
  color: #dc2626;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  padding: 20px;
  border-top: 1px solid var(--gray-100);
}

.page-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: white;
  color: var(--gray-600);
  font-size: 13px;
  cursor: pointer;
  transition: var(--transition);
  font-family: inherit;
}

.page-btn:hover:not(:disabled):not(.active) {
  border-color: var(--primary-light);
  color: var(--primary-light);
}

.page-btn.active {
  background: var(--primary-light);
  color: white;
  border-color: var(--primary-light);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Edit Preview */
.edit-preview {
  text-align: center;
  margin-bottom: 20px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--gray-100);
}

.edit-preview img {
  max-width: 100%;
  max-height: 240px;
  object-fit: contain;
}

.required {
  color: #dc2626;
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}

.modal-enter-active .modal,
.modal-leave-active .modal {
  transition: transform 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: scale(0.95) translateY(10px);
}

@media (max-width: 768px) {
  .data-table { font-size: 12px; }
  .data-table th, .data-table td { padding: 8px 8px; }
  .filter-bar { flex-direction: column; }
  .filter-select, .filter-search { width: 100%; min-width: auto; }
}
</style>
