import React from 'react';
import { AuthProvider } from './AuthProvider';
import { PermissionsProvider } from './PermissionsProvider';
import { LocationProvider } from '@/components/CodeComponents/LocationContext';
import { LocationSelectModal } from '@/components/CodeComponents/LocationSelectModal';

// Import Plasmic CSS for design tokens and base styles
import projectcss from '@/components/plasmic/levelset_v2/plasmic_levelset_v2.module.css';

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * AppProviders - Replaces GlobalContextsProvider from Plasmic
 * Provides auth, location, and permissions context to the application
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <div className={projectcss.plasmic_tokens}>
      <AuthProvider>
        <LocationProvider>
          <PermissionsProvider>
            {children}
            {/* Global Location Select Modal - shows when no location is selected */}
            <LocationSelectModal />
          </PermissionsProvider>
        </LocationProvider>
      </AuthProvider>
    </div>
  );
}

export default AppProviders;
