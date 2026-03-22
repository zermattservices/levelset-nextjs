// Visitor tracking for CRM page view attribution
// Generates a visitor_id cookie on first visit, manages sessions, and tracks page views + dwell time

const VISITOR_COOKIE = 'ls_visitor_id';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds
const SESSION_KEY = 'ls_session_id';
const SESSION_TIMESTAMP_KEY = 'ls_session_ts';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// Module-level state for time-on-page tracking
let pageEnteredAt: number = 0;
let currentPageViewId: string | null = null;
let hasTrackedLeave = false;

/**
 * Generate a UUID v4 for visitor identification
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older browsers that lack crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Get or create a visitor ID from cookies
 */
export function getVisitorId(): string {
  if (typeof document === 'undefined') return '';

  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${VISITOR_COOKIE}=`));

  if (match) {
    return match.split('=')[1];
  }

  const visitorId = generateId();
  document.cookie = `${VISITOR_COOKIE}=${visitorId}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  return visitorId;
}

/**
 * Get or create a session ID from sessionStorage.
 * Sessions expire after 30 minutes of inactivity.
 */
function getOrCreateSessionId(): string {
  if (typeof sessionStorage === 'undefined') return '';

  const existing = sessionStorage.getItem(SESSION_KEY);
  const lastActivity = sessionStorage.getItem(SESSION_TIMESTAMP_KEY);
  const now = Date.now();

  // Reuse session if within timeout
  if (existing && lastActivity && now - parseInt(lastActivity) < SESSION_TIMEOUT_MS) {
    sessionStorage.setItem(SESSION_TIMESTAMP_KEY, String(now));
    return existing;
  }

  // New session
  const sessionId = generateId();
  sessionStorage.setItem(SESSION_KEY, sessionId);
  sessionStorage.setItem(SESSION_TIMESTAMP_KEY, String(now));
  return sessionId;
}

/**
 * Track a page view by sending it to the server.
 * Uses fetch (with keepalive) instead of sendBeacon so we get back the page_view ID
 * for associating the subsequent page-leave event.
 */
export function trackPageView(): void {
  if (typeof window === 'undefined') return;

  const visitorId = getVisitorId();
  if (!visitorId) return;

  pageEnteredAt = Date.now();
  hasTrackedLeave = false;
  currentPageViewId = null;

  const url = new URL(window.location.href);
  const sessionId = getOrCreateSessionId();

  const payload = {
    visitorId,
    sessionId,
    url: url.pathname,
    referrer: document.referrer || null,
    utmSource: url.searchParams.get('utm_source') || null,
    utmMedium: url.searchParams.get('utm_medium') || null,
    utmCampaign: url.searchParams.get('utm_campaign') || null,
  };

  fetch('/api/tracking/pageview', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
  })
    .then((res) => res.json())
    .then((data) => {
      currentPageViewId = data.pageViewId || null;
    })
    .catch(() => {});
}

/**
 * Track when a user leaves a page (navigation, tab close, tab hidden).
 * Sends the time spent on the page as a beacon so it survives unload.
 */
export function trackPageLeave(): void {
  if (typeof window === 'undefined') return;
  if (!currentPageViewId || !pageEnteredAt || hasTrackedLeave) return;

  const timeOnPage = Math.round((Date.now() - pageEnteredAt) / 1000);
  if (timeOnPage < 1) return;

  hasTrackedLeave = true;

  const blob = new Blob(
    [
      JSON.stringify({
        type: 'page_leave',
        pageViewId: currentPageViewId,
        visitorId: getVisitorId(),
        sessionId: getOrCreateSessionId(),
        timeOnPageSeconds: timeOnPage,
        exitPage: window.location.pathname,
      }),
    ],
    { type: 'application/json' }
  );

  navigator.sendBeacon('/api/tracking/pageview', blob);
}
