import * as React from 'react';
import { AdminPage } from '@/components/pages/AdminPage';
import { AppProviders } from '@/lib/providers/AppProviders';

function AdminPageWrapper() {
  return (
    <AppProviders>
      <AdminPage />
    </AppProviders>
  );
}

export default AdminPageWrapper;
