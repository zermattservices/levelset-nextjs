'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView, trackPageLeave } from '@/lib/tracking';

/**
 * Tracks page views and dwell time for CRM attribution.
 * Sends page view on navigation, and page leave events on tab hide/close.
 */
export function VisitorTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  // Track page views on navigation
  useEffect(() => {
    if (pathname === lastTrackedPath.current) return;

    // Send leave event for the previous page before tracking the new one
    if (lastTrackedPath.current) {
      trackPageLeave();
    }

    lastTrackedPath.current = pathname;
    trackPageView();
  }, [pathname]);

  // Track page leave on tab hide or browser close
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        trackPageLeave();
      }
    };

    const handleBeforeUnload = () => {
      trackPageLeave();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return null;
}
