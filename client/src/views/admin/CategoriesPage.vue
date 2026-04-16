<template>
  <div class="categories-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('categories') }}</h1>
        <p class="page-desc">{{ t('categoriesDesc') || 'Manage your product categories' }}</p>
      </div>
      <button class="btn btn-primary" @click="openModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        {{ t('addCategory') }}
      </button>
    </div>

    <!-- Stats cards -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ flatCategories.length }}</div>
          <div class="stat-label">总分类数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-green">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ categories.length }}</div>
          <div class="stat-label">顶级分类</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-amber">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ flatCategories.reduce((s, c) => s + (c.product_count || 0), 0) }}</div>
          <div class="stat-label">产品总数</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <div v-if="categories.length === 0" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <p>{{ t('noData') }}</p>
        </div>
        <div v-else class="category-tree">
          <template v-for="cat in categories" :key="cat.id">
            <div class="cat-item" :style="{ paddingLeft: '16px' }">
              <span class="cat-toggle" @click="cat._expanded = !cat._expanded">
                <svg v-if="cat.children && cat.children.length > 0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :style="{ transform: cat._expanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'var(--transition)' }"><polyline points="9 18 15 12 9 6"/></svg>
                <span v-else class="cat-dot"></span>
              </span>
              <div class="cat-info">
                <span class="cat-name">{{ cat.name }}</span>
                <span v-if="cat.name_en && cat.name_en !== cat.name" class="cat-name-en">{{ cat.name_en }}</span>
              </div>
              <span class="cat-count">{{ cat.product_count || 0 }} 件</span>
              <div class="cat-actions">
                <button class="cat-btn edit" @click="openModal(cat)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="cat-btn delete" @click="handleDelete(cat)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
            <template v-if="cat.children && cat.children.length > 0 && cat._expanded !== false">
              <CategoryNode
                v-for="child in cat.children"
                :key="child.id"
                :category="child"
                :depth="1"
                @edit="openModal"
                @delete="handleDelete"
              />
            </template>
          </template>
        </div>
      </div>
    </div>

    <!-- 弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal">
            <div class="modal-header">
              <h3>{{ editingId ? t('editCategory') : t('addCategory') }}</h3>
              <button class="modal-close" @click="closeModal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">{{ t('parentCategory') }}</label>
                <select v-model="form.parent_id" class="form-select">
                  <option value="">{{ t('noParent') }}</option>
                  <option v-for="cat in selectableCategories" :key="cat.id" :value="cat.id">{{ cat.label }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">中文名称 <span class="required">*</span></label>
                <input v-model="form.name_zh" class="form-input" placeholder="输入中文名称" />
              </div>
              <div class="form-group">
                <label class="form-label">English Name <span class="required">*</span></label>
                <input v-model="form.name_en" class="form-input" placeholder="English Name" />
              </div>
              <div class="form-group">
                <label class="form-label">Nombre en Español <span class="required">*</span></label>
                <input v-model="form.name_es" class="form-input" placeholder="Nombre en Español" />
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" @click="closeModal">{{ t('cancel') }}</button>
              <button class="btn btn-primary" @click="handleSave" :disabled="!canSave">{{ t('save') }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineComponent, h } from 'vue';
import { useI18n } from 'vue-i18n';
import { getCategories, getCategoriesFlat, createCategory, updateCategory, deleteCategory } from '../../api/modules';

const { t } = useI18n();

const CategoryNode = defineComponent({
  name: 'CategoryNode',
  props: { category: Object, depth: { type: Number, default: 0 } },
  emits: ['edit', 'delete'],
  setup(props, { emit }) {
    const expandChildren = (children, depth) => {
      if (!children || !children.length) return null;
      return children.map(child =>
        h('div', { key: child.id }, [
          h('div', {
            class: 'cat-item cat-child',
            style: { paddingLeft: (depth * 20 + 16) + 'px' },
          }, [
            h('span', {
              class: 'cat-toggle',
              onClick: () => { child._expanded = !child._expanded; },
            }, child.children && child.children.length
              ? h('svg', { width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', style: { transform: child._expanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'var(--transition)' } }, [h('polyline', { points: '9 18 15 12 9 6' })])
              : h('span', { class: 'cat-dot' })
            ),
            h('div', { class: 'cat-info' }, [
              h('span', { class: 'cat-name' }, child.name),
              child.name_en && child.name_en !== child.name
                ? h('span', { class: 'cat-name-en' }, child.name_en)
                : null,
            ]),
            h('span', { class: 'cat-count' }, `${child.product_count || 0} 件`),
            h('div', { class: 'cat-actions' }, [
              h('button', { class: 'cat-btn edit', onClick: () => emit('edit', child) }, [h('svg', { width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [h('path', { d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' }), h('path', { d: 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' })])]),
              h('button', { class: 'cat-btn delete', onClick: () => emit('delete', child) }, [h('svg', { width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [h('polyline', { points: '3 6 5 6 21 6' }), h('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' })])]),
            ]),
          ]),
          child.children && child.children.length && child._expanded !== false
            ? expandChildren(child.children, depth + 1)
            : null,
        ])
      );
    };
    return () => expandChildren([props.category], props.depth);
  },
});

const categories = ref([]);
const flatCategories = ref([]);
const showModal = ref(false);
const editingId = ref(null);

const form = ref({ parent_id: '', name_zh: '', name_en: '', name_es: '' });

const canSave = computed(() => form.value.name_zh && form.value.name_en && form.value.name_es);

const selectableCategories = computed(() =>
  flatCategories.value.filter(c => c.id !== editingId.value)
);

function openModal(cat = null) {
  if (cat) {
    editingId.value = cat.id;
    form.value = { parent_id: cat.parent_id || '', name_zh: cat.name_zh, name_en: cat.name_en, name_es: cat.name_es };
  } else {
    editingId.value = null;
    form.value = { parent_id: '', name_zh: '', name_en: '', name_es: '' };
  }
  showModal.value = true;
}

function closeModal() { showModal.value = false; }

async function loadData() {
  try {
    const [treeRes, flatRes] = await Promise.all([getCategories(), getCategoriesFlat()]);
    if (treeRes.success) categories.value = treeRes.data;
    if (flatRes.success) flatCategories.value = flatRes.data;
  } catch (e) {}
}

async function handleSave() {
  try {
    const data = { parent_id: form.value.parent_id || null, name_zh: form.value.name_zh, name_en: form.value.name_en, name_es: form.value.name_es };
    if (editingId.value) await updateCategory(editingId.value, data);
    else await createCategory(data);
    closeModal();
    await loadData();
  } catch (e) {}
}

async function handleDelete(cat) {
  if (!confirm(`确定删除「${cat.name}」？`)) return;
  try { await deleteCategory(cat.id); await loadData(); } catch (e) {}
}

onMounted(loadData);
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
  margin-bottom: 4px;
}

.page-desc {
  font-size: 14px;
  color: var(--gray-400);
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid var(--gray-100);
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}

.stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  color: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-green {
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  color: #10b981;
}

.stat-icon-amber {
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
  color: #f59e0b;
}

.stat-value {
  font-size: 22px;
  font-weight: 800;
  color: var(--gray-900);
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: var(--gray-400);
  font-weight: 500;
}

/* Category Tree */
.cat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--gray-50);
  transition: background 0.15s ease;
}

.cat-item:last-child {
  border-bottom: none;
}

.cat-item:hover {
  background: #f8fafc;
}

.cat-child {
  background: white;
}

.cat-toggle {
  width: 20px;
  flex-shrink: 0;
  cursor: pointer;
  color: var(--gray-300);
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.cat-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--gray-200);
}

.cat-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.cat-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-800);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cat-name-en {
  font-size: 12px;
  color: var(--gray-400);
  font-weight: 400;
  white-space: nowrap;
}

.cat-count {
  font-size: 12px;
  color: var(--gray-400);
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.cat-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
  flex-shrink: 0;
}

.cat-item:hover .cat-actions {
  opacity: 1;
}

.cat-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  background: transparent;
  color: var(--gray-300);
}

.cat-btn.edit:hover {
  background: #eff6ff;
  color: #3b82f6;
}

.cat-btn.delete:hover {
  background: #fef2f2;
  color: #ef4444;
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
  .stats-row {
    grid-template-columns: 1fr;
  }
}
</style>
