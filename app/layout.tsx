// ✅ Prevent static rendering for dynamic runtime pages
export const dynamic = 'force-dynamic';

import './globals.css';
import type { Metadata } from 'next';
import ClientThemeWrapper from '@/components/ClientThemeWrapper';
import { SupabaseRealtimeProvider } from '@/providers/SupabaseRealtimeProvider';

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
        style={{
          margin: 0,
          minHeight: '100vh',
          background: 'linear-gradient(135deg,#0a2540,#1b2b44,#000000)',
          color: 'white',
        }}
      >
        {/* 🛰 Shared Supabase Realtime channel available app-wide */}
        <SupabaseRealtimeProvider>
          <ClientThemeWrapper>{children}</ClientThemeWrapper>
        </SupabaseRealtimeProvider>
      </body>
    </html>
  );
}
