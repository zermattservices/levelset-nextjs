import * as React from 'react';
import { LeviPage } from '@/components/pages/LeviPage';
import { AppProviders } from '@/lib/providers/AppProviders';

function LeviPageWrapper() {
  return (
    <AppProviders>
      <LeviPage />
    </AppProviders>
  );
}

export default LeviPageWrapper;
