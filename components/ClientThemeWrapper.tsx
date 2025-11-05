'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

/**
 * ✅ Guest submission pages use the Fan Wall background
 * We detect them by URL patterns:
 * - /guest     (guest signup)
 * - /post      (legacy fallback)
 * - /submit    (new fan wall submission path)
 *
 * ❗ Auth pages (login/signup) now have their own theme — do NOT force white bg here
 */
function isGuestPostingRoute(path: string) {
  return (
    path.includes('/guest') ||
    path.includes('/post') ||
    path.includes('/submit') // ✅ allow Fan Wall backgrounds
  );
}

export default function ClientThemeWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isGuestRoute = isGuestPostingRoute(pathname || '');

  return (
    <div
      className={
        isGuestRoute
          ? 'min-h-screen text-white' // ✅ Let wall define background
          : 'min-h-screen bg-[#0b111d] text-white' // default app theme
      }
    >
      {children}
    </div>
  );
}
