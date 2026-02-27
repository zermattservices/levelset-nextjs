'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';

interface PageViewTrackerProps {
  event: string;
  params?: Record<string, unknown>;
}

/** Fires a single analytics event on mount. Drop into any page for tracking. */
export function PageViewTracker({ event, params }: PageViewTrackerProps) {
  useEffect(() => {
    trackEvent(event, params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
