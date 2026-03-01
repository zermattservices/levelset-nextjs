import type { Metadata } from 'next';
import { TheApproachPage } from './TheApproachPage';

export const metadata: Metadata = {
  title: 'The Approach 2026',
  description: 'Levelset at The Approach — the team performance platform built for Chick-fil-A.',
  robots: { index: false, follow: false }, // Don't index this event page
};

export default function Page() {
  return <TheApproachPage />;
}
