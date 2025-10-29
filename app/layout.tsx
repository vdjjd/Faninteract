import './globals.css';
import type { Metadata } from 'next';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'FanInteract',
  description: 'Turn crowds into communities with live walls, trivia, and polling.',
};

// ✅ Helper: detect light-theme routes
function isLightRoute(path: string) {
  return (
    path.startsWith('/signin') ||
    path.startsWith('/login') ||
    path.startsWith('/signup') ||
    path.startsWith('/auth')
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  // ⚠️ Next.js layouts are server components by default, so:
  // Wrap in a client component so we can read pathname
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}

/* ---------- Client wrapper so we can use usePathname ---------- */
'use client';
function ClientWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const lightMode = isLightRoute(pathname || '');

  return (
    <div
      className={
        lightMode
          ? 'min-h-screen bg-gray-50 text-black'
          : 'min-h-screen bg-[#0b111d] text-white'
      }
    >
      {children}
    </div>
  );
}
