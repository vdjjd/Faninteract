import './globals.css';
import type { Metadata } from 'next';

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
      <body className="min-h-screen bg-[#0b111d] text-white">{children}</body>
    </html>
  );
}
