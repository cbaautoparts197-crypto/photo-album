<template>
  <div class="products-page">
    <!-- Banner -->
    <section class="page-banner">
      <div class="banner-bg">
        <div class="banner-particle banner-particle-1"></div>
        <div class="banner-particle banner-particle-2"></div>
      </div>
      <div class="container">
        <h1 class="banner-title">{{ t('products') }}</h1>
        <p class="banner-desc">{{ t('featuresDesc') }}</p>
      </div>
    </section>

    <div class="container" style="padding-top:32px;padding-bottom:80px;">
      <!-- 侧边分类 + 右侧产品 -->
      <div class="products-layout">
        <!-- 侧边分类筛选 -->
        <aside class="products-sidebar" :class="{ open: sidebarOpen }">
          <div class="sidebar-toggle-mobile" @click="sidebarOpen = !sidebarOpen">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="16" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
            {{ t('categories') }}
            <span class="sidebar-arrow" :class="{ rotated: sidebarOpen }">▼</span>
          </div>
          <div class="sidebar-content">
            <div class="category-filter">
              <div class="filter-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                {{ t('categories') }}
              </div>
              <div
                class="cat-filter-item"
                :class="{ active: !selectedCategory }"
                @click="selectCategory(null)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                {{ t('allCategories') }}
                <span class="count-badge">{{ total }}</span>
              </div>
              <template v-for="cat in categories" :key="cat.id">
                <div
                  class="cat-filter-item"
                  :class="{ active: selectedCategory === cat.id }"
                  @click="selectCategory(cat.id)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  {{ cat.name }}
                  <span class="count-badge">{{ cat.product_count || 0 }}</span>
                </div>
                <template v-if="cat.children && cat.children.length">
                  <div
                    v-for="child in cat.children"
                    :key="child.id"
                    class="cat-filter-item sub"
                    :class="{ active: selectedCategory === child.id }"
                    @click="selectCategory(child.id)"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                    {{ child.name }}
                    <span class="count-badge">{{ child.product_count || 0 }}</span>
                  </div>
                </template>
              </template>
            </div>
          </div>
        </aside>

        <!-- 产品网格 -->
        <div class="products-main">
          <!-- 搜索和排序 -->
          <div class="products-toolbar">
            <div class="toolbar-search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                v-model="keyword"
                class="search-input"
                :placeholder="t('search')"
                @keyup.enter="loadProducts()"
              />
            </div>
            <div class="toolbar-sort">
              <select v-model="sortBy" class="sort-select" @change="loadProducts()">
                <option value="newest">{{ t('newest') }}</option>
                <option value="name">{{ t('name') }}</option>
              </select>
            </div>
            <div class="toolbar-count">
              {{ total }} {{ t('products') }}
            </div>
          </div>

          <!-- 产品网格 -->
          <div v-if="loading" class="loading-spinner"></div>
          <div v-else-if="products.length === 0" class="empty-state">
            <div class="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
            <p>{{ t('noData') }}</p>
          </div>
          <div v-else class="products-grid">
            <div
              v-for="p in products"
              :key="p.id"
              class="product-card"
              @click="openDetail(p)"
            >
              <div class="product-thumb">
                <img v-if="p.qiniu_url_watermarked" :src="p.qiniu_url_watermarked" :alt="p.name" loading="lazy" />
                <img v-else-if="p.qiniu_url" :src="p.qiniu_url" :alt="p.name" loading="lazy" />
                <div v-else class="no-product-img">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
                <div class="product-overlay">
                  <span class="view-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    {{ t('viewDetail') || 'View' }}
                  </span>
                </div>
              </div>
              <div class="product-card-body">
                <h3 class="product-title">{{ p.name }}</h3>
                <div class="product-meta">
                  <span v-if="p.oe_number" class="product-oe">OE: {{ p.oe_number }}</span>
                  <span v-if="p.category_name_zh" class="product-category">{{ p.category_name_zh }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 分页 -->
          <div v-if="totalPages > 1" class="pagination">
            <button class="page-btn" :disabled="page <= 1" @click="page--; loadProducts()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button
              v-for="n in visiblePages"
              :key="n"
              :class="['page-btn', { active: n === page }]"
              @click="page = n; loadProducts()"
            >{{ n }}</button>
            <button class="page-btn" :disabled="page >= totalPages" @click="page++; loadProducts()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 产品详情弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="detailProduct" class="modal-overlay" @click.self="detailProduct = null">
          <div class="detail-modal">
            <button class="detail-close" @click="detailProduct = null">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div class="detail-body">
              <div class="detail-image">
                <img v-if="detailProduct.qiniu_url_watermarked" :src="detailProduct.qiniu_url_watermarked" :alt="detailProduct.name" />
                <img v-else-if="detailProduct.qiniu_url" :src="detailProduct.qiniu_url" :alt="detailProduct.name" />
                <div v-else class="no-product-img" style="min-height:300px;">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
              </div>
              <div class="detail-info">
                <h2 class="detail-title">{{ detailProduct.name }}</h2>
                <div class="detail-meta">
                  <span v-if="detailProduct.oe_number" class="detail-oe-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    OE: {{ detailProduct.oe_number }}
                  </span>
                  <span v-if="detailProduct.category_name_zh" class="detail-cat-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    {{ detailProduct.category_name_zh }}
                  </span>
                </div>
                <p v-if="detailProduct.remark" class="detail-remark">{{ detailProduct.remark }}</p>

                <!-- 社媒分享 -->
                <div class="detail-share-section">
                  <div class="detail-section-label">{{ t('shareTitle') }}</div>
                  <div class="share-btns">
                    <a :href="shareWhatsApp" target="_blank" class="share-btn share-btn-whatsapp" :title="t('whatsappShare')">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
                    </a>
                    <a :href="shareFacebook" target="_blank" class="share-btn share-btn-facebook" :title="t('facebookShare')">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    </a>
                    <a :href="shareTwitter" target="_blank" class="share-btn share-btn-twitter" :title="t('twitterShare')">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    </a>
                    <button class="share-btn share-btn-copy" :title="t('copyLink')" @click="copyProductLink">
                      <svg v-if="!copied" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                  </div>
                </div>

                <!-- 询价表单 -->
                <div class="detail-inquiry-section">
                  <div class="detail-section-label">{{ t('inquiryTitle') }}</div>
                  <form class="inquiry-form" @submit.prevent="sendInquiry">
                    <div v-if="inquiryMessage" class="inquiry-message" :class="{ 'inquiry-message-success': inquirySent }">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      {{ inquiryMessage }}
                    </div>
                    <div class="inquiry-row">
                      <div class="inquiry-field">
                        <label>{{ t('inquiryName') }} *</label>
                        <input v-model="inquiryForm.name" type="text" required :placeholder="t('inquiryName')" />
                      </div>
                      <div class="inquiry-field">
                        <label>{{ t('inquiryEmail') }} *</label>
                        <input v-model="inquiryForm.email" type="email" required :placeholder="t('inquiryEmail')" />
                      </div>
                    </div>
                    <div class="inquiry-field">
                      <label>{{ t('inquiryPhone') }}</label>
                      <input v-model="inquiryForm.phone" type="tel" :placeholder="t('inquiryPhone')" />
                    </div>
                    <div class="inquiry-field">
                      <label>{{ t('inquiryRemark') }}</label>
                      <textarea v-model="inquiryForm.remark" rows="3" :placeholder="t('inquiryRemarkPlaceholder')"></textarea>
                    </div>
                    <!-- 产品信息（隐藏在表单中随邮件发送） -->
                    <input type="hidden" :value="detailProduct.name" />
                    <button type="submit" class="btn btn-primary inquiry-submit-btn" :disabled="inquirySending">
                      <svg v-if="!inquirySending" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                      <span v-else class="inquiry-spinner"></span>
                      {{ inquirySending ? t('inquirySending') : t('inquirySend') }}
                    </button>
                  </form>
                </div>

                <!-- 直接联系方式 -->
                <div class="detail-actions">
                  <a href="https://wa.me/8618030192592" target="_blank" class="btn btn-outline detail-contact-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
                    WhatsApp
                  </a>
                  <a v-if="company.email" :href="'mailto:' + company.email + '?subject=Inquiry: ' + encodeURIComponent(detailProduct.name)" class="btn btn-outline detail-contact-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    {{ t('email') }}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getProducts, getCategories, getCompanyInfo, submitInquiry } from '../api/modules';

const { t } = useI18n();
const route = useRoute();

const categories = ref([]);
const products = ref([]);
const company = ref({});
const loading = ref(false);
const page = ref(1);
const pageSize = 24;
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

const selectedCategory = ref(null);
const keyword = ref('');
const sortBy = ref('newest');
const sidebarOpen = ref(false);
const detailProduct = ref(null);

// 询价表单
const inquiryForm = ref({ name: '', email: '', phone: '', remark: '' });
const inquirySending = ref(false);
const inquirySent = ref(false);
const inquiryMessage = ref('');
const copied = ref(false);

// 社媒分享链接
const shareText = computed(() => detailProduct.value ? `${detailProduct.value.name} - ${company.value.company_name_en || 'RBS Auto Parts'}` : '');
const productPageUrl = computed(() => {
  const base = window.location.origin + window.location.pathname;
  return detailProduct.value ? `${base}#/products` : base;
});
const shareWhatsApp = computed(() => `https://wa.me/8618030192592?text=${encodeURIComponent(shareText.value + ' ' + productPageUrl.value)}`);
const shareFacebook = computed(() => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productPageUrl.value)}&quote=${encodeURIComponent(shareText.value)}`);
const shareTwitter = computed(() => `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText.value)}&url=${encodeURIComponent(productPageUrl.value)}`);

function copyProductLink() {
  navigator.clipboard.writeText(productPageUrl.value).then(() => {
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  });
}

function openDetail(p) {
  detailProduct.value = p;
  inquiryForm.value = { name: '', email: '', phone: '', remark: '' };
  inquirySent.value = false;
  inquiryMessage.value = '';
}

// 发送询价（提交到后台数据库）
async function sendInquiry() {
  if (!inquiryForm.value.name.trim() || !inquiryForm.value.email.trim()) {
    inquiryMessage.value = t('inquiryNameRequired');
    inquirySent.value = false;
    return;
  }
  inquirySending.value = true;
  try {
    const p = detailProduct.value;
    await submitInquiry({
      product_id: p.id,
      product_name: p.name,
      oe_number: p.oe_number || '',
      category_name: p.category_name_zh || '',
      customer_name: inquiryForm.value.name.trim(),
      customer_email: inquiryForm.value.email.trim(),
      customer_phone: inquiryForm.value.phone?.trim() || '',
      customer_message: inquiryForm.value.remark?.trim() || '',
    });
    inquirySent.value = true;
    inquiryMessage.value = t('inquirySuccess');
  } catch (e) {
    inquirySent.value = false;
    inquiryMessage.value = e.response?.data?.message || e.message;
  }
  inquirySending.value = false;
}

function selectCategory(id) {
  selectedCategory.value = id;
  page.value = 1;
  sidebarOpen.value = false;
  loadProducts();
}

async function loadProducts() {
  loading.value = true;
  try {
    const params = { page: page.value, limit: pageSize, sort: sortBy.value };
    if (selectedCategory.value) params.category_id = selectedCategory.value;
    if (keyword.value) params.search = keyword.value;
    const res = await getProducts(params);
    if (res.success) {
      products.value = res.data.items;
      total.value = res.data.pagination.total;
    }
  } catch (e) {}
  loading.value = false;
}

watch(() => route.query.category, (val) => {
  if (val) {
    selectedCategory.value = parseInt(val);
    page.value = 1;
  }
}, { immediate: true });

onMounted(async () => {
  try {
    const [catRes, companyRes] = await Promise.all([getCategories(), getCompanyInfo()]);
    if (catRes.success) categories.value = catRes.data;
    if (companyRes.success) company.value = companyRes.data || {};
  } catch (e) {}
  await loadProducts();
});
</script>

<style scoped>
/* ==================== Banner ==================== */
.page-banner {
  position: relative;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #1e40af 100%);
  color: white;
  padding: 64px 0;
  text-align: center;
  overflow: hidden;
}

.banner-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.banner-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.banner-particle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.15;
}

.banner-particle-1 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, #3b82f6, transparent 70%);
  top: -80px;
  right: -60px;
}

.banner-particle-2 {
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, #f59e0b, transparent 70%);
  bottom: -60px;
  left: -40px;
}

.banner-title {
  position: relative;
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-bottom: 12px;
}

.banner-desc {
  position: relative;
  font-size: 16px;
  opacity: 0.75;
  max-width: 480px;
  margin: 0 auto;
  line-height: 1.7;
}

/* ==================== Layout ==================== */
.products-layout {
  display: flex;
  gap: 28px;
  align-items: flex-start;
}

.products-sidebar {
  width: 260px;
  flex-shrink: 0;
}

.products-main {
  flex: 1;
  min-width: 0;
}

/* ==================== Sidebar ==================== */
.sidebar-toggle-mobile {
  display: none;
  padding: 14px 16px;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 16px;
  align-items: center;
  gap: 10px;
  color: var(--gray-700);
  border: 1px solid var(--border-light);
}

.sidebar-arrow {
  margin-left: auto;
  font-size: 10px;
  transition: var(--transition);
}

.sidebar-arrow.rotated {
  transform: rotate(180deg);
}

.category-filter {
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
  position: sticky;
  top: 100px;
  border: 1px solid var(--border-light);
}

.filter-header {
  padding: 16px 18px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--gray-400);
  background: var(--gray-50);
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--border-light);
}

.cat-filter-item {
  padding: 11px 18px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--gray-600);
  border-bottom: 1px solid var(--gray-50);
  transition: var(--transition);
  display: flex;
  align-items: center;
  gap: 10px;
}

.cat-filter-item:last-child {
  border-bottom: none;
}

.cat-filter-item:hover {
  background: var(--gray-50);
  color: var(--gray-900);
}

.cat-filter-item.active {
  background: var(--primary-50);
  color: var(--primary-light);
  font-weight: 600;
}

.cat-filter-item.active svg {
  stroke: var(--primary-light);
}

.count-badge {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  background: var(--gray-100);
  color: var(--gray-500);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  min-width: 24px;
  text-align: center;
}

.cat-filter-item.active .count-badge {
  background: rgba(59, 130, 246, 0.12);
  color: var(--primary-light);
}

.cat-filter-item.sub {
  font-size: 13px;
  padding-left: 36px;
  color: var(--gray-500);
}

.cat-filter-item.sub svg {
  opacity: 0.5;
}

/* ==================== Toolbar ==================== */
.products-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  align-items: center;
}

.toolbar-search {
  flex: 1;
  min-width: 200px;
  position: relative;
}

.toolbar-search svg {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--gray-400);
}

.search-input {
  width: 100%;
  padding: 10px 14px 10px 42px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  font-size: 14px;
  font-family: inherit;
  background: white;
  transition: var(--transition);
  color: var(--gray-700);
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-light);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.toolbar-sort {
  flex-shrink: 0;
}

.sort-select {
  padding: 10px 36px 10px 14px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  font-size: 14px;
  font-family: inherit;
  background: white;
  color: var(--gray-700);
  cursor: pointer;
  appearance: auto;
  transition: var(--transition);
}

.sort-select:focus {
  outline: none;
  border-color: var(--primary-light);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.toolbar-count {
  font-size: 13px;
  color: var(--gray-400);
  font-weight: 500;
  white-space: nowrap;
}

/* ==================== Product Grid ==================== */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}

.product-card {
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: var(--transition);
  border: 1px solid var(--border-light);
  position: relative;
}

.product-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-xl);
  border-color: transparent;
}

.product-thumb {
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--gray-100);
  position: relative;
}

.product-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.product-card:hover .product-thumb img {
  transform: scale(1.08);
}

.product-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: var(--transition);
}

.product-card:hover .product-overlay {
  opacity: 1;
}

.view-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: white;
  color: var(--gray-900);
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 600;
  transform: translateY(8px);
  transition: var(--transition);
}

.product-card:hover .view-btn {
  transform: translateY(0);
}

.no-product-img {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--gray-300);
  background: linear-gradient(135deg, var(--gray-50), var(--gray-100));
}

.product-card-body {
  padding: 16px;
}

.product-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-800);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 8px;
}

.product-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.product-oe {
  font-size: 12px;
  color: var(--gray-400);
  background: var(--gray-50);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-weight: 500;
}

.product-category {
  font-size: 12px;
  color: var(--primary-light);
  font-weight: 600;
}

/* ==================== Empty State ==================== */
.empty-state {
  text-align: center;
  padding: 64px 24px;
  color: var(--gray-400);
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.4;
}

/* ==================== Pagination ==================== */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  margin-top: 40px;
}

.page-btn {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: white;
  color: var(--gray-600);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  font-family: inherit;
}

.page-btn:hover:not(:disabled) {
  border-color: var(--primary-light);
  color: var(--primary-light);
  background: var(--primary-50);
}

.page-btn.active {
  background: var(--primary-light);
  color: white;
  border-color: var(--primary-light);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ==================== Detail Modal ==================== */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.detail-modal {
  background: white;
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 920px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
}

.detail-close {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
  backdrop-filter: blur(10px);
}

.detail-close:hover {
  background: rgba(0, 0, 0, 0.7);
  transform: rotate(90deg);
}

.detail-body {
  display: flex;
}

.detail-image {
  flex: 1;
  min-width: 0;
  background: var(--gray-50);
}

.detail-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.detail-info {
  width: 360px;
  flex-shrink: 0;
  padding: 28px 24px;
  border-left: 1px solid var(--gray-100);
  overflow-y: auto;
  max-height: 90vh;
}

.detail-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--gray-900);
  margin-bottom: 16px;
  line-height: 1.4;
  letter-spacing: -0.01em;
}

.detail-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.detail-oe-badge,
.detail-cat-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: var(--radius);
  width: fit-content;
}

.detail-oe-badge {
  background: #fef3c7;
  color: #92400e;
}

.detail-cat-badge {
  background: #eff6ff;
  color: var(--primary-light);
}

.detail-remark {
  font-size: 14px;
  color: var(--gray-500);
  line-height: 1.7;
  margin-bottom: 24px;
}

.detail-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-contact-btn {
  width: 100%;
  justify-content: center;
  gap: 8px;
}

/* ==================== Share Section ==================== */
.detail-section-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--gray-900);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 12px;
}

.detail-share-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--gray-100);
}

.share-btns {
  display: flex;
  gap: 8px;
}

.share-btn {
  width: 40px;
  height: 40px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-light);
  background: white;
  cursor: pointer;
  transition: var(--transition);
  color: var(--gray-600);
  text-decoration: none;
}

.share-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: transparent;
}

.share-btn-whatsapp:hover {
  background: #25D366;
  color: white;
  border-color: #25D366;
}

.share-btn-facebook:hover {
  background: #1877F2;
  color: white;
  border-color: #1877F2;
}

.share-btn-twitter:hover {
  background: #000;
  color: white;
  border-color: #000;
}

.share-btn-copy:hover {
  background: var(--primary-light);
  color: white;
  border-color: var(--primary-light);
}

.share-btn-copy.copied {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

/* ==================== Inquiry Form ==================== */
.detail-inquiry-section {
  margin-bottom: 20px;
}

.inquiry-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.inquiry-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.inquiry-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.inquiry-field label {
  font-size: 12px;
  font-weight: 600;
  color: var(--gray-600);
}

.inquiry-field input,
.inquiry-field textarea {
  padding: 8px 12px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  font-size: 13px;
  color: var(--gray-900);
  background: var(--gray-50);
  transition: var(--transition);
  font-family: inherit;
  resize: vertical;
}

.inquiry-field input:focus,
.inquiry-field textarea:focus {
  outline: none;
  border-color: var(--primary-light);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  background: white;
}

.inquiry-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 500;
  background: #fef2f2;
  color: #dc2626;
}

.inquiry-message-success {
  background: #f0fdf4;
  color: #16a34a;
}

.inquiry-submit-btn {
  width: 100%;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px !important;
  font-size: 14px;
  font-weight: 600;
}

.inquiry-submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.inquiry-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ==================== Transitions ==================== */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .detail-modal,
.modal-leave-active .detail-modal {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .detail-modal,
.modal-leave-to .detail-modal {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}

/* ==================== Responsive ==================== */
@media (max-width: 1024px) {
  .products-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .page-banner {
    padding: 48px 0;
  }

  .banner-title {
    font-size: 28px;
  }

  .products-layout {
    flex-direction: column;
  }

  .products-sidebar {
    width: 100%;
  }

  .sidebar-toggle-mobile {
    display: flex;
  }

  .sidebar-content {
    display: none;
  }

  .sidebar-content.open,
  .products-sidebar.open .sidebar-content {
    display: block;
  }

  .products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .detail-body {
    flex-direction: column;
  }

  .detail-info {
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--gray-100);
    padding: 24px;
    max-height: none;
  }

  .detail-modal {
    max-width: 100%;
    max-height: 95vh;
  }

  .toolbar-count {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .products-grid {
    grid-template-columns: 1fr;
  }
}
</style>
