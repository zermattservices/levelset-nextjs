import * as React from 'react';
import { AdminLocationsPage } from '@/components/pages/AdminLocationsPage';
import { AppProviders } from '@/lib/providers/AppProviders';

function AdminOrganizationsPageWrapper() {
  return (
    <AppProviders>
      <AdminLocationsPage />
    </AppProviders>
  );
}

export default AdminOrganizationsPageWrapper;
