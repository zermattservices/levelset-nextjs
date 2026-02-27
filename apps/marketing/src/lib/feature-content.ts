export interface FeatureContent {
  tagline: string;
  heroImage?: string;
  problem: string;
  solution: string;
  capabilities: { icon: string; title: string; description: string }[];
  screenshots: { src: string; alt: string; caption?: string }[];
}

const CONTENT: Record<string, FeatureContent> = {
  'positional-ratings': {
    tagline:
      'Stop guessing who can work iPOS, Drive-Thru, or Dining Room. See it in the data.',
    heroImage: '/screenshots/pe-dashboard.png',
    problem:
      'You ask three leaders "Who\'s your strongest iPOS?" and get three different answers. Ratings live in people\'s heads, not in a system. When a leader leaves, their knowledge of the team walks out the door. And the team members who only work mornings? Afternoon leaders barely know them.',
    solution:
      'Every leader rates every team member on every position they work — iPOS, Drive-Thru, Dining Room, Breaker, all of it. Ratings aggregate across leaders into color-coded zones (green, yellow, red) so the whole team shares one objective view. No more gut-feel debates about who\'s ready.',
    capabilities: [
      {
        icon: 'chart-bar',
        title: 'Rate by Position, Not by Person',
        description:
          'An employee might be green on iPOS but red on Drive-Thru. You\'ll see both — not just an overall "she\'s good" or "he needs work."',
      },
      {
        icon: 'palette',
        title: 'Color-Coded Performance Zones',
        description:
          'Green means meets expectations. Yellow means progressing. Red means focused coaching needed. Your leaders see the same picture at a glance.',
      },
      {
        icon: 'trending-up',
        title: 'Rolling Averages Across Leaders',
        description:
          'One leader\'s rating doesn\'t drive the picture. Averages roll across your whole leadership team over a configurable window — 14, 30, or 60 days.',
      },
      {
        icon: 'users',
        title: 'Built for Full Leadership Alignment',
        description:
          'When every leader submits ratings, you stop having the "well I think she\'s good" conversations. The data shows exactly where each person stands.',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/pe-dashboard.png',
        alt: 'Positional Excellence dashboard showing color-coded team ratings by position',
        caption:
          'Your entire team\'s position readiness — one screen, every position.',
      },
      {
        src: '/screenshots/pe-employee.png',
        alt: 'Individual employee rating breakdown across positions with trend data',
        caption:
          'Drill into any team member to see their performance by position over time.',
      },
    ],
  },

  discipline: {
    tagline:
      'Your accountability process — defined once, followed the same way by every leader.',
    heroImage: '/screenshots/discipline-log.png',
    problem:
      'One leader gives verbal warnings that never get written down. Another goes straight to a write-up. A third lets things slide because they don\'t want the conflict. When you finally need to make a tough call, you don\'t have a consistent record. And the team member says, "Nobody ever told me."',
    solution:
      'You define the rules — your infractions, your point values, your escalation steps. Every leader logs infractions the same way. The system tracks cumulative points and automatically recommends the next disciplinary action based on your thresholds. No guesswork, no inconsistency.',
    capabilities: [
      {
        icon: 'settings',
        title: 'Your Rubric, Your Rules',
        description:
          'Define your own infraction types and assign point values. "No Call / No Show" might be 4 points. "Uniform Violation" might be 1. You decide.',
      },
      {
        icon: 'zap',
        title: 'Automatic Escalation Recommendations',
        description:
          'When a team member hits 6 points, the system recommends a written warning. At 10, a final warning. You set the thresholds — the system enforces the process.',
      },
      {
        icon: 'file-text',
        title: 'Every Action Documented',
        description:
          'Every infraction, every conversation, every disciplinary action — logged with timestamps and the leader who recorded it. No more "I don\'t remember."',
      },
      {
        icon: 'refresh-cw',
        title: 'Rolling Point Windows',
        description:
          'Points don\'t last forever. Set a 90 or 180-day rolling window so old infractions expire — keeping accountability fair and current.',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/discipline-log.png',
        alt: 'Discipline log showing infractions with point totals and dates',
        caption:
          'See every team member\'s infraction history and cumulative point total.',
      },
      {
        src: '/screenshots/discipline-action.png',
        alt: 'System-recommended discipline action based on point thresholds',
        caption:
          'The system recommends the next step — leaders can follow, override, or dismiss.',
      },
    ],
  },

  roster: {
    tagline:
      'One place for every team member\'s details — pay, positions, history, all of it.',
    heroImage: '/screenshots/roster-list.png',
    problem:
      'Your employee info lives in HotSchedules, a spreadsheet, maybe a binder. Need someone\'s hire date? Check the spreadsheet. Pay rate? Check with the office. Position eligibility? Ask whatever leader is around. Nothing talks to each other.',
    solution:
      'Levelset gives every team member a single profile — their pay, their positions, their hire date, their availability, their rating history, their discipline record. One click, and you have the full picture. Sync from HotSchedules so you\'re never double-entering.',
    capabilities: [
      {
        icon: 'database',
        title: 'Complete Team Profiles',
        description:
          'Name, role, pay rate, hire date, availability, position eligibility, contact info — everything about a team member in one record.',
      },
      {
        icon: 'check-square',
        title: 'Position Eligibility by Zone',
        description:
          'See which positions each team member can work, separated by FOH and BOH. Know who\'s cross-trained and who isn\'t.',
      },
      {
        icon: 'dollar-sign',
        title: 'Configurable Pay Rates',
        description:
          'Set base pay by role, then layer adjustments for availability (full-time vs. part-time), performance zone, and certifications. Pay calculates automatically.',
      },
      {
        icon: 'refresh-cw',
        title: 'HotSchedules Sync',
        description:
          'Pull employees from HotSchedules automatically. New hires show up in Levelset. Terminations get flagged. No more manual spreadsheet updates.',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/roster-list.png',
        alt: 'Full team roster with search, filters, and key details visible',
        caption:
          'Your entire team — searchable, sortable, always up to date.',
      },
      {
        src: '/screenshots/roster-detail.png',
        alt: 'Employee detail page showing profile, pay, and position eligibility',
        caption:
          'Every detail about a team member, one click away.',
      },
    ],
  },

  evaluations: {
    tagline:
      'Performance reviews that actually reference performance — not just leader memory.',
    heroImage: '/screenshots/evaluations-form.png',
    problem:
      'Evaluation time comes around and leaders scramble to remember three months of performance. They fill out forms from memory, give vague feedback, and the team member leaves the meeting with no clear picture of where they actually stand.',
    solution:
      'Levelset evaluations pull in real positional rating data so leaders walk into the review with evidence. "Here\'s your iPOS average over the last 90 days. Here\'s your discipline record. Here\'s what the data says." Reviews become conversations, not guessing games.',
    capabilities: [
      {
        icon: 'link',
        title: 'Connected to Your Rating Data',
        description:
          'Evaluations automatically reference the team member\'s positional rating averages — so feedback is grounded in real performance, not memory.',
      },
      {
        icon: 'file-text',
        title: 'Structured Templates',
        description:
          'Use evaluation templates that match your organization\'s review process. Consistent structure means consistent conversations.',
      },
      {
        icon: 'clock',
        title: 'Full History for Every Team Member',
        description:
          'Every evaluation is saved and searchable. Track progress over time and see how a team member has grown — or where they\'ve plateaued.',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/evaluations-form.png',
        alt: 'Evaluation form with embedded rating data from positional ratings',
        caption:
          'Reviews backed by data — not three months of trying to remember.',
      },
    ],
  },

  scheduling: {
    tagline:
      'Build schedules knowing exactly who can work which positions — before the shift starts.',
    heroImage: '/screenshots/scheduling-week.png',
    problem:
      'Your schedule looks full, but you have three people scheduled for Drive-Thru and none of them are actually good at it. You don\'t find out until 11:30 when the lunch rush hits. The schedule shows butts in seats — not position readiness.',
    solution:
      'Levelset scheduling ties into your positional ratings. When you\'re building the schedule, you can see which positions are covered by people who are actually ready for them — and which positions have a gap before it becomes a problem.',
    capabilities: [
      {
        icon: 'calendar',
        title: 'Weekly Schedule Builder',
        description:
          'Build and manage weekly schedules with clear visibility into who\'s working, when, and in what role.',
      },
      {
        icon: 'eye',
        title: 'Position Coverage Visibility',
        description:
          'See which positions are covered and which ones have a gap — before the shift, not during it.',
      },
      {
        icon: 'clock',
        title: 'Break Rules Built In',
        description:
          'Configure break rules per location and let the system help you stay compliant with scheduling regulations.',
      },
      {
        icon: 'layout',
        title: 'Shift Period Templates',
        description:
          'Define position requirements for breakfast, lunch, dinner, and closing — so every shift starts with the right coverage.',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/scheduling-week.png',
        alt: 'Weekly schedule view with position coverage indicators',
        caption:
          'Your week at a glance — with position coverage you can actually trust.',
      },
    ],
  },

  setups: {
    tagline:
      'Every shift, set up the same way — regardless of who\'s leading.',
    heroImage: '/screenshots/setups-template.png',
    problem:
      'When your best leader opens, breakfast runs like a machine. When someone else opens, the positions are wrong, people are in the wrong spots, and you don\'t find out until guests are waiting. The knowledge of "who goes where" lives in one person\'s head.',
    solution:
      'Levelset setup templates define exactly which positions need to be filled for breakfast, lunch, dinner, and closing. The opening leader sees the template, assigns team members to positions, and everyone starts the shift in the right spot — every time.',
    capabilities: [
      {
        icon: 'copy',
        title: 'Templates for Every Shift Period',
        description:
          'Create templates for breakfast, lunch, dinner, and closing. Define which positions need to be filled and how many people each one needs.',
      },
      {
        icon: 'users',
        title: 'Assign Based on Eligibility',
        description:
          'See who\'s eligible for each position and assign team members accordingly. No more putting someone on Drive-Thru who isn\'t trained.',
      },
      {
        icon: 'check-circle',
        title: 'Consistent Every Day',
        description:
          'The template doesn\'t change based on who\'s leading. Your best practices are baked into the system, not stuck in someone\'s head.',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/setups-template.png',
        alt: 'Shift setup template showing position assignments for lunch',
        caption:
          'Define your setup once. Use it every day.',
      },
    ],
  },

  forms: {
    tagline:
      'Replace paper checklists and loose forms with something your team actually fills out.',
    problem:
      'You have paper checklists that get lost. Google Forms that nobody checks. Binder logs that sit in the back office. When you need to find out if the opening checklist was done last Tuesday, you\'re digging through a stack of paper — if it exists at all.',
    solution:
      'Build custom digital forms in Levelset that your team fills out on their phone. Every submission is timestamped, tied to the team member who submitted it, and instantly visible to leadership. No paper, no digging, no "I think I did it."',
    capabilities: [
      {
        icon: 'edit',
        title: 'Build Custom Forms',
        description:
          'Create the exact forms you need — opening checklists, closing checklists, safety logs, whatever your operation requires. No coding needed.',
      },
      {
        icon: 'smartphone',
        title: 'Submit from the Mobile App',
        description:
          'Team members fill out forms on their phone during their shift. No walking to the back office, no finding a clipboard.',
      },
      {
        icon: 'list',
        title: 'Track Every Submission',
        description:
          'See who submitted what, when they submitted it, and review their responses. Filter by date, team member, or form type.',
      },
      {
        icon: 'link',
        title: 'Connected to Your Team Data',
        description:
          'Forms can pull in Levelset data — like auto-populating the team member\'s name, role, or shift assignment — so your team fills out less and you get cleaner data.',
      },
    ],
    screenshots: [],
  },

  'levi-ai': {
    tagline:
      '"Who\'s my strongest iPOS on the morning shift?" — answered in 3 seconds.',
    problem:
      'You want to know who has the most discipline points this month. Or which team members are red on Drive-Thru. Or who\'s due for an evaluation. Right now that means opening a screen, setting filters, scrolling through data, and hoping you remember what you were looking for.',
    solution:
      'Levi is an AI assistant that knows your team and your business. Ask questions in plain English from your phone — "Which employee most consistently demonstrated 2MS this month?" or "How well are we enforcing our discipline policy?" — and get instant answers pulled from your actual data. Perform complex analysis in seconds and plan for the future with Levi.',
    capabilities: [
      {
        icon: 'message-circle',
        title: 'Ask in Plain English',
        description:
          'No menus, no filters. Just type what you want to know. "Who\'s my weakest Drive-Thru?" or "How many new hires started this month?"',
      },
      {
        icon: 'database',
        title: 'Answers From Your Real Data',
        description:
          'Levi doesn\'t generate generic advice. It queries your actual ratings, discipline records, and roster to give you specific, accurate answers about your team.',
      },
      {
        icon: 'smartphone',
        title: 'Built for the Floor',
        description:
          'Chat with Levi from the mobile app while you\'re walking the floor. Get answers without going to a computer.',
      },
      {
        icon: 'lock',
        title: 'Private to Your Organization',
        description:
          'Levi only sees your team\'s data. Your conversations are private. Nothing is shared across organizations.',
      },
    ],
    screenshots: [],
  },

  'mobile-app': {
    tagline:
      'Rate your team, search your roster, and check the schedule — all from your pocket.',
    problem:
      'Your leadership tools live on a desktop in the back office, but you spend your day on the floor. When you see a team member doing great work and want to rate them, or need to quickly look up someone\'s pay rate, you have to walk away, find a computer, log in, and navigate to the right screen.',
    solution:
      'The Levelset mobile app puts your team data in your pocket. Submit positional ratings between rushes. Look up any team member\'s profile in seconds. Check tomorrow\'s schedule while you\'re closing. Talk to Levi. It\'s your leadership toolkit, always with you.',
    capabilities: [
      {
        icon: 'star',
        title: 'Rate from the Floor',
        description:
          'See a team member crush it on Drive-Thru? Rate them right there from your phone. Don\'t wait until you get to a computer — by then you\'ll forget.',
      },
      {
        icon: 'search',
        title: 'Instant Team Lookup',
        description:
          'Pull up any team member\'s full profile, rating history, and discipline record in seconds. Faster than opening a spreadsheet.',
      },
      {
        icon: 'bell',
        title: 'Stay in the Loop',
        description:
          'Get notified about discipline escalations, evaluation reminders, and team updates so nothing falls through the cracks.',
      },
      {
        icon: 'sparkles',
        title: 'Levi AI Built In',
        description:
          'Ask Levi questions about your team right from the app. "Who\'s working tomorrow morning?" — answered in seconds.',
      },
    ],
    screenshots: [],
  },
};

export function getFeatureContent(slug: string): FeatureContent | undefined {
  return CONTENT[slug];
}
