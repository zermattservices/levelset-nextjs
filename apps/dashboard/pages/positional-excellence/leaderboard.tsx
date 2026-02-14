import * as React from 'react';
import { PositionalExcellenceDashboard } from '@/components/pages/PositionalExcellenceDashboard';
import { AppProviders } from '@/lib/providers/AppProviders';

function LeaderboardPage() {
  return (
    <AppProviders>
      <PositionalExcellenceDashboard activeTab="leaderboard" />
    </AppProviders>
  );
}

export default LeaderboardPage;
