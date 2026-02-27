import * as React from 'react';
import { OnboardingPage } from '@/components/pages/OnboardingPage';
import { AppProviders } from '@/lib/providers/AppProviders';

export default function OnboardingPageWrapper() {
  return (
    <AppProviders>
      <OnboardingPage />
    </AppProviders>
  );
}
