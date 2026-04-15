<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="login-particle login-particle-1"></div>
      <div class="login-particle login-particle-2"></div>
      <div class="login-particle login-particle-3"></div>
    </div>
    <div class="login-card">
      <div class="login-header">
        <div class="login-logo-wrap">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        </div>
        <h1>{{ t('loginTitle') }}</h1>
        <p class="login-subtitle">{{ t('loginSubtitle') || 'Enter your password to access the admin panel' }}</p>
      </div>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label">{{ t('password') }}</label>
          <div class="input-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input password-input"
              :placeholder="t('passwordPlaceholder')"
              autofocus
            />
            <button type="button" class="toggle-pw" @click="showPassword = !showPassword">
              <svg v-if="showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>
        <p v-if="errorMsg" class="login-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          {{ errorMsg }}
        </p>
        <button class="btn btn-primary login-btn" type="submit" :disabled="loading">
          <span v-if="loading" class="btn-loading"></span>
          {{ loading ? '' : t('login') }}
        </button>
      </form>
      <div class="login-footer">
        <router-link to="/" class="back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          {{ t('back') }}
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { login } from '../../api/modules';

const { t } = useI18n();
const router = useRouter();

const password = ref('');
const showPassword = ref(false);
const errorMsg = ref('');
const loading = ref(false);

async function handleLogin() {
  if (!password.value) {
    errorMsg.value = t('loginError');
    return;
  }
  loading.value = true;
  errorMsg.value = '';
  try {
    const res = await login(password.value);
    if (res.success) {
      localStorage.setItem('token', res.data.token);
      router.push('/admin/dashboard');
    } else {
      errorMsg.value = res.message || t('loginError');
    }
  } catch (e) {
    errorMsg.value = t('loginError');
  }
  loading.value = false;
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #1e40af 100%);
  padding: 16px;
  position: relative;
  overflow: hidden;
}

.login-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.login-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.login-particle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.15;
}

.login-particle-1 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, #3b82f6, transparent 70%);
  top: -120px;
  right: -100px;
}

.login-particle-2 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, #f59e0b, transparent 70%);
  bottom: -80px;
  left: -80px;
}

.login-particle-3 {
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, #10b981, transparent 70%);
  top: 50%;
  left: 20%;
  transform: translate(-50%, -50%);
}

.login-card {
  position: relative;
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
  padding: 44px 40px;
  width: 100%;
  max-width: 420px;
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-logo-wrap {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  color: white;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.35);
}

.login-header h1 {
  font-size: 22px;
  font-weight: 700;
  color: var(--gray-900);
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.login-subtitle {
  font-size: 14px;
  color: var(--gray-400);
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrap svg {
  position: absolute;
  left: 14px;
  color: var(--gray-400);
  z-index: 1;
}

.password-input {
  padding-left: 42px !important;
}

.toggle-pw {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  color: var(--gray-400);
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
}

.toggle-pw:hover {
  color: var(--gray-600);
  background: var(--gray-50);
}

.login-error {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #dc2626;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 16px;
  background: #fef2f2;
  padding: 10px 14px;
  border-radius: var(--radius);
  border: 1px solid #fecaca;
}

.login-btn {
  width: 100%;
  margin-top: 8px;
  padding: 12px !important;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
}

.btn-loading {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.login-footer {
  text-align: center;
  margin-top: 24px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--gray-400);
  text-decoration: none;
  transition: var(--transition);
}

.back-link:hover {
  color: var(--primary-light);
}
</style>
