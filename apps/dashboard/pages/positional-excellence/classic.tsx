import * as React from 'react';
import { PositionalExcellenceDashboard } from '@/components/pages/PositionalExcellenceDashboard';
import { AppProviders } from '@/lib/providers/AppProviders';

function ClassicPage() {
  return (
    <AppProviders>
      <PositionalExcellenceDashboard activeTab="classic" />
    </AppProviders>
  );
}

export default ClassicPage;
