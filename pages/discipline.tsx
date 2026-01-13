import * as React from 'react';
import { DisciplinePage } from '@/components/pages/DisciplinePage';
import { AppProviders } from '@/lib/providers/AppProviders';

function DisciplinePageWrapper() {
  return (
    <AppProviders>
      <DisciplinePage />
    </AppProviders>
  );
}

export default DisciplinePageWrapper;
