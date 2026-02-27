import * as React from 'react';
import { ApprovalsPage } from '@/components/pages/ApprovalsPage';
import { AppProviders } from '@/lib/providers/AppProviders';

function ApprovalsPageWrapper() {
  return (
    <AppProviders>
      <ApprovalsPage />
    </AppProviders>
  );
}

export default ApprovalsPageWrapper;
