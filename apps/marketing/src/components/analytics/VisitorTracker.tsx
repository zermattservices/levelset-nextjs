'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/lib/tracking';

/**
 * Tracks page views for CRM attribution.
 * Sends a page view event on mount and on client-side navigation.
 */
export function VisitorTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    // Avoid duplicate tracking for the same path
    if (pathname === lastTrackedPath.current) return;
    lastTrackedPath.current = pathname;
    trackPageView();
  }, [pathname]);

  return null;
}
