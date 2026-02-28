// Visitor tracking for CRM page view attribution
// Generates a visitor_id cookie on first visit and tracks page views server-side

const VISITOR_COOKIE = 'ls_visitor_id';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

/**
 * Generate a UUID v4 for visitor identification
 */
function generateVisitorId(): string {
  return crypto.randomUUID();
}

/**
 * Get or create a visitor ID from cookies
 */
export function getVisitorId(): string {
  if (typeof document === 'undefined') return '';

  // Check existing cookie
  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${VISITOR_COOKIE}=`));

  if (match) {
    return match.split('=')[1];
  }

  // Generate new visitor ID and set cookie
  const visitorId = generateVisitorId();
  document.cookie = `${VISITOR_COOKIE}=${visitorId}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  return visitorId;
}

/**
 * Track a page view by sending it to the server
 */
export function trackPageView(): void {
  if (typeof window === 'undefined') return;

  const visitorId = getVisitorId();
  if (!visitorId) return;

  const url = new URL(window.location.href);

  const payload = {
    visitorId,
    url: url.pathname,
    referrer: document.referrer || null,
    utmSource: url.searchParams.get('utm_source') || null,
    utmMedium: url.searchParams.get('utm_medium') || null,
    utmCampaign: url.searchParams.get('utm_campaign') || null,
  };

  // Use sendBeacon for non-blocking tracking (doesn't delay page navigation)
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  navigator.sendBeacon('/api/tracking/pageview', blob);
}
