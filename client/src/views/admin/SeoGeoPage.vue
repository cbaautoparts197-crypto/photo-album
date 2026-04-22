<template>
  <div class="seo-geo-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-info">
        <h1 class="page-title">{{ t('seoGeoCenter') }}</h1>
        <p class="page-desc">{{ t('seoGeoDesc') }}</p>
      </div>
      <div class="header-stats" v-if="stats">
        <div class="stat-card">
          <span class="stat-num">{{ stats.active_markets }}</span>
          <span class="stat-label">{{ t('activeMarkets') }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{{ stats.total_keywords }}</span>
          <span class="stat-label">{{ t('keywords') }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{{ stats.completed_tasks }}/{{ stats.total_tasks }}</span>
          <span class="stat-label">{{ t('tasksCompleted') }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{{ stats.total_contents }}</span>
          <span class="stat-label">{{ t('contentsGenerated') }}</span>
        </div>
      </div>
    </div>

    <!-- Tab 导航 -->
    <div class="tab-nav">
      <button :class="['tab-btn', { active: activeTab === 'markets' }]" @click="activeTab = 'markets'">
        <span class="tab-icon">🌍</span> {{ t('targetMarkets') }}
      </button>
      <button :class="['tab-btn', { active: activeTab === 'keywords' }]" @click="activeTab = 'keywords'">
        <span class="tab-icon">🔑</span> {{ t('keywords') }}
      </button>
      <button :class="['tab-btn', { active: activeTab === 'tasks' }]" @click="activeTab = 'tasks'">
        <span class="tab-icon">📋</span> {{ t('seoTasks') }}
      </button>
      <button :class="['tab-btn', { active: activeTab === 'ai' }]" @click="activeTab = 'ai'">
        <span class="tab-icon">🤖</span> {{ t('aiContent') }}
      </button>
      <button :class="['tab-btn', { active: activeTab === 'settings' }]" @click="activeTab = 'settings'">
        <span class="tab-icon">⚙️</span> {{ t('settings') }}
      </button>
    </div>

    <!-- Toast 通知 -->
    <Teleport to="body">
      <div v-if="toast.show" class="toast" :class="'toast-' + toast.type">{{ toast.message }}</div>
    </Teleport>

    <!-- ==================== 目标市场 ==================== -->
    <div v-if="activeTab === 'markets'" class="tab-content">
      <div class="section-toolbar">
        <button class="btn btn-primary" @click="openMarketForm()">
          <span>+ {{ t('addMarket') }}</span>
        </button>
        <div class="filter-group">
          <select v-model="marketFilter" class="filter-select" @change="loadMarkets">
            <option value="all">{{ t('all') }}</option>
            <option value="active">{{ t('active') }}</option>
            <option value="paused">{{ t('paused') }}</option>
          </select>
        </div>
      </div>

      <div class="markets-grid" v-if="markets.length">
        <div v-for="m in markets" :key="m.id" class="market-card" :class="{ paused: m.status === 'paused' }">
          <div class="market-header">
            <span class="market-flag">{{ getCountryFlag(m.country_code) }}</span>
            <div class="market-info">
              <h3 class="market-name">{{ m.country_name }}</h3>
              <span class="market-code">{{ m.country_code }} · {{ m.language }}</span>
            </div>
            <span :class="['status-badge', m.status]">{{ t(m.status) }}</span>
          </div>
          <div class="market-meta">
            <div v-if="m.start_date" class="meta-item">
              <span class="meta-label">{{ t('period') }}:</span>
              <span>{{ m.start_date }} ~ {{ m.end_date || t('ongoing') }}</span>
            </div>
            <div v-if="m.budget_monthly" class="meta-item">
              <span class="meta-label">{{ t('monthlyBudget') }}:</span>
              <span>{{ m.currency }} {{ m.budget_monthly }}</span>
            </div>
          </div>
          <div class="market-stats">
            <div class="mini-stat">
              <span class="mini-num">{{ m.keyword_count }}</span>
              <span class="mini-label">{{ t('keywords') }}</span>
            </div>
            <div class="mini-stat">
              <span class="mini-num">{{ m.task_done }}/{{ m.task_total }}</span>
              <span class="mini-label">{{ t('tasks') }}</span>
            </div>
            <div class="mini-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: m.task_total ? (m.task_done / m.task_total * 100) + '%' : '0%' }"></div>
              </div>
            </div>
          </div>
          <div class="market-actions">
            <button class="btn-sm" @click="openKeywordsForMarket(m)">{{ t('manageKeywords') }}</button>
            <button class="btn-sm" @click="openTasksForMarket(m)">{{ t('viewTasks') }}</button>
            <button class="btn-sm" @click="openMarketForm(m)">{{ t('edit') }}</button>
            <button class="btn-sm btn-danger" @click="handleDeleteMarket(m)">{{ t('delete') }}</button>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">{{ t('noMarkets') }}</div>
    </div>

    <!-- ==================== 关键词管理 ==================== -->
    <div v-if="activeTab === 'keywords'" class="tab-content">
      <div class="section-toolbar">
        <div v-if="currentMarket" class="market-context">
          <span>{{ getCountryFlag(currentMarket.country_code) }}</span>
          <strong>{{ currentMarket.country_name }}</strong>
          <button class="btn-link" @click="currentMarket = null; keywords = []">{{ t('back') }}</button>
        </div>
        <button class="btn btn-primary" @click="openKeywordForm()" :disabled="!currentMarket">
          <span>+ {{ t('addKeyword') }}</span>
        </button>
        <button class="btn" @click="openBatchKeywordDialog()" :disabled="!currentMarket">
          <span>{{ t('batchAdd') }}</span>
        </button>
        <button v-if="selectedKeywords.length" class="btn btn-danger" @click="handleBatchDeleteKeywords">
          {{ t('batchDelete') }} ({{ selectedKeywords.length }})
        </button>
      </div>

      <div v-if="!currentMarket" class="empty-state">
        <p>{{ t('selectMarketFirst') }}</p>
        <button class="btn btn-primary" @click="activeTab = 'markets'">{{ t('goToMarkets') }}</button>
      </div>

      <div v-else-if="keywords.length" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th><input type="checkbox" @change="toggleAllKeywords" /></th>
              <th>{{ t('keyword') }}</th>
              <th>{{ t('searchIntent') }}</th>
              <th>{{ t('priority') }}</th>
              <th>{{ t('currentRank') }}</th>
              <th>{{ t('targetRank') }}</th>
              <th>{{ t('actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="kw in keywords" :key="kw.id" :class="{ selected: selectedKeywords.includes(kw.id) }">
              <td><input type="checkbox" :checked="selectedKeywords.includes(kw.id)" @change="toggleKeyword(kw.id)" /></td>
              <td class="kw-cell">{{ kw.keyword }}</td>
              <td><span class="intent-badge">{{ kw.search_intent }}</span></td>
              <td><span :class="['priority-dot', kw.priority]"></span> {{ t(kw.priority) }}</td>
              <td>{{ kw.current_rank || '-' }}</td>
              <td>{{ kw.target_rank || '-' }}</td>
              <td>
                <button class="btn-sm" @click="openKeywordForm(kw)">{{ t('edit') }}</button>
                <button class="btn-sm btn-danger" @click="handleDeleteKeyword(kw)">{{ t('delete') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-state">{{ t('noKeywords') }}</div>
    </div>

    <!-- ==================== 任务管理 ==================== -->
    <div v-if="activeTab === 'tasks'" class="tab-content">
      <div class="section-toolbar">
        <button class="btn btn-primary" @click="openTaskForm()">
          <span>+ {{ t('addTask') }}</span>
        </button>
        <select v-model="taskFilter" class="filter-select" @change="loadTasks">
          <option value="all">{{ t('all') }}</option>
          <option value="pending">{{ t('pending') }}</option>
          <option value="in_progress">{{ t('inProgress') }}</option>
          <option value="completed">{{ t('completed') }}</option>
        </select>
        <div v-if="taskMarketFilter" class="market-filter-tag">
          {{ getCountryFlag(taskMarketFilter.country_code) }} {{ taskMarketFilter.country_name }}
          <button @click="taskMarketFilter = null; loadTasks()">✕</button>
        </div>
      </div>

      <div class="task-board" v-if="tasks.length">
        <div v-for="task in tasks" :key="task.id" class="task-card" :class="task.status">
          <div class="task-header">
            <span :class="['priority-indicator', task.priority]"></span>
            <h4 class="task-title" :class="{ done: task.status === 'completed' }">{{ task.title }}</h4>
            <span :class="['task-status-badge', task.status]">{{ t(task.status) }}</span>
          </div>
          <p v-if="task.description" class="task-desc">{{ task.description }}</p>
          <div class="task-meta">
            <span v-if="task.task_type" class="task-type">{{ t(task.task_type) }}</span>
            <span v-if="task.due_date" class="task-due">{{ task.due_date }}</span>
            <span v-if="task.market_id" class="task-market" @click="openTasksForMarket(taskMarkets.find(m => m.id === task.market_id))">
              {{ getCountryFlag(getMarketCode(task.market_id)) }}
            </span>
          </div>
          <div class="task-actions">
            <button v-if="task.status !== 'completed'" class="btn-sm" @click="updateTaskStatus(task.id, 'completed')">✓</button>
            <button v-if="task.status === 'pending'" class="btn-sm" @click="updateTaskStatus(task.id, 'in_progress')">▶</button>
            <button class="btn-sm" @click="openTaskForm(task)">{{ t('edit') }}</button>
            <button class="btn-sm btn-danger" @click="handleDeleteTask(task)">{{ t('delete') }}</button>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">{{ t('noTasks') }}</div>
    </div>

    <!-- ==================== AI 内容生成 ==================== -->
    <div v-if="activeTab === 'ai'" class="tab-content">
      <div class="ai-section">
        <!-- 生成表单 -->
        <div class="ai-form-panel">
          <h3>{{ t('generateContent') }}</h3>
          <div class="form-row">
            <label>{{ t('contentType') }}</label>
            <select v-model="aiForm.content_type" class="form-select">
              <option value="meta_title">{{ t('metaTitle') }}</option>
              <option value="meta_description">{{ t('metaDescription') }}</option>
              <option value="product_description">{{ t('productDescription') }}</option>
              <option value="blog_article">{{ t('blogArticle') }}</option>
              <option value="category_description">{{ t('categoryDescription') }}</option>
            </select>
          </div>
          <div class="form-row">
            <label>{{ t('targetMarket') }}</label>
            <select v-model="aiForm.market_id" class="form-select">
              <option :value="null">-- {{ t('none') }} --</option>
              <option v-for="m in markets" :key="m.id" :value="m.id">
                {{ getCountryFlag(m.country_code) }} {{ m.country_name }}
              </option>
            </select>
          </div>
          <div class="form-row">
            <label>{{ t('language') }}</label>
            <select v-model="aiForm.language" class="form-select">
              <option value="en">English</option>
              <option value="es">Espanol</option>
              <option value="zh">中文</option>
              <option value="pt">Portugues</option>
            </select>
          </div>
          <div class="form-row">
            <label>{{ t('contextInfo') }}</label>
            <textarea v-model="aiForm.context" class="form-textarea" :placeholder="t('contextPlaceholder')" rows="5"></textarea>
          </div>
          <div class="form-row">
            <label>{{ t('targetUrl') }}</label>
            <input v-model="aiForm.target_url" class="form-input" type="url" placeholder="https://www.rbs-autoparts.com/..." />
          </div>
          <button class="btn btn-primary btn-lg" @click="handleGenerate" :disabled="aiGenerating">
            {{ aiGenerating ? t('generating') + '...' : '🤖 ' + t('generate') }}
          </button>
        </div>

        <!-- 生成结果 -->
        <div v-if="aiResult" class="ai-result-panel">
          <div class="result-header">
            <h3>{{ t('generationResult') }}</h3>
            <div class="result-actions">
              <button class="btn-sm" @click="copyResult">{{ t('copyContent') }}</button>
            </div>
          </div>
          <div class="result-content" v-html="formatAiResult(aiResult.content)"></div>
          <div class="result-meta">
            <span>{{ t('model') }}: {{ aiResult.model }}</span>
            <span>{{ t('language') }}: {{ aiResult.language }}</span>
            <span>{{ t('type') }}: {{ aiResult.content_type }}</span>
          </div>
        </div>
      </div>

      <!-- 生成历史 -->
      <div class="content-history">
        <h3>{{ t('generationHistory') }}</h3>
        <div class="history-list" v-if="contentLog.length">
          <div v-for="log in contentLog" :key="log.id" class="history-item" @click="viewHistoryLog(log)">
            <div class="history-meta">
              <span :class="['type-badge', log.content_type]">{{ t(log.content_type) }}</span>
              <span class="history-lang">{{ log.language }}</span>
              <span class="history-time">{{ formatTime(log.created_at) }}</span>
            </div>
            <p class="history-preview">{{ (log.content || '').substring(0, 120) }}...</p>
          </div>
        </div>
        <div v-else class="empty-state-sm">{{ t('noContentHistory') }}</div>
      </div>
    </div>

    <!-- ==================== 设置 ==================== -->
    <div v-if="activeTab === 'settings'" class="tab-content">
      <div class="settings-panel">
        <h3>{{ t('deepseekConfig') }}</h3>
        <p class="settings-desc">{{ t('deepseekConfigDesc') }}</p>
        <div class="form-row">
          <label>{{ t('apiKey') }}</label>
          <input v-model="settings.deepseek_api_key" class="form-input" type="password" placeholder="sk-..." />
        </div>
        <div class="form-row">
          <label>{{ t('apiBaseUrl') }}</label>
          <input v-model="settings.deepseek_base_url" class="form-input" placeholder="https://api.deepseek.com" />
        </div>
        <div class="form-row">
          <label>{{ t('model') }}</label>
          <select v-model="settings.deepseek_model" class="form-select">
            <option value="deepseek-chat">deepseek-chat</option>
            <option value="deepseek-reasoner">deepseek-reasoner</option>
          </select>
        </div>
        <div class="form-row">
          <label>{{ t('defaultLanguage') }}</label>
          <select v-model="settings.default_language" class="form-select">
            <option value="en">English</option>
            <option value="es">Espanol</option>
            <option value="zh">中文</option>
          </select>
        </div>
        <button class="btn btn-primary" @click="saveSettings" :disabled="settingsSaving">
          {{ settingsSaving ? t('saving') + '...' : t('save') }}
        </button>
        <button class="btn" @click="testConnection" :disabled="settingsTesting">
          {{ settingsTesting ? t('testing') + '...' : t('testConnection') }}
        </button>
      </div>
    </div>

    <!-- ==================== 弹窗：市场表单 ==================== -->
    <Teleport to="body">
      <div v-if="marketFormVisible" class="modal-overlay" @click.self="marketFormVisible = false">
        <div class="modal">
          <div class="modal-header">
            <h3>{{ marketForm.id ? t('editMarket') : t('addMarket') }}</h3>
            <button class="modal-close" @click="marketFormVisible = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <label>{{ t('country') }}</label>
              <select v-model="marketForm.country_code" class="form-select" @change="onCountryChange">
                <option value="">-- {{ t('selectCountry') }} --</option>
                <option v-for="c in countries" :key="c.code" :value="c.code">{{ c.flag }} {{ c.name_zh }} / {{ c.name_en }}</option>
              </select>
            </div>
            <div class="form-row">
              <label>{{ t('countryName') }}</label>
              <input v-model="marketForm.country_name" class="form-input" />
            </div>
            <div class="form-row">
              <label>{{ t('language') }}</label>
              <select v-model="marketForm.language" class="form-select">
                <option value="en">English</option>
                <option value="es">Espanol</option>
                <option value="zh">中文</option>
                <option value="pt">Portugues</option>
                <option value="de">Deutsch</option>
                <option value="fr">Francais</option>
                <option value="it">Italiano</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
                <option value="ru">Русский</option>
                <option value="ar">العربية</option>
                <option value="th">ไทย</option>
              </select>
            </div>
            <div class="form-row">
              <label>{{ t('status') }}</label>
              <select v-model="marketForm.status" class="form-select">
                <option value="active">{{ t('active') }}</option>
                <option value="paused">{{ t('paused') }}</option>
              </select>
            </div>
            <div class="form-row-inline">
              <div class="form-row">
                <label>{{ t('startDate') }}</label>
                <input v-model="marketForm.start_date" class="form-input" type="date" />
              </div>
              <div class="form-row">
                <label>{{ t('endDate') }}</label>
                <input v-model="marketForm.end_date" class="form-input" type="date" />
              </div>
            </div>
            <div class="form-row-inline">
              <div class="form-row">
                <label>{{ t('monthlyBudget') }}</label>
                <input v-model="marketForm.budget_monthly" class="form-input" type="number" />
              </div>
              <div class="form-row">
                <label>{{ t('currency') }}</label>
                <select v-model="marketForm.currency" class="form-select">
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="MXN">MXN</option>
                  <option value="BRL">BRL</option>
                  <option value="CNY">CNY</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <label>{{ t('notes') }}</label>
              <textarea v-model="marketForm.notes" class="form-textarea" rows="3"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn" @click="marketFormVisible = false">{{ t('cancel') }}</button>
            <button class="btn btn-primary" @click="saveMarket" :disabled="marketSaving">{{ marketSaving ? '...' : t('save') }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 弹窗：关键词表单 -->
    <Teleport to="body">
      <div v-if="keywordFormVisible" class="modal-overlay" @click.self="keywordFormVisible = false">
        <div class="modal modal-sm">
          <div class="modal-header">
            <h3>{{ keywordForm.id ? t('editKeyword') : t('addKeyword') }}</h3>
            <button class="modal-close" @click="keywordFormVisible = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <label>{{ t('keyword') }}</label>
              <input v-model="keywordForm.keyword" class="form-input" />
            </div>
            <div class="form-row">
              <label>{{ t('searchIntent') }}</label>
              <select v-model="keywordForm.search_intent" class="form-select">
                <option value="informational">Informational</option>
                <option value="navigational">Navigational</option>
                <option value="commercial">Commercial</option>
                <option value="transactional">Transactional</option>
              </select>
            </div>
            <div class="form-row">
              <label>{{ t('priority') }}</label>
              <select v-model="keywordForm.priority" class="form-select">
                <option value="high">{{ t('high') }}</option>
                <option value="medium">{{ t('medium') }}</option>
                <option value="low">{{ t('low') }}</option>
              </select>
            </div>
            <div class="form-row">
              <label>{{ t('currentRank') }}</label>
              <input v-model="keywordForm.current_rank" class="form-input" placeholder="e.g. #15 or Not ranked" />
            </div>
            <div class="form-row">
              <label>{{ t('targetRank') }}</label>
              <select v-model="keywordForm.target_rank" class="form-select">
                <option value="top3">Top 3</option>
                <option value="top5">Top 5</option>
                <option value="top10">Top 10</option>
                <option value="top20">Top 20</option>
                <option value="top50">Top 50</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn" @click="keywordFormVisible = false">{{ t('cancel') }}</button>
            <button class="btn btn-primary" @click="saveKeyword">{{ t('save') }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 弹窗：批量添加关键词 -->
    <Teleport to="body">
      <div v-if="batchKeywordVisible" class="modal-overlay" @click.self="batchKeywordVisible = false">
        <div class="modal">
          <div class="modal-header">
            <h3>{{ t('batchAddKeywords') }}</h3>
            <button class="modal-close" @click="batchKeywordVisible = false">✕</button>
          </div>
          <div class="modal-body">
            <p class="form-hint">{{ t('batchKeywordHint') }}</p>
            <textarea v-model="batchKeywordText" class="form-textarea" rows="10" :placeholder="t('batchKeywordPlaceholder')"></textarea>
          </div>
          <div class="modal-footer">
            <button class="btn" @click="batchKeywordVisible = false">{{ t('cancel') }}</button>
            <button class="btn btn-primary" @click="saveBatchKeywords">{{ t('addKeyword') }} ({{ batchKeywordLines }})</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 弹窗：任务表单 -->
    <Teleport to="body">
      <div v-if="taskFormVisible" class="modal-overlay" @click.self="taskFormVisible = false">
        <div class="modal">
          <div class="modal-header">
            <h3>{{ taskForm.id ? t('editTask') : t('addTask') }}</h3>
            <button class="modal-close" @click="taskFormVisible = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <label>{{ t('taskTitle') }}</label>
              <input v-model="taskForm.title" class="form-input" />
            </div>
            <div class="form-row">
              <label>{{ t('description') }}</label>
              <textarea v-model="taskForm.description" class="form-textarea" rows="3"></textarea>
            </div>
            <div class="form-row-inline">
              <div class="form-row">
                <label>{{ t('taskType') }}</label>
                <select v-model="taskForm.task_type" class="form-select">
                  <option value="optimization">{{ t('optimization') }}</option>
                  <option value="content">{{ t('content') }}</option>
                  <option value="technical">{{ t('technical') }}</option>
                  <option value="link_building">{{ t('linkBuilding') }}</option>
                  <option value="local_seo">{{ t('localSeo') }}</option>
                </select>
              </div>
              <div class="form-row">
                <label>{{ t('priority') }}</label>
                <select v-model="taskForm.priority" class="form-select">
                  <option value="high">{{ t('high') }}</option>
                  <option value="medium">{{ t('medium') }}</option>
                  <option value="low">{{ t('low') }}</option>
                </select>
              </div>
            </div>
            <div class="form-row-inline">
              <div class="form-row">
                <label>{{ t('targetMarket') }}</label>
                <select v-model="taskForm.market_id" class="form-select">
                  <option :value="null">-- {{ t('none') }} --</option>
                  <option v-for="m in markets" :key="m.id" :value="m.id">{{ m.flag }} {{ m.country_name }}</option>
                </select>
              </div>
              <div class="form-row">
                <label>{{ t('dueDate') }}</label>
                <input v-model="taskForm.due_date" class="form-input" type="date" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn" @click="taskFormVisible = false">{{ t('cancel') }}</button>
            <button class="btn btn-primary" @click="saveTask">{{ t('save') }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  getSeoSettings, updateSeoSettings, getSeoMarkets, createSeoMarket, updateSeoMarket, deleteSeoMarket,
  getSeoKeywords, createSeoKeyword, batchCreateSeoKeywords, updateSeoKeyword, deleteSeoKeyword, batchDeleteSeoKeywords,
  getSeoTasks, createSeoTask, updateSeoTask, deleteSeoTask,
  generateSeoContent, getSeoContentLog, getSeoCountries, getSeoStats, getSeoMarketById
} from '../../api/modules';

const { t } = useI18n();

// ===== 状态 =====
const activeTab = ref('markets');
const stats = ref(null);
const countries = ref([]);
const markets = ref([]);
const marketFilter = ref('all');
const keywords = ref([]);
const selectedKeywords = ref([]);
const currentMarket = ref(null);
const tasks = ref([]);
const taskFilter = ref('all');
const taskMarketFilter = ref(null);
const contentLog = ref([]);
const aiGenerating = ref(false);
const aiResult = ref(null);
const toast = reactive({ show: false, message: '', type: 'success' });
let toastTimer = null;

function showToast(message, type = 'success') {
  toast.message = message;
  toast.type = type;
  toast.show = true;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.show = false; }, 3000);
}

// 表单
const settings = ref({ deepseek_api_key: '', deepseek_base_url: 'https://api.deepseek.com', deepseek_model: 'deepseek-chat', default_language: 'en' });
const settingsSaving = ref(false);
const settingsTesting = ref(false);
const aiForm = ref({ content_type: 'meta_title', market_id: null, language: 'en', context: '', target_url: '' });

const marketFormVisible = ref(false);
const marketSaving = ref(false);
const marketForm = ref({ country_code: '', country_name: '', language: 'en', status: 'active', start_date: '', end_date: '', budget_monthly: 0, currency: 'USD', notes: '' });

const keywordFormVisible = ref(false);
const keywordForm = ref({ market_id: null, keyword: '', search_intent: 'informational', priority: 'medium', current_rank: '', target_rank: 'top10' });

const batchKeywordVisible = ref(false);
const batchKeywordText = ref('');

const taskFormVisible = ref(false);
const taskForm = ref({ market_id: null, title: '', description: '', task_type: 'optimization', status: 'pending', priority: 'medium', due_date: '' });

// ===== 计算属性 =====
const batchKeywordLines = computed(() => {
  return batchKeywordText.value.split('\n').filter(l => l.trim()).length;
});

const taskMarkets = computed(() => markets.value);

function getMarketCode(marketId) {
  const m = markets.value.find(m => m.id === marketId);
  return m?.country_code || '';
}

// ===== 加载数据 =====
async function loadAll() {
  try {
    const [s, c, m] = await Promise.all([getSeoStats(), getSeoCountries(), getSeoMarkets()]);
    stats.value = s.data;
    countries.value = c.data;
    markets.value = m.data;
  } catch (e) { console.error('Load error:', e); }
}

async function loadMarkets() {
  try {
    const res = await getSeoMarkets({ status: marketFilter.value });
    markets.value = res.data;
  } catch (e) { console.error(e); }
}

async function loadKeywords() {
  if (!currentMarket.value) return;
  try {
    const res = await getSeoKeywords({ market_id: currentMarket.value.id });
    keywords.value = res.data;
    selectedKeywords.value = [];
  } catch (e) { console.error(e); }
}

async function loadTasks() {
  try {
    const params = { status: taskFilter.value };
    if (taskMarketFilter.value) params.market_id = taskMarketFilter.value.id;
    const res = await getSeoTasks(params);
    tasks.value = res.data;
  } catch (e) { console.error(e); }
}

async function loadContentLog() {
  try {
    const res = await getSeoContentLog({ limit: 20 });
    contentLog.value = res.data;
  } catch (e) { console.error(e); }
}

async function loadSettings() {
  try {
    const res = await getSeoSettings();
    if (res.data) settings.value = res.data;
  } catch (e) { console.error(e); }
}

// ===== 市场操作 =====
function openMarketForm(market) {
  if (market) {
    marketForm.value = { ...market };
  } else {
    marketForm.value = { country_code: '', country_name: '', language: 'en', status: 'active', start_date: '', end_date: '', budget_monthly: 0, currency: 'USD', notes: '' };
  }
  marketFormVisible.value = true;
}

function onCountryChange() {
  const c = countries.value.find(c => c.code === marketForm.value.country_code);
  if (c) {
    marketForm.value.country_name = c.name_en;
    marketForm.value.language = c.lang || 'en';
  }
}

async function saveMarket() {
  if (!marketForm.value.country_code) {
    showToast('请选择国家', 'error');
    return;
  }
  if (!marketForm.value.country_name) {
    showToast('国家名称不能为空', 'error');
    return;
  }
  marketSaving.value = true;
  try {
    if (marketForm.value.id) {
      await updateSeoMarket(marketForm.value.id, marketForm.value);
    } else {
      await createSeoMarket(marketForm.value);
    }
    marketFormVisible.value = false;
    showToast(marketForm.value.id ? '更新成功' : '添加成功');
    await loadMarkets();
    await loadAll();
  } catch (e) {
    showToast(e.message || '保存失败', 'error');
  } finally {
    marketSaving.value = false;
  }
}

async function handleDeleteMarket(market) {
  if (!confirm(`Delete market "${market.country_name}"?`)) return;
  try {
    await deleteSeoMarket(market.id);
    await loadMarkets();
    await loadAll();
  } catch (e) { showToast(e.message || '删除失败', 'error'); }
}

function getCountryFlag(code) {
  if (!code) return '';
  const c = countries.value.find(c => c.code === code);
  return c?.flag || code;
}

// ===== 关键词操作 =====
function openKeywordsForMarket(market) {
  currentMarket.value = market;
  activeTab.value = 'keywords';
  loadKeywords();
}

function openKeywordForm(kw) {
  if (kw) {
    keywordForm.value = { ...kw };
  } else {
    keywordForm.value = { market_id: currentMarket.value?.id, keyword: '', search_intent: 'informational', priority: 'medium', current_rank: '', target_rank: 'top10' };
  }
  keywordFormVisible.value = true;
}

async function saveKeyword() {
  if (!keywordForm.value.keyword?.trim()) {
    showToast('关键词不能为空', 'error');
    return;
  }
  try {
    if (keywordForm.value.id) {
      await updateSeoKeyword(keywordForm.value.id, keywordForm.value);
    } else {
      keywordForm.value.market_id = currentMarket.value.id;
      await createSeoKeyword(keywordForm.value);
    }
    keywordFormVisible.value = false;
    showToast('保存成功');
    await loadKeywords();
    await loadMarkets();
  } catch (e) { showToast(e.message || '保存失败', 'error'); }
}

async function handleDeleteKeyword(kw) {
  if (!confirm('Delete this keyword?')) return;
  try {
    await deleteSeoKeyword(kw.id);
    await loadKeywords();
  } catch (e) { showToast(e.message || '删除失败', 'error'); }
}

function toggleKeyword(id) {
  const idx = selectedKeywords.value.indexOf(id);
  if (idx >= 0) selectedKeywords.value.splice(idx, 1);
  else selectedKeywords.value.push(id);
}

function toggleAllKeywords(e) {
  if (e.target.checked) selectedKeywords.value = keywords.value.map(k => k.id);
  else selectedKeywords.value.splice(0);
}

function openBatchKeywordDialog() {
  batchKeywordText.value = '';
  batchKeywordVisible.value = true;
}

async function saveBatchKeywords() {
  const lines = batchKeywordText.value.split('\n').filter(l => l.trim());
  if (!lines.length) return;
  try {
    await batchCreateSeoKeywords({ market_id: currentMarket.value.id, keywords: lines });
    batchKeywordVisible.value = false;
    await loadKeywords();
    await loadMarkets();
  } catch (e) { showToast(e.message || '保存失败', 'error'); }
}

async function handleBatchDeleteKeywords() {
  if (!confirm(`Delete ${selectedKeywords.value.length} keywords?`)) return;
  try {
    await batchDeleteSeoKeywords(selectedKeywords.value);
    showToast('删除成功');
    await loadKeywords();
  } catch (e) { showToast(e.message || '删除失败', 'error'); }
}

// ===== 任务操作 =====
function openTasksForMarket(market) {
  if (!market) return;
  taskMarketFilter.value = market;
  activeTab.value = 'tasks';
  loadTasks();
}

function openTaskForm(task) {
  if (task) {
    taskForm.value = { ...task };
  } else {
    taskForm.value = { market_id: taskMarketFilter.value?.id || null, title: '', description: '', task_type: 'optimization', status: 'pending', priority: 'medium', due_date: '' };
  }
  taskFormVisible.value = true;
}

async function saveTask() {
  try {
    if (taskForm.value.id) {
      await updateSeoTask(taskForm.value.id, taskForm.value);
    } else {
      await createSeoTask(taskForm.value);
    }
    taskFormVisible.value = false;
    await loadTasks();
  } catch (e) { showToast(e.message || '保存失败', 'error'); }
}

async function updateTaskStatus(id, status) {
  try {
    await updateSeoTask(id, { status });
    showToast('状态已更新');
    await loadTasks();
  } catch (e) { showToast(e.message || '更新失败', 'error'); }
}

async function handleDeleteTask(task) {
  if (!confirm('Delete this task?')) return;
  try {
    await deleteSeoTask(task.id);
    showToast('删除成功');
    await loadTasks();
  } catch (e) { showToast(e.message || '删除失败', 'error'); }
}

// ===== AI 内容生成 =====
async function handleGenerate() {
  if (!aiForm.value.context.trim()) {
    showToast(t('contextRequired'), 'error');
    return;
  }
  aiGenerating.value = true;
  aiResult.value = null;
  try {
    const res = await generateSeoContent(aiForm.value);
    aiResult.value = res.data;
    await loadContentLog();
  } catch (e) {
    showToast(e.message || 'Generation failed', 'error');
  } finally {
    aiGenerating.value = false;
  }
}

function formatAiResult(content) {
  if (!content) return '';
  return content
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

function copyResult() {
  if (aiResult.value?.content) {
    navigator.clipboard.writeText(aiResult.value.content);
    showToast(t('copied'));
  }
}

function viewHistoryLog(log) {
  aiResult.value = { content: log.content, model: log.model, language: log.language, content_type: log.content_type };
}

// ===== 设置 =====
async function saveSettings() {
  settingsSaving.value = true;
  try {
    await updateSeoSettings(settings.value);
    showToast(t('success'));
  } catch (e) { showToast(e.message || '保存失败', 'error'); }
  finally { settingsSaving.value = false; }
}

async function testConnection() {
  settingsTesting.value = true;
  try {
    const res = await generateSeoContent({
      content_type: 'meta_title',
      market_id: null,
      language: 'en',
      context: 'RBS Auto Parts - Honda Civic bumper',
    });
    aiResult.value = res.data;
    aiForm.value = { content_type: 'meta_title', market_id: null, language: 'en', context: 'RBS Auto Parts - Honda Civic bumper', target_url: '' };
    activeTab.value = 'ai';
  } catch (e) { showToast('Connection failed: ' + (e.message || 'Unknown error'), 'error'); }
  finally { settingsTesting.value = false; }
}

// ===== 工具函数 =====
function formatTime(dt) {
  if (!dt) return '';
  try { return new Date(dt).toLocaleString(); } catch { return dt; }
}

// ===== 初始化 =====
onMounted(async () => {
  await loadAll();
  loadContentLog();
  loadSettings();
});
</script>

<style scoped>
.seo-geo-page { max-width: 1400px; margin: 0 auto; }

/* Header */
.page-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 28px; flex-wrap: wrap; gap: 20px;
}
.page-title { font-size: 24px; font-weight: 700; color: var(--gray-900); margin: 0; }
.page-desc { font-size: 14px; color: var(--gray-500); margin: 4px 0 0; }
.header-stats { display: flex; gap: 16px; flex-wrap: wrap; }
.stat-card {
  background: white; border-radius: 12px; padding: 16px 24px; text-align: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid var(--gray-100); min-width: 100px;
}
.stat-num { display: block; font-size: 24px; font-weight: 700; color: var(--gray-900); }
.stat-label { font-size: 12px; color: var(--gray-500); }

/* Tab */
.tab-nav { display: flex; gap: 4px; margin-bottom: 24px; background: white; border-radius: 12px; padding: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); overflow-x: auto; }
.tab-btn {
  flex: 1; padding: 12px 16px; border: none; background: none; border-radius: 10px;
  font-size: 14px; font-weight: 600; color: var(--gray-500); cursor: pointer;
  transition: all 0.2s; white-space: nowrap; font-family: inherit;
}
.tab-btn:hover { background: var(--gray-50); color: var(--gray-700); }
.tab-btn.active { background: #3b82f6; color: white; box-shadow: 0 2px 8px rgba(59,130,246,0.3); }
.tab-icon { margin-right: 6px; }

/* Toolbar */
.section-toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 20px; flex-wrap: wrap; }
.filter-select {
  padding: 8px 12px; border: 1px solid var(--gray-200); border-radius: 8px;
  font-size: 13px; background: white; color: var(--gray-700);
}
.market-context { display: flex; gap: 8px; align-items: center; font-size: 14px; }
.market-filter-tag {
  display: flex; gap: 6px; align-items: center; background: var(--gray-100);
  padding: 6px 12px; border-radius: 20px; font-size: 13px;
}
.market-filter-tag button { background: none; border: none; cursor: pointer; color: var(--gray-500); font-size: 14px; }

/* Buttons */
.btn {
  padding: 8px 16px; border: 1px solid var(--gray-200); border-radius: 8px;
  font-size: 13px; font-weight: 600; cursor: pointer; background: white; color: var(--gray-700);
  transition: all 0.2s; font-family: inherit;
}
.btn:hover { background: var(--gray-50); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: #3b82f6; color: white; border-color: #3b82f6; }
.btn-primary:hover { background: #2563eb; }
.btn-danger { background: #ef4444; color: white; border-color: #ef4444; }
.btn-danger:hover { background: #dc2626; }
.btn-lg { padding: 12px 28px; font-size: 15px; }
.btn-sm { padding: 4px 10px; border: 1px solid var(--gray-200); border-radius: 6px; font-size: 12px; background: white; cursor: pointer; font-family: inherit; }
.btn-sm:hover { background: var(--gray-50); }
.btn-sm.btn-danger { color: #ef4444; border-color: #fca5a5; }
.btn-link { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 13px; text-decoration: underline; font-family: inherit; }

/* Markets Grid */
.markets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px; }
.market-card {
  background: white; border-radius: 12px; padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid var(--gray-100);
  transition: all 0.2s;
}
.market-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.market-card.paused { opacity: 0.7; }
.market-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.market-flag { font-size: 28px; }
.market-info { flex: 1; }
.market-name { font-size: 16px; font-weight: 600; margin: 0; color: var(--gray-900); }
.market-code { font-size: 12px; color: var(--gray-500); }
.status-badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.status-badge.active { background: #dcfce7; color: #166534; }
.status-badge.paused { background: #fef3c7; color: #92400e; }
.market-meta { font-size: 13px; color: var(--gray-500); margin-bottom: 12px; display: flex; flex-direction: column; gap: 4px; }
.meta-label { color: var(--gray-400); margin-right: 4px; }
.market-stats { display: flex; gap: 16px; align-items: center; margin-bottom: 16px; }
.mini-stat { text-align: center; }
.mini-num { display: block; font-size: 18px; font-weight: 700; color: var(--gray-900); }
.mini-label { font-size: 11px; color: var(--gray-500); }
.mini-progress { flex: 1; }
.progress-bar { height: 6px; background: var(--gray-100); border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #8b5cf6); border-radius: 3px; transition: width 0.5s; }
.market-actions { display: flex; gap: 8px; flex-wrap: wrap; }

/* Table */
.table-wrapper { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th { background: var(--gray-50); padding: 10px 12px; text-align: left; font-weight: 600; color: var(--gray-600); border-bottom: 2px solid var(--gray-100); }
.data-table td { padding: 10px 12px; border-bottom: 1px solid var(--gray-50); color: var(--gray-700); }
.data-table tr:hover { background: #fafbfc; }
.data-table tr.selected { background: #eff6ff; }
.kw-cell { font-weight: 500; color: var(--gray-900); }
.intent-badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; background: #f0f9ff; color: #0369a1; }
.priority-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.priority-dot.high { background: #ef4444; }
.priority-dot.medium { background: #f59e0b; }
.priority-dot.low { background: #22c55e; }

/* Tasks */
.task-board { display: flex; flex-direction: column; gap: 12px; }
.task-card {
  background: white; border-radius: 12px; padding: 16px 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid var(--gray-100);
  border-left: 4px solid var(--gray-200); transition: all 0.2s;
}
.task-card.high { border-left-color: #ef4444; }
.task-card.medium { border-left-color: #f59e0b; }
.task-card.low { border-left-color: #22c55e; }
.task-card.completed { opacity: 0.65; }
.task-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.priority-indicator { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.priority-indicator.high { background: #ef4444; }
.priority-indicator.medium { background: #f59e0b; }
.priority-indicator.low { background: #22c55e; }
.task-title { flex: 1; font-size: 15px; font-weight: 600; margin: 0; color: var(--gray-900); }
.task-title.done { text-decoration: line-through; color: var(--gray-400); }
.task-status-badge { padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.task-status-badge.pending { background: var(--gray-100); color: var(--gray-600); }
.task-status-badge.in_progress { background: #dbeafe; color: #1d4ed8; }
.task-status-badge.completed { background: #dcfce7; color: #166534; }
.task-desc { font-size: 13px; color: var(--gray-500); margin: 0 0 8px; }
.task-meta { display: flex; gap: 10px; align-items: center; font-size: 12px; color: var(--gray-400); margin-bottom: 10px; }
.task-type { padding: 2px 8px; border-radius: 4px; background: #f3f4f6; }
.task-market { cursor: pointer; font-size: 16px; }
.task-actions { display: flex; gap: 8px; }

/* AI Section */
.ai-section { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
.ai-form-panel, .ai-result-panel { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid var(--gray-100); }
.ai-form-panel h3, .ai-result-panel h3 { margin: 0 0 20px; font-size: 16px; }
.result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.result-header h3 { margin: 0; }
.result-content { font-size: 14px; line-height: 1.7; color: var(--gray-700); background: var(--gray-50); padding: 16px; border-radius: 8px; max-height: 400px; overflow-y: auto; }
.result-meta { display: flex; gap: 12px; font-size: 12px; color: var(--gray-400); margin-top: 12px; }

/* Content History */
.content-history { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid var(--gray-100); }
.content-history h3 { margin: 0 0 16px; font-size: 16px; }
.history-list { display: flex; flex-direction: column; gap: 8px; }
.history-item { padding: 12px; border-radius: 8px; cursor: pointer; border: 1px solid var(--gray-100); transition: all 0.2s; }
.history-item:hover { background: #f8fafc; border-color: #3b82f6; }
.history-meta { display: flex; gap: 10px; align-items: center; margin-bottom: 6px; }
.type-badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.type-badge.meta_title { background: #dbeafe; color: #1d4ed8; }
.type-badge.meta_description { background: #dcfce7; color: #166534; }
.type-badge.product_description { background: #fef3c7; color: #92400e; }
.type-badge.blog_article { background: #f3e8ff; color: #7c3aed; }
.type-badge.category_description { background: #ffe4e6; color: #be123c; }
.history-lang { font-size: 11px; color: var(--gray-500); background: var(--gray-100); padding: 1px 6px; border-radius: 4px; }
.history-time { font-size: 11px; color: var(--gray-400); margin-left: auto; }
.history-preview { font-size: 13px; color: var(--gray-600); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Settings */
.settings-panel { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid var(--gray-100); max-width: 600px; }
.settings-panel h3 { margin: 0 0 8px; }
.settings-desc { font-size: 13px; color: var(--gray-500); margin: 0 0 24px; }

/* Forms */
.form-row { margin-bottom: 16px; }
.form-row label { display: block; font-size: 13px; font-weight: 600; color: var(--gray-700); margin-bottom: 6px; }
.form-input, .form-select, .form-textarea {
  width: 100%; padding: 10px 14px; border: 1px solid var(--gray-200); border-radius: 8px;
  font-size: 14px; color: var(--gray-800); transition: border-color 0.2s; font-family: inherit;
  box-sizing: border-box;
}
.form-input:focus, .form-select:focus, .form-textarea:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.form-textarea { resize: vertical; min-height: 60px; }
.form-row-inline { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-hint { font-size: 13px; color: var(--gray-500); margin-bottom: 12px; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000;
  display: flex; align-items: center; justify-content: center; padding: 20px;
  backdrop-filter: blur(4px);
}
.modal {
  background: white; border-radius: 16px; width: 100%; max-width: 560px;
  max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}
.modal-sm { max-width: 440px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--gray-100); }
.modal-header h3 { margin: 0; font-size: 17px; }
.modal-close { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--gray-400); padding: 4px; }
.modal-close:hover { color: var(--gray-700); }
.modal-body { padding: 24px; }
.modal-footer { padding: 16px 24px; border-top: 1px solid var(--gray-100); display: flex; justify-content: flex-end; gap: 12px; }

/* Empty */
.empty-state { text-align: center; padding: 60px 20px; color: var(--gray-400); font-size: 15px; }
.empty-state p { margin-bottom: 16px; }
.empty-state-sm { text-align: center; padding: 24px; color: var(--gray-400); font-size: 13px; }

/* Toast */
.toast {
  position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
  padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 500;
  z-index: 9999; animation: toastIn 0.3s ease;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}
.toast-success { background: #10b981; color: white; }
.toast-error { background: #ef4444; color: white; }
@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* Responsive */
@media (max-width: 768px) {
  .page-header { flex-direction: column; }
  .header-stats { width: 100%; }
  .ai-section { grid-template-columns: 1fr; }
  .markets-grid { grid-template-columns: 1fr; }
  .form-row-inline { grid-template-columns: 1fr; }
}
</style>
