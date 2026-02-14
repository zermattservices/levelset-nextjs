import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import commonEn from '../locales/en/common.json';
import commonEs from '../locales/es/common.json';
import formsEn from '../locales/en/forms.json';
import formsEs from '../locales/es/forms.json';
import errorsEn from '../locales/en/errors.json';
import errorsEs from '../locales/es/errors.json';

// Only initialize if not already initialized (for Next.js SSR)
if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: {
          common: commonEn,
          forms: formsEn,
          errors: errorsEn,
        },
        es: {
          common: commonEs,
          forms: formsEs,
          errors: errorsEs,
        },
      },
      lng: typeof window !== 'undefined' 
        ? (localStorage.getItem('levelset.mobile.language') || 'en')
        : 'en',
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false, // React already escapes
      },
      defaultNS: 'common',
      react: {
        useSuspense: false, // Disable suspense for Next.js compatibility
      },
    });
}

export default i18n;

