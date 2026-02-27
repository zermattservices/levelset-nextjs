/**
 * useOnboardingGuard — Redirects to /onboarding if the user's org
 * has not completed onboarding (onboarding_completed === false).
 *
 * Usage: Call in any page component that should be blocked during onboarding.
 * Returns { isReady: boolean } — render loading state until isReady is true.
 *
 * This hook reads from AuthProvider context (which fetches onboarding_completed
 * from the orgs table), so it doesn't make additional API calls.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/providers/AuthProvider';

export function useOnboardingGuard(): { isReady: boolean } {
  const auth = useAuth();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!auth.isLoaded) return;

    // No auth user — let the existing auth guard handle login redirect
    if (!auth.authUser) {
      setIsReady(true);
      return;
    }

    // No app_user or no org — could be a brand new user, let through
    // (they'll be caught by the onboarding page itself)
    if (!auth.appUser?.org_id) {
      setIsReady(true);
      return;
    }

    // Check onboarding status
    const completed = auth.appUser.onboarding_completed;

    if (completed === false) {
      // Org exists but onboarding not done — redirect
      router.replace('/onboarding');
      return;
    }

    // onboarding_completed is true or undefined (existing orgs without the column)
    setIsReady(true);
  }, [auth.isLoaded, auth.authUser, auth.appUser, router]);

  return { isReady };
}
