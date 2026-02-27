export interface IntegrationContent {
  tagline: string;
  description: string;
  capabilities: { title: string; description: string }[];
}

const CONTENT: Record<string, IntegrationContent> = {
  'google-maps': {
    tagline:
      'Your Google listing, ratings, hours, and every review — synced into Levelset automatically.',
    description:
      'Connect your location to Google Maps and Levelset pulls in everything: your business hours, star rating, review count, and every guest review. A weekly auto-sync keeps your data current without anyone lifting a finger. AI analysis extracts sentiment, topics, and even employee mentions from reviews so you can spot trends and respond faster.',
    capabilities: [
      {
        title: 'One-Click Connect',
        description:
          'Search for your location by name, select it from Google Places, and your listing data is synced in seconds. Business hours, coordinates, rating, and review count — all pulled automatically.',
      },
      {
        title: 'Every Review, Not Just Five',
        description:
          'Google only surfaces five reviews in their API. Levelset fetches your complete review history so you have the full picture — not a curated sample.',
      },
      {
        title: 'Weekly Auto-Sync',
        description:
          'New reviews are synced automatically every week. No manual refreshes, no checking back. Your review data stays current without any effort from your team.',
      },
      {
        title: 'AI-Powered Review Analysis',
        description:
          'Each review is analyzed for sentiment, key topics, and employee mentions. Spot patterns in guest feedback and connect it back to your team\'s performance data.',
      },
    ],
  },

  hotschedules: {
    tagline:
      'Your HotSchedules data — employees, schedules, forecasts, availability — imported in minutes.',
    description:
      'Levelset connects directly to your HotSchedules data to import everything you need: your employee roster with pay rates, weekly schedules with shift assignments, sales and transaction forecasts at 15-minute intervals, time-off requests, and employee availability windows. A guided sync wizard walks you through reviewing changes, mapping positions, and confirming before anything is saved.',
    capabilities: [
      {
        title: 'Full Roster Import',
        description:
          'Pull every active employee from HotSchedules with their name, email, phone, hire date, and pay rate. Smart matching merges with existing Levelset employees by ID, email, or name — no duplicates.',
      },
      {
        title: 'Schedule & Shift Sync',
        description:
          'Import weekly schedules with every shift, break, and position assignment. Map HotSchedules jobs to Levelset positions once, and future syncs remember your mappings.',
      },
      {
        title: 'Sales Forecasts at 15-Minute Intervals',
        description:
          'Import projected sales and transaction counts broken down to 15-minute intervals. See forecast data alongside your labor spread to optimize coverage during peak periods.',
      },
      {
        title: 'Availability & Time Off',
        description:
          'Employee availability windows and approved time-off requests come over automatically. Know who\'s available before you build the schedule — not after.',
      },
      {
        title: 'Guided Sync Wizard',
        description:
          'A 6-step review process lets you inspect every change before it\'s saved. See new hires, modified records, and terminations. Edit roles, FOH/BOH classifications, and position mappings before confirming.',
      },
      {
        title: 'Auto-Detect FOH & BOH',
        description:
          'Levelset reads your HotSchedules job names and automatically classifies employees as Front of House or Back of House — "iPOS" and "Drive-Thru" go to FOH, "Primary" and "Breading" go to BOH.',
      },
    ],
  },

  yelp: {
    tagline:
      'Your Yelp reviews sync automatically when you connect Google Maps — no extra setup.',
    description:
      'When you connect your location to Google Maps, Levelset automatically searches for your Yelp business listing by name and address. Once found, reviews are synced and displayed alongside your Google reviews for a unified view of guest feedback. The same AI analysis that powers your Google review insights works on Yelp reviews too.',
    capabilities: [
      {
        title: 'Automatic Discovery',
        description:
          'No separate setup required. Levelset finds your Yelp listing automatically during Google Maps connect by matching your business name and address with multi-step verification.',
      },
      {
        title: 'Unified Review Dashboard',
        description:
          'See Google and Yelp reviews side by side in your location settings. Compare ratings across platforms and get a complete picture of your guest feedback.',
      },
      {
        title: 'Credit-Optimized Sync',
        description:
          'Levelset only fetches new reviews — comparing your stored count against Yelp\'s current total and pulling just the delta. No wasted API calls, no redundant data.',
      },
      {
        title: 'AI Analysis Ready',
        description:
          'Yelp reviews support the same AI analysis as Google reviews: sentiment scoring, topic extraction, and employee mention detection. All your review intelligence in one place.',
      },
    ],
  },

  slack: {
    tagline:
      'Levelset notifications in the channels your leadership team already lives in.',
    description:
      'Connect your Slack workspace to Levelset and get real-time notifications where your leadership team already communicates. Rating submissions, discipline actions, evaluation completions, schedule publishes, and AI insights — delivered to the right channels with rich context and direct links back to Levelset.',
    capabilities: [
      {
        title: 'Rating & Discipline Alerts',
        description:
          'Get notified when ratings are submitted or discipline actions are logged. See the employee, the leader who submitted, and key details — with a direct link to view the full record in Levelset.',
      },
      {
        title: 'Schedule & Evaluation Updates',
        description:
          'Know when a schedule is published, when an evaluation is completed, and when milestones are reached — so leadership stays informed without checking the dashboard.',
      },
      {
        title: 'Configurable Per Channel',
        description:
          'Route different notification types to different Slack channels. Discipline alerts to #leadership, schedule updates to #team-updates, AI insights to #levelset. You control the routing.',
      },
      {
        title: 'Daily & Weekly Digests',
        description:
          'Opt into summary messages instead of real-time alerts. Get a morning digest of yesterday\'s rating averages or a weekly summary of discipline activity — without notification fatigue.',
      },
    ],
  },

  crystal: {
    tagline:
      'Understand how every team member communicates, what motivates them, and how to coach them.',
    description:
      'Crystal brings DISC personality intelligence into your daily leadership workflow. When you\'re about to give feedback to a team member rated low on Drive-Thru, Crystal tells you how they prefer to receive feedback — direct and data-driven, or empathetic and private. When you\'re building a shift, you can see the personality mix and balance it. When you ask Levi for coaching advice, the response is tailored to that specific person\'s communication style.',
    capabilities: [
      {
        title: 'DISC Profiles on Every Employee',
        description:
          'Each team member gets a DISC personality type on their profile — one of 16 subtypes that describes how they communicate, what motivates them, and how they handle stress. Visible to leadership for coaching, never to peers.',
      },
      {
        title: 'Personalized Coaching Tips',
        description:
          'When you\'re about to give feedback based on ratings or evaluations, see tailored coaching guidance. A D-type needs direct, bottom-line feedback. An S-type needs a private conversation with time to process. Crystal tells you the difference.',
      },
      {
        title: 'Shift Personality Balance',
        description:
          'See the personality composition of a shift before it runs. Four dominant personalities with no steady influences? That\'s a recipe for friction. Crystal helps you build balanced shifts where personalities complement each other.',
      },
      {
        title: 'Levi AI + Personality Intelligence',
        description:
          'Ask Levi "How should I talk to Marcus about his tardiness?" and get a coaching script tailored to Marcus\'s DISC type — not generic advice. Personality data makes your AI assistant dramatically more useful.',
      },
    ],
  },
};

export function getIntegrationContent(
  slug: string
): IntegrationContent | undefined {
  return CONTENT[slug];
}
