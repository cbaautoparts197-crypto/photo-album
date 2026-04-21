import { createI18n } from 'vue-i18n';
import messages from './locales';

const savedLang = localStorage.getItem('lang') || 'en';

const i18n = createI18n({
  legacy: false,
  locale: savedLang,
  fallbackLocale: 'en',
  messages,
});

export default i18n;
