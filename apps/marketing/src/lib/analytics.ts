// Unified analytics event tracking
// Currently supports Facebook Pixel. Ready for GA4, Vercel Analytics, PostHog, etc.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || '1566128417898649';

/**
 * Track a custom event across all configured analytics providers.
 */
export function trackEvent(name: string, params?: Record<string, unknown>) {
  // Facebook Pixel
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', name, params);
  }

  // Future: Google Analytics 4
  // if (typeof window !== 'undefined' && window.gtag) {
  //   window.gtag('event', name, params);
  // }

  // Future: Vercel Analytics
  // Future: PostHog
}

/**
 * Track a page view across all analytics providers.
 */
export function trackPageView() {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'PageView');
  }
}

/**
 * Track a lead/signup event (waitlist form submission).
 */
export function trackLead(params?: Record<string, unknown>) {
  trackEvent('Lead', params);
}

/**
 * Facebook Pixel initialization script (for use in layout).
 */
export function getFBPixelScript(): string {
  return `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${FB_PIXEL_ID}');
    fbq('track', 'PageView');
  `;
}
