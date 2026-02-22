import localFont from 'next/font/local';

export const mont = localFont({
  src: [
    {
      path: '../../public/fonts/Mont-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Mont-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-mont',
  display: 'swap',
});

export const satoshi = localFont({
  src: [
    {
      path: '../../public/fonts/Satoshi-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Satoshi-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Satoshi-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-satoshi',
  display: 'swap',
});
