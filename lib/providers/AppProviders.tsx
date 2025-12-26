import React from 'react';
import { AuthProvider } from './AuthProvider';
import { PermissionsProvider } from './PermissionsProvider';
import { ImpersonationProvider } from './ImpersonationProvider';
import { LocationProvider } from '@/components/CodeComponents/LocationContext';
import { LocationSelectModal } from '@/components/CodeComponents/LocationSelectModal';
import { ImpersonationBanner } from '@/components/ImpersonationBanner/ImpersonationBanner';

// Import Plasmic CSS for design tokens and base styles
import projectcss from '@/components/plasmic/levelset_v2/plasmic_levelset_v2.module.css';

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * AppProviders - Replaces GlobalContextsProvider from Plasmic
 * Provides auth, location, permissions, and impersonation context to the application
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <div className={projectcss.plasmic_tokens}>
      <AuthProvider>
        <ImpersonationProvider>
          <LocationProvider>
            <PermissionsProvider>
              {/* Impersonation banner - shows when admin is testing as another user */}
              <ImpersonationBanner />
              {children}
              {/* Global Location Select Modal - shows when no location is selected */}
              <LocationSelectModal />
            </PermissionsProvider>
          </LocationProvider>
        </ImpersonationProvider>
      </AuthProvider>
    </div>
  );
}

export default AppProviders;
