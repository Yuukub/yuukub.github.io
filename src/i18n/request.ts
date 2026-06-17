import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  const activeLocale = (routing.locales.includes(locale as any) ? locale : routing.defaultLocale) as string;
  console.log('--- [i18n] getRequestConfig called with requestLocale:', locale, 'resolved to:', activeLocale);
  
  return {
    locale: activeLocale,
    messages: (await import(`../../messages/${activeLocale}.json`)).default
  };
});
