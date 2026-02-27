import * as React from 'react';
import { SignupPage } from '@/components/pages/SignupPage';
import { AppProviders } from '@/lib/providers/AppProviders';

export default function SignupPageWrapper() {
  return (
    <AppProviders>
      <SignupPage />
    </AppProviders>
  );
}
