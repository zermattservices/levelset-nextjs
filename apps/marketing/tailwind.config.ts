import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--ls-color-brand-base)',
          hover: 'var(--ls-color-brand-hover)',
          border: 'var(--ls-color-brand-border)',
          foreground: 'var(--ls-color-brand-foreground)',
          soft: 'var(--ls-color-brand-soft)',
        },
        destructive: {
          DEFAULT: 'var(--ls-color-destructive-base)',
          hover: 'var(--ls-color-destructive-hover)',
          border: 'var(--ls-color-destructive-border)',
          foreground: 'var(--ls-color-destructive-foreground)',
          soft: 'var(--ls-color-destructive-soft)',
        },
        success: {
          DEFAULT: 'var(--ls-color-success-base)',
          border: 'var(--ls-color-success-border)',
          foreground: 'var(--ls-color-success-foreground)',
          soft: 'var(--ls-color-success-soft)',
        },
        warning: {
          DEFAULT: 'var(--ls-color-warning-base)',
          border: 'var(--ls-color-warning-border)',
          foreground: 'var(--ls-color-warning-foreground)',
          soft: 'var(--ls-color-warning-soft)',
        },
        muted: {
          DEFAULT: 'var(--ls-color-muted-base)',
          border: 'var(--ls-color-muted-border)',
          foreground: 'var(--ls-color-muted-foreground)',
          soft: 'var(--ls-color-muted-soft)',
        },
        neutral: {
          DEFAULT: 'var(--ls-color-neutral-base)',
          border: 'var(--ls-color-neutral-border)',
          foreground: 'var(--ls-color-neutral-foreground)',
          soft: 'var(--ls-color-neutral-soft)',
        },
        // Basic utility colors
        text: {
          primary: 'var(--ls-color-basic-text-primary)',
          secondary: 'var(--ls-color-basic-text-secondary)',
        },
        bg: {
          container: 'var(--ls-color-basic-bg-container)',
          input: 'var(--ls-color-basic-bg-input)',
        },
        border: {
          DEFAULT: 'var(--ls-color-basic-border)',
        },
      },
      fontFamily: {
        heading: ['var(--ls-font-heading)'],
        body: ['var(--ls-font-body)'],
        mono: ['var(--ls-font-mono)'],
      },
      maxWidth: {
        content: 'var(--ls-max-content-width)',
        narrow: 'var(--ls-max-narrow-width)',
        wide: 'var(--ls-max-wide-width)',
      },
      borderRadius: {
        sm: 'var(--ls-radius-sm)',
        DEFAULT: 'var(--ls-radius-md)',
        md: 'var(--ls-radius-md)',
        lg: 'var(--ls-radius-lg)',
        xl: 'var(--ls-radius-xl)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out forwards',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'count-up': 'count-up 0.4s ease-out forwards',
      },
    },
  },
  plugins: [],
};

export default config;
