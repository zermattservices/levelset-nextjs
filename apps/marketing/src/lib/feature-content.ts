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
        alt: 'Positional Ratings dashboard showing color-coded team ratings by position',
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

  'oe-pillars': {
    tagline:
      'Your five pillars of operational excellence — measured, tracked, and visible to every leader.',
    problem:
      'CFA measures operational excellence across five pillars, but most operators track them loosely — if at all. There\'s no single place to see how your team is performing against each pillar, and no way to connect those pillars back to the individual position-level performance that drives them.',
    solution:
      'Levelset aggregates your positional rating data into the five OE pillars — Great Food, Quick & Accurate, Creating Moments, Caring Interactions, and Inviting Atmosphere — automatically. Each pillar score is calculated from the position criteria that map to it, so when your team improves on mapped positions, the pillar scores reflect it. Leaders see one dashboard that connects individual performance to operational outcomes.',
    capabilities: [
      {
        icon: 'bar-chart',
        title: 'Five Pillars, One Dashboard',
        description:
          'See your overall OE score and each individual pillar at a glance. Know exactly where your operation is strong and where it needs focus.',
      },
      {
        icon: 'link',
        title: 'Connected to Position Ratings',
        description:
          'Pillar scores aren\'t manually entered — they\'re calculated from your positional excellence data. Improve a position, and the pillar score updates automatically.',
      },
      {
        icon: 'trending-up',
        title: 'Track Progress Over Time',
        description:
          'See how each pillar has trended over weeks and months. Identify whether your coaching investments are moving the needle.',
      },
      {
        icon: 'users',
        title: 'Aligned to CFA\'s Framework',
        description:
          'The five pillars mirror Chick-fil-A\'s operational excellence framework — so your data speaks the same language as your business.',
      },
    ],
    screenshots: [],
  },

  'org-chart': {
    tagline:
      'Your team structure, visible to everyone — so new team members know who to go to and leaders know who they\'re responsible for.',
    problem:
      'New team members don\'t know the chain of command. A Team Lead asks "who\'s my Director?" The org structure lives in people\'s heads — or on a whiteboard that hasn\'t been updated in three months. When someone gets promoted or someone leaves, nobody updates the chart because there isn\'t one.',
    solution:
      'Levelset automatically generates your org chart from your roster data. Promote someone? The chart updates. Hire a new Team Lead? They appear in the right spot. Every team member can see the structure, and every leader knows exactly who falls under their responsibility.',
    capabilities: [
      {
        icon: 'git-branch',
        title: 'Auto-Generated from Your Roster',
        description:
          'No manual drawing or dragging boxes. The org chart builds itself from your employee roles and reporting relationships.',
      },
      {
        icon: 'refresh-cw',
        title: 'Always Up to Date',
        description:
          'Promotions, new hires, and terminations update the chart automatically. It\'s never stale.',
      },
      {
        icon: 'eye',
        title: 'Visible to the Whole Team',
        description:
          'Team members can see where they sit in the organization and who they report to — great for onboarding and orientation.',
      },
    ],
    screenshots: [],
  },

  'documents': {
    tagline:
      'Stop digging through shared drives and binders. Your team\'s important documents live here.',
    problem:
      'Your opening checklist is in a Google Doc. Your training materials are in a binder. Your policies are in an email from six months ago. When a new team member asks "where do I find the uniform policy?" nobody has the same answer. Information is scattered, outdated, and impossible to find when you need it.',
    solution:
      'Levelset Documents gives your organization a single, organized hub for every document your team needs. Upload policies, training guides, standard operating procedures, and reference materials. Organize by category, assign to roles, and know that every team member has access to the same up-to-date information.',
    capabilities: [
      {
        icon: 'folder',
        title: 'Organized by Category',
        description:
          'Group documents by topic — policies, training, SOPs, reference materials. No more hunting through a messy shared drive.',
      },
      {
        icon: 'upload',
        title: 'Upload Anything',
        description:
          'PDFs, images, Word docs, spreadsheets — upload whatever your team needs. Everything is stored and accessible from one place.',
      },
      {
        icon: 'users',
        title: 'Role-Based Visibility',
        description:
          'Control which documents are visible to which roles. Leadership docs stay with leadership. Team-wide policies are available to everyone.',
      },
      {
        icon: 'search',
        title: 'Always Findable',
        description:
          'Search across all your documents instantly. When someone asks "where\'s the food safety policy?" the answer is always the same: Levelset.',
      },
    ],
    screenshots: [],
  },

  'pay': {
    tagline:
      'Pay that makes sense — tied to performance, role, and availability. No more "why does she make more than me?"',
    problem:
      'Pay decisions happen in a back office with no clear logic. Team members don\'t understand why they make what they make. Leaders can\'t explain it either. When someone asks for a raise, there\'s no system to reference — it\'s a gut call. And the team talks, so inconsistencies breed resentment.',
    solution:
      'Levelset\'s pay system lets you define transparent rules: base pay by role, adjustments for availability (full-time vs. part-time), bumps for performance zone (green, yellow, red), and premiums for certifications. The system calculates suggested pay automatically. Team members see a clear connection between their performance and their paycheck.',
    capabilities: [
      {
        icon: 'settings',
        title: 'Configurable Pay Rules',
        description:
          'Define base rates by role, then layer adjustments for availability, performance zone, and certifications. You set the rules — the system applies them consistently.',
      },
      {
        icon: 'link',
        title: 'Connected to Performance',
        description:
          'When a team member moves from yellow to green, their suggested pay updates. Performance has a direct, visible impact on compensation.',
      },
      {
        icon: 'eye',
        title: 'Transparent to Leaders',
        description:
          'Leaders can see exactly how pay is calculated for any team member. No black boxes, no guessing.',
      },
      {
        icon: 'shield',
        title: 'Fair and Documented',
        description:
          'Every pay rate has a clear rationale. When a team member asks "why?" you have an answer backed by rules, not opinion.',
      },
    ],
    screenshots: [],
  },

  'goal-tracking': {
    tagline:
      'From individual growth goals to org-wide targets — set them, track them, and tie them to real performance.',
    problem:
      'Goals get set in a meeting and forgotten by the next week. There\'s no system to track progress, no connection to actual performance data, and no accountability. When evaluation time comes, nobody remembers what the goals were — let alone whether they were met.',
    solution:
      'Levelset Goal Tracking lets you set goals at every level: individual team members, teams, locations, and the whole organization. Goals connect to your performance data — so progress updates itself as ratings come in. Tie goals to evaluations so review conversations are grounded in what was actually accomplished.',
    capabilities: [
      {
        icon: 'target',
        title: 'Goals at Every Level',
        description:
          'Set goals for individual team members, teams, locations, or the entire organization. Everyone knows what they\'re working toward.',
      },
      {
        icon: 'link',
        title: 'Connected to Performance Data',
        description:
          'Goals can reference positional ratings, OE pillar scores, or custom metrics. Progress updates as real data comes in — no manual check-ins needed.',
      },
      {
        icon: 'calendar-text',
        title: 'Tied to Evaluations',
        description:
          'When it\'s evaluation time, the team member\'s goals and their progress are right there. Reviews become conversations about real outcomes.',
      },
      {
        icon: 'trending-up',
        title: 'Track Progress Over Time',
        description:
          'See how goals are trending — on track, at risk, or completed. Leaders can intervene early instead of discovering missed targets at year-end.',
      },
    ],
    screenshots: [],
  },

  'development-plans': {
    tagline:
      'Every team member gets a roadmap. Every leader knows the next step. Growth stops being a conversation and becomes a plan.',
    problem:
      'A team member asks "what do I need to do to become a Team Lead?" and the answer depends on which leader they ask. Development conversations happen verbally and never get documented. There\'s no follow-through because there\'s no system. Promising team members leave because they don\'t see a path forward.',
    solution:
      'Levelset Development Plans give every team member a documented, trackable path to growth. Define milestones, set checkpoints, and tie the plan to real performance data. From Team Member to Trainer, Trainer to Team Lead, Team Lead to Director — every step is visible, every checkpoint is tracked, and every leader is aligned on what "ready" looks like.',
    capabilities: [
      {
        icon: 'map',
        title: 'Custom Roadmaps per Employee',
        description:
          'Build personalized development plans with milestones and checkpoints. Each team member sees exactly what they need to do to advance.',
      },
      {
        icon: 'check-circle',
        title: 'Milestone Checkpoints',
        description:
          'Define what "ready" looks like at each stage. Leaders mark checkpoints as complete, and progress is visible to the team member.',
      },
      {
        icon: 'link',
        title: 'Connected to Ratings and Evaluations',
        description:
          'Development plans reference real performance data. When a team member hits green on all Drive-Thru criteria, it shows in their plan — automatically.',
      },
      {
        icon: 'git-branch',
        title: 'Role-to-Role Advancement',
        description:
          'Define advancement paths: Team Member → Trainer → Team Lead → Director. Each transition has clear requirements so promotions are earned, not guessed.',
      },
    ],
    screenshots: [],
  },
};

export function getFeatureContent(slug: string): FeatureContent | undefined {
  return CONTENT[slug];
}
