import { useMobilePortal } from '@/components/mobile/MobilePortalContext';

export function useTranslatedContent() {
  // Get language from context
  const context = useMobilePortal();
  const language = context.language || 'en';
  
  return {
    translate: <T extends { [key: string]: any }>(
      item: T,
      field: keyof T,
      fallback?: string
    ): string => {
      if (language === 'en') {
        return item[field] || fallback || '';
      }
      
      // For Spanish, try _es field, fallback to English
      const esField = `${String(field)}_es` as keyof T;
      return (item[esField] as string) || item[field] || fallback || '';
    },
    language: language as 'en' | 'es',
  };
}

