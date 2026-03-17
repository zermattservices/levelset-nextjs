import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        {/* Preload Satoshi fonts so MUI can measure label widths correctly
            for outlined input notches. Without preload, font-display: swap
            causes MUI to measure with fallback font → notch too narrow. */}
        <link rel="preload" href="/fonts/Satoshi-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/Satoshi-Medium.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/Satoshi-Bold.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </Head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var mode = localStorage.getItem('levelset.theme');
              var resolved = mode;
              if (!mode || mode === 'light') {
                resolved = 'light';
              } else if (mode === 'system') {
                resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              } else {
                resolved = mode;
              }
              document.documentElement.setAttribute('data-theme', resolved);
              document.documentElement.style.colorScheme = resolved;
            } catch(e) {}
          })();
        `}} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
