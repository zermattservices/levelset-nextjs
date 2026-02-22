import type { Metadata } from 'next';
import Script from 'next/script';
import { mont, satoshi } from '@/lib/fonts';
import { getFBPixelScript } from '@/lib/analytics';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Levelset — The Smarter Way to Manage Your Team',
    template: '%s | Levelset',
  },
  description:
    'Positional ratings, discipline tracking, and complete team management — built exclusively for Chick-fil-A operators.',
  metadataBase: new URL('https://levelset.io'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://levelset.io',
    siteName: 'Levelset',
    title: 'Levelset — The Smarter Way to Manage Your Team',
    description:
      'Positional ratings, discipline tracking, and complete team management — built exclusively for Chick-fil-A operators.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Levelset — The Smarter Way to Manage Your Team',
    description:
      'Positional ratings, discipline tracking, and complete team management — built exclusively for Chick-fil-A operators.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${mont.variable} ${satoshi.variable}`}>
      <head>
        {/* Facebook Pixel */}
        <Script
          id="fb-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: getFBPixelScript() }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=1566128417898649&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
      </head>
      <body className="font-body antialiased">
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
