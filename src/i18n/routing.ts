import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['vi', 'en'],

  // Used when no locale matches
  defaultLocale: 'vi',
  
  // This is the default in next-intl, but we can set it explicitly.
  // When 'always', the locale is always in the URL.
  localePrefix: 'always'
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
