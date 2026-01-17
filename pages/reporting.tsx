import * as React from 'react';
import { ReportingPage } from '@/components/pages/ReportingPage';
import { AppProviders } from '@/lib/providers/AppProviders';

function ReportingPageWrapper() {
  return (
    <AppProviders>
      <ReportingPage />
    </AppProviders>
  );
}

export default ReportingPageWrapper;

