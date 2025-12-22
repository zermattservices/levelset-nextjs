import * as React from 'react';
import { AdminLocationsPage } from '@/components/pages/AdminLocationsPage';
import { AppProviders } from '@/lib/providers/AppProviders';

function AdminLocationsPageWrapper() {
  return (
    <AppProviders>
      <AdminLocationsPage />
    </AppProviders>
  );
}

export default AdminLocationsPageWrapper;
