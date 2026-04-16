<template>
  <div class="admin-page">
    <div class="page-header">
      <h1>{{ t('newsManagement') }}</h1>
      <p class="page-desc">{{ t('newsDesc') }}</p>
    </div>

    <div class="toolbar">
      <button class="btn btn-primary" @click="openAdd">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        {{ t('addNews') }}
      </button>
    </div>

    <div class="table-wrap" v-if="newsList.length">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>{{ t('newsTitle') }}</th>
            <th>{{ t('newsCover') }}</th>
            <th>{{ t('sortOrder') }}</th>
            <th>{{ t('status') }}</th>
            <th>{{ t('actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="n in newsList" :key="n.id">
            <td>{{ n.id }}</td>
            <td>
              <div class="news-title-cell">{{ n.title }}</div>
              <div v-if="n.title_zh" class="news-sub">{{ n.title_zh }}</div>
            </td>
            <td>
              <img v-if="n.cover_image" :src="n.cover_image" class="news-thumb" />
              <span v-else class="text-muted">—</span>
            </td>
            <td>{{ n.sort_order }}</td>
            <td>
              <span class="badge" :class="n.is_published ? 'badge-green' : 'badge-gray'">
                {{ n.is_published ? t('published') : t('draft') }}
              </span>
            </td>
            <td class="actions-cell">
              <button class="btn-icon" @click="openEdit(n)" :title="t('editNews')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon btn-icon-danger" @click="handleDelete(n)" :title="t('deleteNews')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/></svg>
      <p>{{ t('noData') }}</p>
    </div>

    <!-- 编辑弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
          <div class="modal-card">
            <div class="modal-header">
              <h3>{{ editing ? t('editNews') : t('addNews') }}</h3>
              <button class="modal-close" @click="showModal = false">&times;</button>
            </div>
            <div class="modal-body">
              <!-- EN -->
              <div class="lang-section">
                <div class="lang-tag">EN</div>
                <div class="form-group">
                  <label>{{ t('newsTitle') }}</label>
                  <input v-model="form.title" type="text" />
                </div>
                <div class="form-group">
                  <label>{{ t('newsSummary') }}</label>
                  <input v-model="form.summary" type="text" />
                </div>
              </div>
              <!-- ZH -->
              <div class="lang-section">
                <div class="lang-tag">中文</div>
                <div class="form-group">
                  <label>{{ t('newsTitle') }}</label>
                  <input v-model="form.title_zh" type="text" />
                </div>
                <div class="form-group">
                  <label>{{ t('newsSummary') }}</label>
                  <input v-model="form.summary_zh" type="text" />
                </div>
              </div>
              <!-- ES -->
              <div class="lang-section">
                <div class="lang-tag">ES</div>
                <div class="form-group">
                  <label>{{ t('newsTitle') }}</label>
                  <input v-model="form.title_es" type="text" />
                </div>
                <div class="form-group">
                  <label>{{ t('newsSummary') }}</label>
                  <input v-model="form.summary_es" type="text" />
                </div>
              </div>
              <!-- Cover -->
              <div class="form-group">
                <label>{{ t('newsCover') }} URL</label>
                <input v-model="form.cover_image" type="text" placeholder="https://..." />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>{{ t('sortOrder') }}</label>
                  <input v-model.number="form.sort_order" type="number" min="0" />
                </div>
                <div class="form-group">
                  <label>{{ t('status') }}</label>
                  <select v-model="form.is_published">
                    <option :value="1">{{ t('published') }}</option>
                    <option :value="0">{{ t('draft') }}</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-ghost" @click="showModal = false">{{ t('cancel') }}</button>
              <button class="btn btn-primary" @click="handleSave">{{ t('save') }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getNews, createNews, updateNews, deleteNews } from '../../api/modules';

const { t } = useI18n();
const newsList = ref([]);
const showModal = ref(false);
const editing = ref(null);

const emptyForm = () => ({ title: '', title_zh: '', title_es: '', summary: '', summary_zh: '', summary_es: '', cover_image: '', sort_order: 0, is_published: 1 });
const form = ref(emptyForm());

async function loadNews() {
  const res = await getNews();
  if (res.success) newsList.value = res.data;
}

function openAdd() {
  editing.value = null;
  form.value = emptyForm();
  showModal.value = true;
}

function openEdit(n) {
  editing.value = n;
  form.value = { title: n.title, title_zh: n.title_zh || '', title_es: n.title_es || '', summary: n.summary || '', summary_zh: n.summary_zh || '', summary_es: n.summary_es || '', cover_image: n.cover_image || '', sort_order: n.sort_order, is_published: n.is_published };
  showModal.value = true;
}

async function handleSave() {
  if (!form.value.title) return alert(t('requiredFields'));
  if (editing.value) {
    await updateNews(editing.value.id, form.value);
  } else {
    await createNews(form.value);
  }
  showModal.value = false;
  await loadNews();
}

async function handleDelete(n) {
  if (!confirm(t('confirmDelete'))) return;
  await deleteNews(n.id);
  await loadNews();
}

onMounted(loadNews);
</script>

<style scoped>
.admin-page { padding: 0; }
.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 22px; font-weight: 700; color: var(--gray-900); }
.page-desc { color: var(--gray-500); font-size: 14px; margin-top: 4px; }
.toolbar { display: flex; gap: 12px; margin-bottom: 20px; }
.table-wrap { overflow-x: auto; border: 1px solid var(--border-light); border-radius: var(--radius-lg); }
.data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.data-table th { background: var(--gray-50); padding: 12px 16px; text-align: left; font-weight: 600; color: var(--gray-700); white-space: nowrap; }
.data-table td { padding: 12px 16px; border-top: 1px solid var(--border-light); color: var(--gray-600); }
.data-table tr:hover td { background: var(--gray-50); }
.actions-cell { display: flex; gap: 8px; }
.btn-icon { background: none; border: none; cursor: pointer; color: var(--gray-400); padding: 4px; border-radius: 6px; transition: all 0.15s; }
.btn-icon:hover { background: var(--gray-100); color: var(--primary-light); }
.btn-icon-danger:hover { background: #fef2f2; color: #ef4444; }
.badge { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 12px; font-weight: 600; }
.badge-green { background: #ecfdf5; color: #059669; }
.badge-gray { background: var(--gray-100); color: var(--gray-500); }
.news-title-cell { font-weight: 600; color: var(--gray-800); }
.news-sub { font-size: 12px; color: var(--gray-400); margin-top: 2px; }
.news-thumb { width: 60px; height: 40px; object-fit: cover; border-radius: 6px; }
.text-muted { color: var(--gray-400); }
.empty-state { text-align: center; padding: 60px 20px; color: var(--gray-400); }
.empty-state svg { margin-bottom: 12px; }
.lang-section { margin-bottom: 16px; }
.lang-tag { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; margin-bottom: 10px; background: var(--gray-100); color: var(--gray-600); }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.modal-card { background: white; border-radius: var(--radius-xl); width: 560px; max-width: 95vw; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--border-light); }
.modal-header h3 { font-size: 18px; font-weight: 700; }
.modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: var(--gray-400); }
.modal-body { padding: 24px; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 13px; font-weight: 600; color: var(--gray-700); margin-bottom: 6px; }
.form-group input, .form-group textarea, .form-group select { width: 100%; padding: 10px 12px; border: 1px solid var(--border-light); border-radius: var(--radius); font-size: 14px; transition: border-color 0.15s; box-sizing: border-box; }
.form-group input:focus, .form-group select:focus { outline: none; border-color: var(--primary-light); box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid var(--border-light); }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; border-radius: var(--radius); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.btn-primary { background: var(--primary-light); color: white; }
.btn-primary:hover { background: var(--primary-700); }
.btn-ghost { background: transparent; color: var(--gray-600); }
.btn-ghost:hover { background: var(--gray-100); }
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-active .modal-card, .modal-leave-active .modal-card { transition: transform 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-card, .modal-leave-to .modal-card { transform: scale(0.95); }
</style>
