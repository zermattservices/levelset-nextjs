import * as React from 'react';
import { PositionalExcellencePage } from '@/components/pages/PositionalExcellencePage';
import { AppProviders } from '@/lib/providers/AppProviders';

function PositionalExcellencePageWrapper() {
  return (
    <AppProviders>
      <PositionalExcellencePage />
    </AppProviders>
  );
}

export default PositionalExcellencePageWrapper;
