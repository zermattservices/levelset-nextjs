import * as React from 'react';
import { SchedulePage } from '@/components/pages/SchedulePage';
import { AppProviders } from '@/lib/providers/AppProviders';

function SchedulePageWrapper() {
  return (
    <AppProviders>
      <SchedulePage />
    </AppProviders>
  );
}

export default SchedulePageWrapper;
