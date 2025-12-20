import React from 'react';
import { AuthProvider } from './AuthProvider';
import { LocationProvider } from '@/components/CodeComponents/LocationContext';

// Import Plasmic CSS for design tokens and base styles
import projectcss from '@/components/plasmic/levelset_v2/plasmic_levelset_v2.module.css';

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * AppProviders - Replaces GlobalContextsProvider from Plasmic
 * Provides auth and location context to the application
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <div className={projectcss.plasmic_tokens}>
      <AuthProvider>
        <LocationProvider>
          {children}
        </LocationProvider>
      </AuthProvider>
    </div>
  );
}

export default AppProviders;
