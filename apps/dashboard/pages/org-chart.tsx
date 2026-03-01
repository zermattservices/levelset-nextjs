import * as React from 'react';
import { OrgChartPage } from '@/components/pages/OrgChartPage';
import { AppProviders } from '@/lib/providers/AppProviders';

function OrgChartPageWrapper() {
  return (
    <AppProviders>
      <OrgChartPage />
    </AppProviders>
  );
}

export default OrgChartPageWrapper;
