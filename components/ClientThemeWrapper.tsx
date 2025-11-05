'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

/**
 * Auth pages now use landing background and overlay,
 * so DO NOT flip to light theme on login/signup.
 */
function isGuestPostingRoute(path: string) {
  // only guest wall submission pages get the light UI
  return path.startsWith('/post') || path.startsWith('/guest');
}

export default function ClientThemeWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const lightMode = isGuestPostingRoute(pathname || '');

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
