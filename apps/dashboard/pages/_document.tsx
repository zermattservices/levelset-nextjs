import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head />
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
