import * as React from 'react';
import { DocumentsPage } from '@/components/pages/DocumentsPage';
import { AppProviders } from '@/lib/providers/AppProviders';

function DocumentsPageWrapper() {
  return (
    <AppProviders>
      <DocumentsPage />
    </AppProviders>
  );
}

export default DocumentsPageWrapper;
