import React from 'react';
import { useRouter } from 'next/router';
import { AuthProvider, useAuth } from './AuthProvider';
import { PermissionsProvider } from './PermissionsProvider';
import { OrgFeaturesProvider } from './OrgFeaturesProvider';
import { ImpersonationProvider } from './ImpersonationProvider';
import { LocationProvider } from '@/components/CodeComponents/LocationContext';
import { LocationSelectModal } from '@/components/CodeComponents/LocationSelectModal';
import { ImpersonationBanner } from '@/components/ImpersonationBanner/ImpersonationBanner';

// Import Plasmic CSS for design tokens and base styles
import projectcss from '@/styles/base.module.css';

interface AppProvidersProps {
  children: React.ReactNode;
}

/** Pages that should NOT be redirected to onboarding */
const ONBOARDING_EXEMPT_PATHS = ['/onboarding', '/signup', '/auth/login', '/auth/callback', '/auth/bridge'];

/**
 * OnboardingGuard — sits inside AuthProvider, redirects to /onboarding
 * if the user's org has not completed onboarding.
 */
function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    if (!auth.isLoaded) return;

    // Skip guard on exempt pages (login, signup, onboarding itself, etc.)
    if (ONBOARDING_EXEMPT_PATHS.includes(router.pathname)) {
      setChecked(true);
      return;
    }

    // No auth user — let the existing auth/login guard handle it
    if (!auth.authUser) {
      setChecked(true);
      return;
    }

    // No app_user or no org — new user, let through (signup/onboarding page handles)
    if (!auth.appUser?.org_id) {
      setChecked(true);
      return;
    }

    // Onboarding not completed — redirect
    if (auth.appUser.onboarding_completed === false) {
      router.replace('/onboarding');
      return;
    }

    // Completed or undefined (existing orgs) — allow through
    setChecked(true);
  }, [auth.isLoaded, auth.authUser, auth.appUser, router]);

  if (!checked) return null;

  return <>{children}</>;
}

/**
 * AppProviders - Replaces GlobalContextsProvider from Plasmic
 * Provides auth, location, permissions, and impersonation context to the application
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <div className={projectcss.plasmic_tokens}>
      <AuthProvider>
        <OnboardingGuard>
          <ImpersonationProvider>
            <LocationProvider>
              <PermissionsProvider>
                <OrgFeaturesProvider>
                  {/* Impersonation banner - shows when admin is testing as another user */}
                  <ImpersonationBanner />
                  {children}
                  {/* Global Location Select Modal - shows when no location is selected */}
                  <LocationSelectModal />
                </OrgFeaturesProvider>
              </PermissionsProvider>
            </LocationProvider>
          </ImpersonationProvider>
        </OnboardingGuard>
      </AuthProvider>
    </div>
  );
}

export default AppProviders;
