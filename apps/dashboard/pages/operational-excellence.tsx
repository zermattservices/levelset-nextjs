import * as React from 'react';
import { OperationalExcellencePage } from '@/components/pages/OperationalExcellencePage';
import { AppProviders } from '@/lib/providers/AppProviders';

function OperationalExcellencePageWrapper() {
  return (
    <AppProviders>
      <OperationalExcellencePage />
    </AppProviders>
  );
}

export default OperationalExcellencePageWrapper;
