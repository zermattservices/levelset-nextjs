import * as React from 'react';
import { LoginPage } from '@/components/pages/LoginPage';
import { AppProviders } from '@/lib/providers/AppProviders';

function LoginPageWrapper() {
  return (
    <AppProviders>
      <LoginPage />
    </AppProviders>
  );
}

export default LoginPageWrapper;
