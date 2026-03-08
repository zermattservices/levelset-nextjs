import * as React from 'react';
import { SetupsPage } from '@/components/pages/SetupsPage';
import { AppProviders } from '@/lib/providers/AppProviders';

function SetupsPageWrapper() {
  return (
    <AppProviders>
      <SetupsPage />
    </AppProviders>
  );
}

export default SetupsPageWrapper;
