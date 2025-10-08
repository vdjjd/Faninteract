import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'FanInteract',
  description: 'Interactive Fan Wall & Game Day Experiences',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          backgroundColor: '#0d0d0d',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
          margin: 0,
          padding: 0,
        }}
      >
        {children}
      </body>
    </html>
  );
}
