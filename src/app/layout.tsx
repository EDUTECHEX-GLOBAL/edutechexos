import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../styles/tailwind.css';
import { Toaster as SonnerToaster } from 'sonner';

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@1,2,3,4,5,6,7,8,9,10&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="m-0 p-0 h-full bg-background text-foreground antialiased" suppressHydrationWarning>
        {children}
        <SonnerToaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: "'Inter', system-ui, sans-serif",
              borderRadius: '0.75rem',
              border: '1px solid #dde8dd',
            },
          }}
        />
      </body>
    </html>
  );
}
