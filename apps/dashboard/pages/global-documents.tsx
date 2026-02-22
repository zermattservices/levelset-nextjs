import * as React from 'react';
import { GlobalDocumentsPage } from '@/components/pages/GlobalDocumentsPage';
import { AppProviders } from '@/lib/providers/AppProviders';

function GlobalDocumentsPageWrapper() {
  return (
    <AppProviders>
      <GlobalDocumentsPage />
    </AppProviders>
  );
}

export default GlobalDocumentsPageWrapper;
