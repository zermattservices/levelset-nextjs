import * as React from 'react';
import { PeaClassicPage } from '@/components/pages/PeaClassicPage';
import { AppProviders } from '@/lib/providers/AppProviders';

function PeaClassicPageWrapper() {
  return (
    <AppProviders>
      <PeaClassicPage />
    </AppProviders>
  );
}

export default PeaClassicPageWrapper;
