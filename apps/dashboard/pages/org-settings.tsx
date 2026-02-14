import * as React from 'react';
import { OrgSettingsPage } from '@/components/pages/OrgSettingsPage';
import { AppProviders } from '@/lib/providers/AppProviders';

function OrgSettingsPageWrapper() {
  return (
    <AppProviders>
      <OrgSettingsPage />
    </AppProviders>
  );
}

export default OrgSettingsPageWrapper;
