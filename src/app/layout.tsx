import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Syne, DM_Sans } from 'next/font/google';
import '../styles/tailwind.css';
import { Toaster as SonnerToaster } from 'sonner';
import { ThemeProvider } from '@/components/ThemeProvider';

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'EduTechExOS — The Team OS EduTechEx Runs On',
  description:
    'EduTechExOS is the internal operating system for the EduTechEx team — channels, AI task extraction, daily digests, and org knowledge in one place.',
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`h-full ${syne.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/generated.css" />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var theme = localStorage.getItem('edutechex_theme');
                if (!theme) {
                  theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              } catch(e) {}
            })();
          `,
        }} />
      </head>
      <body className={`${dmSans.className} m-0 p-0 h-full`} suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <SonnerToaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
