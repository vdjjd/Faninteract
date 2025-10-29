'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

/**
 * This wrapper switches between dark (Fan Zone)
 * and light (Sign-in / Auth) themes automatically.
 */
function isLightRoute(path: string) {
  return (
    path.startsWith('/signin') ||
    path.startsWith('/login') ||
    path.startsWith('/signup') ||
    path.startsWith('/auth')
  );
}

export default function ClientThemeWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const lightMode = isLightRoute(pathname || '');

  return (
    <div
      className={
        lightMode
          ? 'min-h-screen bg-gray-50 text-black flex flex-col items-center justify-center'
          : 'min-h-screen bg-[#0b111d] text-white'
      }
    >
      {children}
    </div>
  );
}
