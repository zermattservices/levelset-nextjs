import * as React from 'react';
import { FeatureRequestsPage } from '@/components/AdminMode/FeatureRequestsPage';
import { AppProviders } from '@/lib/providers/AppProviders';

function AdminFeatureRequestsPageWrapper() {
  return (
    <AppProviders>
      <FeatureRequestsPage />
    </AppProviders>
  );
}

export default AdminFeatureRequestsPageWrapper;
