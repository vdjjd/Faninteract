// ✅ Prevent static rendering for dynamic runtime pages
export const dynamic = 'force-dynamic';

import './globals.css';
import type { Metadata } from 'next';
import ClientThemeWrapper from '@/components/ClientThemeWrapper';
import { SupabaseRealtimeProvider } from '@/providers/SupabaseRealtimeProvider';
import { cn } from "../lib/utils";

export const metadata: Metadata = {
  title: 'FanInteract',
  description: 'Turn crowds into communities with live walls, trivia, and polling.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={cn('min-h-screen', 'w-full', 'text-white', 'overflow-x-hidden')}
        style={{
          // ❗️ DO NOT set background here — guest wall pages need control
          margin: 0,
        }}
      >
        <SupabaseRealtimeProvider>
          <ClientThemeWrapper>
            {children}
          </ClientThemeWrapper>
        </SupabaseRealtimeProvider>
      </body>
    </html>
  );
}
