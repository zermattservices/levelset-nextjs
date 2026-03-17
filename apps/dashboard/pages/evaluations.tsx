import * as React from 'react';
import { EvaluationsPage } from '@/components/pages/EvaluationsPage';
import { AppProviders } from '@/lib/providers/AppProviders';

function EvaluationsPageWrapper() {
  return (
    <AppProviders>
      <EvaluationsPage />
    </AppProviders>
  );
}

export default EvaluationsPageWrapper;
