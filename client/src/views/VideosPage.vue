<template>
  <div class="videos-page">
    <div class="page-hero">
      <div class="container">
        <h1>{{ t('videoCenter') }}</h1>
        <p>{{ t('videoCenterDesc') }}</p>
      </div>
    </div>
    <div class="container">
      <div v-if="videos.length" class="video-grid">
        <a
          v-for="video in videos"
          :key="video.id"
          :href="video.youtube_url || '#'"
          target="_blank"
          rel="noopener noreferrer"
          class="video-card"
        >
          <div class="video-thumb">
            <img v-if="video.thumbnail_url" :src="video.thumbnail_url" :alt="video.title" loading="lazy" />
            <div v-else class="video-no-thumb">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
            <div class="video-play">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          </div>
          <div class="video-info">
            <h3>{{ video.title }}</h3>
            <p v-if="video.description">{{ video.description }}</p>
          </div>
        </a>
      </div>
      <div v-else class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
        <p>{{ t('noData') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getVideos } from '../api/modules';

const { t } = useI18n();
const videos = ref([]);

onMounted(async () => {
  const res = await getVideos({ published: 1, limit: 100 });
  if (res.success) videos.value = res.data;
});
</script>

<style scoped>
.videos-page { min-height: 60vh; }

.page-hero {
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
  padding: 56px 0 48px;
  text-align: center;
  color: white;
  margin-bottom: 48px;
}

.page-hero h1 {
  font-size: 36px;
  font-weight: 800;
  margin-bottom: 8px;
}

.page-hero p {
  font-size: 16px;
  opacity: 0.7;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
  padding-bottom: 80px;
}

.video-card {
  background: white;
  border-radius: var(--radius-xl);
  overflow: hidden;
  border: 1px solid var(--border-light);
  cursor: pointer;
  transition: var(--transition);
  display: block;
  text-decoration: none;
  color: inherit;
}

.video-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-xl);
  border-color: transparent;
}

.video-thumb {
  position: relative;
  aspect-ratio: 16/9;
  background: #0f172a;
  overflow: hidden;
}

.video-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.video-card:hover .video-thumb img {
  transform: scale(1.05);
}

.video-play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  transition: var(--transition);
}

.video-play svg { margin-left: 3px; }

.video-card:hover .video-play {
  background: rgba(255, 0, 0, 1);
  transform: translate(-50%, -50%) scale(1.1);
}

.video-no-thumb {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.2);
}

.video-info {
  padding: 18px;
}

.video-info h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--gray-800);
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.video-info p {
  font-size: 13px;
  color: var(--gray-500);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--gray-400);
}

.empty-state svg { margin-bottom: 16px; }

@media (max-width: 768px) {
  .video-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  .page-hero h1 { font-size: 28px; }
}

@media (max-width: 480px) {
  .video-grid {
    grid-template-columns: 1fr;
  }
}
</style>
