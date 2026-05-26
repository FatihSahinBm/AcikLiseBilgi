import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

// Load Inter font for highly premium typography instead of system defaults
const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false // Prevents the browser zoom effect on inputs, giving a 100% native feel on iOS
};

export const metadata: Metadata = {
  title: 'MEB Açık Lise Duyuru Takip',
  description: 'MEB Açık Öğretim Lisesi (AOL) önemli duyurularını anlık takip eden ve anında iPhone cihazlara web push notification gönderen PWA uygulaması.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AOL Duyuru'
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: '/icons/icon-192x192.png'
  },
  other: {
    'mobile-web-app-capable': 'yes'
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full scroll-smooth">
      <head>
        {/* iOS startup splash screen image */}
        <link rel="apple-touch-startup-image" href="/icons/icon-512x512.png" />
      </head>
      <body className={`${inter.className} min-h-full bg-[#ffe5ec] text-zinc-800 antialiased flex flex-col`}>
        {children}
        
        {/* Load official OneSignal Web SDK page script asynchronously */}
        <Script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
