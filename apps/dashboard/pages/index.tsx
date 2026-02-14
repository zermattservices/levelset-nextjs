import * as React from 'react';
import { HomePage } from '@/components/pages/HomePage';
import { AppProviders } from '@/lib/providers/AppProviders';

function HomePageWrapper() {
  return (
    <AppProviders>
      <HomePage />
    </AppProviders>
  );
}

export default HomePageWrapper;
