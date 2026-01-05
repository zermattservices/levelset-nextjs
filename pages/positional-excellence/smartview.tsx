import * as React from 'react';
import { PositionalExcellenceDashboard } from '@/components/pages/PositionalExcellenceDashboard';
import { AppProviders } from '@/lib/providers/AppProviders';

function SmartViewPage() {
  return (
    <AppProviders>
      <PositionalExcellenceDashboard activeTab="smartview" />
    </AppProviders>
  );
}

export default SmartViewPage;
