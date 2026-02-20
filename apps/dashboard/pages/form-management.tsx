import * as React from 'react';
import { FormManagementPage } from '@/components/pages/FormManagementPage';
import { AppProviders } from '@/lib/providers/AppProviders';

function FormManagementPageWrapper() {
  return (
    <AppProviders>
      <FormManagementPage />
    </AppProviders>
  );
}

export default FormManagementPageWrapper;
