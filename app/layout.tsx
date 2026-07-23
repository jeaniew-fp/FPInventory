import type { Metadata, Viewport } from 'next';
import { Figtree } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import PWARegister from '@/components/PWARegister';

const figtree = Figtree({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: 'FPGWC Inventory',
  description: 'In-Kind Donation Inventory System for Family Promise of Greater Washington County',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FP Inventory',
  },
  icons: {
    apple: '/fpgwc-logo.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#8d4982',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FP Inventory" />
        <link rel="apple-touch-icon" href="/fpgwc-logo.png" />
      </head>
      <body className={`${figtree.className} min-h-screen`} style={{ backgroundColor: '#f8f7fb' }}>
        {children}
        <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
        <PWARegister />
      </body>
    </html>
  );
}
