import * as React from 'react';
import { EvaluationConductPage } from '@/components/pages/EvaluationConductPage';
import { AppProviders } from '@/lib/providers/AppProviders';

function EvaluationConductPageWrapper() {
  return (
    <AppProviders>
      <EvaluationConductPage />
    </AppProviders>
  );
}

export default EvaluationConductPageWrapper;
