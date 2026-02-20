import * as React from 'react';
import { FormDetailPage } from '@/components/pages/FormDetailPage';
import { AppProviders } from '@/lib/providers/AppProviders';

function FormDetailPageWrapper() {
  return (
    <AppProviders>
      <FormDetailPage />
    </AppProviders>
  );
}

export default FormDetailPageWrapper;
