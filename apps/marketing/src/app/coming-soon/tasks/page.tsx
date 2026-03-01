import type { Metadata } from 'next';
import { ComingSoonTemplate } from '@/components/templates/ComingSoonTemplate';

export const metadata: Metadata = {
  title: 'Tasks — Coming Soon',
  description: 'AI-integrated task management connected to goals, meetings, and development plans.',
};

export default function TasksPage() {
  return (
    <ComingSoonTemplate
      feature={{
        name: 'Tasks',
        tagline: 'Task management that\'s connected to everything else — because tasks don\'t exist in a vacuum.',
        description:
          'Levelset Tasks connects your daily to-dos to the bigger picture. Tasks link to goals (completing tasks drives goal progress), development plans (plan steps become trackable tasks), and meetings (action items become tasks automatically). Combined with Levi AI, task management becomes intelligent — Levi can create tasks, remind leaders about overdue items, and help prioritize what matters most.',
        highlights: [
          'Create, assign, and track tasks across your team',
          'Tasks connect to goals — completing tasks drives measurable goal progress',
          'Development plan steps become trackable tasks with deadlines',
          'Meeting action items automatically become tasks (with Meetings integration)',
          'Levi AI integration — ask Levi to create tasks, check status, or follow up',
        ],
      }}
    />
  );
}
