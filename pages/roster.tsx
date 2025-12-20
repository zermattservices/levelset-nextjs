import * as React from 'react';
import { RosterPage } from '@/components/pages/RosterPage';
import { AppProviders } from '@/lib/providers/AppProviders';

function RosterPageWrapper() {
  return (
    <AppProviders>
      <RosterPage />
    </AppProviders>
  );
}

export default RosterPageWrapper;
