<template>
  <div class="home-page">
    <!-- Hero -->
    <section class="hero">
      <div class="hero-bg">
        <div class="hero-particle hero-particle-1"></div>
        <div class="hero-particle hero-particle-2"></div>
        <div class="hero-particle hero-particle-3"></div>
      </div>
      <div class="hero-content container">
        <div v-if="company.logo_url" class="hero-logo">
          <img :src="company.logo_url" alt="Logo" />
        </div>
        <div class="hero-badge">{{ t('heroBadge') }}</div>
        <h1 class="hero-title">{{ heroTitle }}</h1>
        <p class="hero-subtitle">{{ heroSubtitle }}</p>
        <div class="hero-actions">
          <router-link to="/products" class="btn btn-lg btn-hero-primary">
            {{ t('viewProducts') }}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </router-link>
          <router-link to="/about" class="btn btn-lg btn-hero-outline">
            {{ t('about') }}
          </router-link>
        </div>
        <div v-if="company.whatsapp" class="hero-stats">
          <div class="hero-stat">
            <span class="hero-stat-number">{{ topCategories.length }}+</span>
            <span class="hero-stat-label">{{ t('categories') }}</span>
          </div>
          <div class="hero-stat-divider"></div>
          <div class="hero-stat">
            <span class="hero-stat-label">WhatsApp</span>
            <span class="hero-stat-number">{{ company.whatsapp }}</span>
          </div>
        </div>
      </div>
      <div class="hero-wave">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path d="M0,48L48,42.7C96,37,192,27,288,32C384,37,480,59,576,58.7C672,59,768,37,864,32C960,27,1056,37,1152,42.7C1248,48,1344,48,1392,48L1440,48L1440,80L0,80Z" fill="var(--gray-50)"/>
        </svg>
      </div>
    </section>

    <!-- Features -->
    <section class="features-section">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">{{ t('whyUs') }}</span>
          <h2 class="section-title">{{ t('featuresTitle') }}</h2>
          <p class="section-desc">{{ t('featuresDesc') }}</p>
        </div>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon-wrap feature-icon-1">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h3>{{ t('quality') }}</h3>
            <p>{{ t('qualityDesc') }}</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon-wrap feature-icon-2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            </div>
            <h3>{{ t('wideRange') }}</h3>
            <p>{{ t('wideRangeDesc') }}</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon-wrap feature-icon-3">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <h3>{{ t('service') }}</h3>
            <p>{{ t('serviceDesc') }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Video Center -->
    <section v-if="featuredVideos.length > 0" class="video-section">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">{{ t('videoCenter') }}</span>
          <h2 class="section-title">{{ t('videoCenter') }}</h2>
          <p class="section-desc">{{ t('videoCenterDesc') }}</p>
        </div>
        <div class="video-grid">
          <div
            v-for="video in featuredVideos"
            :key="video.id"
            class="video-card"
            @click="openVideo(video)"
          >
            <div class="video-thumb-wrap">
              <img v-if="video.thumbnail_url" :src="video.thumbnail_url" :alt="video.title" loading="lazy" />
              <div v-else class="video-no-thumb">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
              <div class="video-play-btn">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
            </div>
            <div class="video-info">
              <h3 class="video-title">{{ video.title }}</h3>
              <p v-if="video.description" class="video-desc">{{ video.description }}</p>
            </div>
          </div>
        </div>
        <div class="featured-more">
          <router-link to="/videos" class="btn btn-view-all">
            {{ t('viewMore') }}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </router-link>
        </div>
      </div>
    </section>

    <!-- News -->
    <section v-if="latestNews.length > 0" class="news-section">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">{{ t('news') }}</span>
          <h2 class="section-title">{{ t('news') }}</h2>
        </div>
        <div class="news-list">
          <div
            v-for="item in latestNews"
            :key="item.id"
            class="news-card"
          >
            <div v-if="item.cover_image" class="news-cover">
              <img :src="item.cover_image" :alt="item.title" loading="lazy" />
            </div>
            <div class="news-content">
              <h3 class="news-title">{{ getLocalizedTitle(item) }}</h3>
              <p class="news-summary">{{ getLocalizedSummary(item) }}</p>
              <span class="news-date">{{ formatDate(item.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA / Contact -->
    <section class="cta-section">
      <div class="container">
        <div class="cta-card">
          <div class="cta-content">
            <h2>{{ t('ctaTitle') }}</h2>
            <p>{{ t('ctaDesc') }}</p>
          </div>
          <div class="cta-actions">
            <a v-if="company.email" :href="'mailto:' + company.email" class="btn btn-cta-email">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              {{ company.email }}
            </a>
            <a href="https://wa.me/8618030192592" target="_blank" class="btn btn-cta-whatsapp">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
            <a v-if="company.phone" :href="'tel:' + company.phone" class="btn btn-cta-phone">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              {{ company.phone }}
            </a>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getCompanyInfo, getCategories, getVideos, getNews } from '../api/modules';

const { t, locale } = useI18n();
const router = useRouter();

const company = ref({});
const topCategories = ref([]);
const featuredVideos = ref([]);
const latestNews = ref([]);

const heroTitle = computed(() => {
  const m = { zh: 'company_name_zh', en: 'company_name_en', es: 'company_name_es' };
  return company.value[m[locale.value]] || t('heroTitle');
});

const heroSubtitle = computed(() => {
  const m = { zh: 'description_zh', en: 'description_en', es: 'description_es' };
  return company.value[m[locale.value]] || t('heroSubtitle');
});

function goProducts(categoryId) {
  router.push({ path: '/products', query: { category: categoryId } });
}

function openVideo(video) {
  if (video.youtube_url) window.open(video.youtube_url, '_blank');
}

function getLocalizedTitle(item) {
  const map = { zh: 'title_zh', en: 'title', es: 'title_es' };
  return item[map[locale.value]] || item.title;
}

function getLocalizedSummary(item) {
  const map = { zh: 'summary_zh', en: 'summary', es: 'summary_es' };
  return item[map[locale.value]] || item.summary;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(' ', 'T'));
  return d.toLocaleDateString(locale.value === 'zh' ? 'zh-CN' : locale.value === 'es' ? 'es-ES' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

onMounted(async () => {
  try {
    const [companyRes, catRes, videoRes, newsRes] = await Promise.all([
      getCompanyInfo(),
      getCategories(),
      getVideos({ published: 1, limit: 6 }),
      getNews({ published: 1, limit: 5 }),
    ]);
    if (companyRes.success) company.value = companyRes.data || {};
    if (catRes.success) topCategories.value = catRes.data.slice(0, 8);
    if (videoRes.success) featuredVideos.value = videoRes.data || [];
    if (newsRes.success) latestNews.value = newsRes.data || [];
  } catch (e) {}
});
</script>

<style scoped>
/* ==================== Hero ==================== */
.hero {
  position: relative;
  min-height: 560px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #1e40af 100%);
  color: white;
  text-align: center;
  overflow: hidden;
  padding: 80px 0 100px;
}

.hero-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.hero-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.hero-particle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.15;
}

.hero-particle-1 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, #3b82f6, transparent 70%);
  top: -100px;
  right: -100px;
  animation: float 8s ease-in-out infinite;
}

.hero-particle-2 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, #f59e0b, transparent 70%);
  bottom: -80px;
  left: -80px;
  animation: float 10s ease-in-out infinite reverse;
}

.hero-particle-3 {
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, #10b981, transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: float 12s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(20px, -20px); }
}

.hero-content {
  position: relative;
  z-index: 2;
  max-width: 720px;
}

.hero-logo {
  margin-bottom: 24px;
}

.hero-logo img {
  max-height: 80px;
  filter: brightness(2);
}

.hero-badge {
  display: inline-block;
  padding: 6px 18px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.05em;
  margin-bottom: 24px;
  backdrop-filter: blur(10px);
}

.hero-title {
  font-size: 48px;
  font-weight: 800;
  line-height: 1.15;
  margin-bottom: 20px;
  letter-spacing: -0.03em;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
}

.hero-subtitle {
  font-size: 18px;
  opacity: 0.85;
  margin-bottom: 36px;
  line-height: 1.8;
  max-width: 560px;
  margin-left: auto;
  margin-right: auto;
}

.hero-actions {
  display: flex;
  gap: 14px;
  justify-content: center;
  margin-bottom: 48px;
}

.btn-hero-primary {
  background: white !important;
  color: #0f172a !important;
  font-weight: 700;
  border-radius: var(--radius-lg);
  padding: 14px 32px !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2) !important;
}

.btn-hero-primary:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3) !important;
}

.btn-hero-outline {
  background: transparent !important;
  color: white !important;
  border: 2px solid rgba(255, 255, 255, 0.3) !important;
  border-radius: var(--radius-lg);
  padding: 14px 32px !important;
  font-weight: 600;
}

.btn-hero-outline:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  border-color: rgba(255, 255, 255, 0.5) !important;
}

.hero-stats {
  display: inline-flex;
  align-items: center;
  gap: 32px;
  padding: 16px 32px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-xl);
  backdrop-filter: blur(10px);
}

.hero-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.hero-stat-number {
  font-size: 22px;
  font-weight: 800;
}

.hero-stat-label {
  font-size: 12px;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.hero-stat-divider {
  width: 1px;
  height: 32px;
  background: rgba(255, 255, 255, 0.2);
}

.hero-wave {
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  z-index: 3;
}

.hero-wave svg {
  display: block;
  width: 100%;
  height: 80px;
}

/* ==================== Section Header ==================== */
.section-header {
  text-align: center;
  max-width: 600px;
  margin: 0 auto 48px;
}

.section-tag {
  display: inline-block;
  padding: 4px 14px;
  background: var(--primary-50);
  color: var(--primary-light);
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 14px;
}

.section-title {
  font-size: 32px;
  font-weight: 800;
  color: var(--gray-900);
  margin-bottom: 12px;
  letter-spacing: -0.02em;
}

.section-desc {
  font-size: 16px;
  color: var(--gray-500);
  line-height: 1.7;
}

/* ==================== Features ==================== */
.features-section {
  padding: 80px 0;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
}

.feature-card {
  background: white;
  border-radius: var(--radius-xl);
  padding: 40px 32px;
  text-align: center;
  border: 1px solid var(--border-light);
  transition: var(--transition);
  position: relative;
  overflow: hidden;
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  opacity: 0;
  transition: var(--transition);
}

.feature-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-xl);
  border-color: transparent;
}

.feature-card:hover::before {
  opacity: 1;
}

.feature-card:nth-child(1)::before { background: linear-gradient(90deg, #3b82f6, #1d4ed8); }
.feature-card:nth-child(2)::before { background: linear-gradient(90deg, #f59e0b, #d97706); }
.feature-card:nth-child(3)::before { background: linear-gradient(90deg, #10b981, #059669); }

.feature-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  color: white;
}

.feature-icon-1 { background: linear-gradient(135deg, #3b82f6, #1d4ed8); box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3); }
.feature-icon-2 { background: linear-gradient(135deg, #f59e0b, #d97706); box-shadow: 0 4px 16px rgba(245, 158, 11, 0.3); }
.feature-icon-3 { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3); }

.feature-card h3 {
  font-size: 19px;
  font-weight: 700;
  color: var(--gray-900);
  margin-bottom: 10px;
}

.feature-card p {
  font-size: 14px;
  color: var(--gray-500);
  line-height: 1.7;
}

/* ==================== Video Center ==================== */
.video-section {
  padding: 80px 0;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.video-card {
  background: white;
  border-radius: var(--radius-xl);
  overflow: hidden;
  border: 1px solid var(--border-light);
  cursor: pointer;
  transition: var(--transition);
}

.video-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-xl);
  border-color: transparent;
}

.video-thumb-wrap {
  position: relative;
  aspect-ratio: 16/9;
  overflow: hidden;
  background: #0f172a;
}

.video-thumb-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.video-card:hover .video-thumb-wrap img {
  transform: scale(1.05);
}

.video-play-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  transition: var(--transition);
}

.video-play-btn svg {
  margin-left: 3px;
}

.video-card:hover .video-play-btn {
  background: rgba(255, 0, 0, 1);
  transform: translate(-50%, -50%) scale(1.1);
}

.video-no-thumb {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.3);
}

.video-info {
  padding: 16px;
}

.video-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--gray-800);
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.video-desc {
  font-size: 13px;
  color: var(--gray-500);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ==================== News ==================== */
.news-section {
  padding: 80px 0;
  background: white;
}

.news-list {
  display: grid;
  gap: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.news-card {
  display: flex;
  gap: 20px;
  padding: 20px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  transition: var(--transition);
  background: var(--gray-50);
}

.news-card:hover {
  border-color: var(--primary-light);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.08);
  transform: translateY(-2px);
}

.news-cover {
  flex-shrink: 0;
  width: 160px;
  height: 100px;
  border-radius: var(--radius);
  overflow: hidden;
}

.news-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.news-content {
  flex: 1;
  min-width: 0;
}

.news-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--gray-900);
  margin-bottom: 6px;
}

.news-summary {
  font-size: 14px;
  color: var(--gray-500);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 8px;
}

.news-date {
  font-size: 12px;
  color: var(--gray-400);
  font-weight: 500;
}

.featured-more {
  text-align: center;
  margin-top: 40px;
}

.btn-view-all {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  background: var(--primary-light);
  color: white;
  border-radius: var(--radius-lg);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: var(--transition);
}

.btn-view-all:hover {
  background: var(--primary-700);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
}

/* ==================== CTA ==================== */
.cta-section {
  padding: 80px 0;
}

.cta-card {
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
  border-radius: var(--radius-xl);
  padding: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 40px;
  position: relative;
  overflow: hidden;
}

.cta-card::before {
  content: '';
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.15), transparent 70%);
  top: -100px;
  right: -50px;
}

.cta-content {
  position: relative;
  z-index: 1;
}

.cta-content h2 {
  font-size: 28px;
  font-weight: 800;
  color: white;
  margin-bottom: 12px;
  letter-spacing: -0.02em;
}

.cta-content p {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.7;
}

.cta-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}

.btn-cta-email,
.btn-cta-whatsapp,
.btn-cta-phone {
  background: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  color: white !important;
  border-radius: var(--radius) !important;
  backdrop-filter: blur(10px);
  font-size: 14px;
  font-weight: 500;
  min-width: 240px;
  justify-content: flex-start;
  gap: 12px;
}

.btn-cta-whatsapp {
  background: rgba(37, 211, 102, 0.15) !important;
  border-color: rgba(37, 211, 102, 0.3) !important;
}

.btn-cta-email:hover,
.btn-cta-phone:hover {
  background: rgba(255, 255, 255, 0.2) !important;
}

.btn-cta-whatsapp:hover {
  background: rgba(37, 211, 102, 0.25) !important;
}

/* ==================== Responsive ==================== */
@media (max-width: 1024px) {
  .categories-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .hero {
    min-height: 480px;
    padding: 60px 0 80px;
  }

  .hero-title {
    font-size: 32px;
  }

  .hero-subtitle {
    font-size: 15px;
  }

  .hero-actions {
    flex-direction: column;
    align-items: center;
  }

  .hero-stats {
    flex-direction: row;
    gap: 20px;
    padding: 12px 24px;
  }

  .hero-stat-divider {
    height: 24px;
  }

  .features-section,
  .video-section,
  .news-section,
  .cta-section {
    padding: 56px 0;
  }

  .section-title {
    font-size: 24px;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .featured-section {
    padding: 56px 0;
  }

  .video-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .news-card {
    flex-direction: column;
  }

  .news-cover {
    width: 100%;
    height: 160px;
  }

  .feature-card {
    padding: 28px 24px;
    display: flex;
    text-align: left;
    gap: 20px;
    align-items: flex-start;
  }

  .feature-icon-wrap {
    margin: 0;
    flex-shrink: 0;
    width: 52px;
    height: 52px;
  }

  .categories-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .cta-card {
    padding: 36px 24px;
    flex-direction: column;
    text-align: center;
  }

  .cta-content h2 {
    font-size: 22px;
  }

  .cta-actions {
    width: 100%;
    align-items: center;
  }

  .btn-cta-email,
  .btn-cta-whatsapp,
  .btn-cta-phone {
    min-width: auto;
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 28px;
  }

  .featured-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .video-grid {
    grid-template-columns: 1fr;
  }
}
</style>
