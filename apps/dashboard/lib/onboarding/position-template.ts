/**
 * Default position template for new organizations during onboarding.
 *
 * Based on Buda FSU (org_id: 54b9864f-...) positions, excluding:
 *   - Trainer FOH / Trainer BOH
 *   - 3H Week FOH / 3H Week BOH
 *   - Scheduling-only positions (FOH General, BOH General)
 *
 * Each position includes 5 rating criteria with descriptions.
 * Criteria are only populated for positions whose names remain unmodified
 * from this template during onboarding.
 */

export interface TemplateCriteria {
  name: string;
  description: string;
  criteria_order: number;
}

export interface TemplatePosition {
  name: string;
  zone: 'FOH' | 'BOH';
  description: string;
  display_order: number;
  criteria: TemplateCriteria[];
}

// ---------------------------------------------------------------------------
// BOH Positions (7)
// ---------------------------------------------------------------------------

const BOH_POSITIONS: TemplatePosition[] = [
  {
    name: 'Primary',
    zone: 'BOH',
    description:
      'The Primary Team owns the sandwich production side of the centerline. Together, they build every sandwich with speed, precision, and excellence. Primary 1 assembles and labels sandwiches. Primary 2 prepares buns and pickles. Primary 3 supports the line by building deluxe setups, managing produce & cheeses, and ensuring food is fresh, safe, and ready. During peak, all three move as one \u2014 fast, fluid, and focused on getting quality sandwiches out the chute.',
    display_order: 1,
    criteria: [
      { name: 'Assemble with Accuracy', description: 'Assemble and label every sandwich with precision\u2014fillets facing down, folds tight, accurate labels, and placed in the correct chute.', criteria_order: 1 },
      { name: 'Stock & Support the Line', description: 'Use the Lean Entr\u00e9e iPad and KPS when stocking chutes to prevent overstocking or understocking and ensure all necessary prep items are available.', criteria_order: 2 },
      { name: 'Check Quality & Temp Everything', description: "Don't just assemble and go\u2014verify standards every time. Be the gatekeeper of quality.", criteria_order: 3 },
      { name: 'Flow & Rotate', description: 'Keep strong communication and adherence to systems to eliminate any breaks in the flow.', criteria_order: 4 },
      { name: 'Protect the Zone', description: 'Follow the Food Safety 5\u2014no shortcuts, no mess. Keep everything clean, labeled, covered, and fully compliant.', criteria_order: 5 },
    ],
  },
  {
    name: 'Secondary',
    zone: 'BOH',
    description:
      'The Secondary Team is responsible for assembling all build-to-order fried and grilled nuggets & strips, managing oven-based products (Mac, Cookies, & Bacon), assembling soups, and completing all special salads. They also provide real-time support to the bagging team by passing Kanbans and executing on-the-spot needs. This zone ensures everything sent forward is safe, accurate, freshly prepared, and ready for the guest\u2014every single time.',
    display_order: 2,
    criteria: [
      { name: 'Assemble with Accuracy', description: 'Assemble and label every sandwich with precision\u2014fillets facing down, folds tight, accurate labels, and placed in the correct chute.', criteria_order: 1 },
      { name: 'Stock & Support the Line', description: 'Use the Lean Entr\u00e9e iPad and KPS when stocking chutes to prevent overstocking or understocking and ensure all necessary prep items are available.', criteria_order: 2 },
      { name: 'Check Quality & Temp Everything', description: "Don't just assemble and go\u2014verify standards every time. Be the gatekeeper of quality.", criteria_order: 3 },
      { name: 'Flow & Rotate', description: 'Keep strong communication and adherence to systems to eliminate any breaks in the flow.', criteria_order: 4 },
      { name: 'Protect the Zone', description: 'Follow the Food Safety 5\u2014no shortcuts, no mess. Keep everything clean, labeled, covered, and fully compliant.', criteria_order: 5 },
    ],
  },
  {
    name: 'Machines',
    zone: 'BOH',
    description:
      'The Machines role is responsible for safely and accurately cooking all fried chicken products. This team member ensures proper timing, oil management, and communication to maintain food quality, prevent product holds, and protect the guest experience.',
    display_order: 3,
    criteria: [
      { name: 'Drop with Discipline', description: 'Use the correct tiered drop method. Lower, lift, lower again\u2014every time. Stir the nuggets and drain for 10 seconds.', criteria_order: 1 },
      { name: 'Set & Secure', description: 'Set timers for each batch, lock lids, and complete filter lockouts with urgency and accuracy.', criteria_order: 2 },
      { name: 'Watch & Rotate', description: 'Monitor hold times, discard expired fries, and rotate pans to maintain <5 min quality standard.', criteria_order: 3 },
      { name: 'Call the Drops', description: "You're the shot caller\u2014communicate drop order, batch size, and any adjustments clearly to the Breaders and Boards team.", criteria_order: 4 },
      { name: 'Protect the Zone', description: 'Follow the Food Safety 5\u2014no shortcuts, no mess. Keep everything clean, labeled, covered, and fully compliant.', criteria_order: 5 },
    ],
  },
  {
    name: 'Breader',
    zone: 'BOH',
    description:
      'The Breading Team is responsible for cooking all fried and grilled chicken products with precision, consistency, and a deep commitment to food safety. This zone drives product readiness across the kitchen by following Lean iPad cues and Kanban systems. From the breading table to the grill, the team must ensure every item is properly coated, safely cooked, and set to standard before it reaches the guest.',
    display_order: 4,
    criteria: [
      { name: 'Drop with Purpose', description: "Follow the Lean iPad and Kanban visual cues to drop exactly what's needed\u2014no more, no less.", criteria_order: 1 },
      { name: 'Bread with Precision', description: 'Grip by the tips, milk wash thoroughly, drip with care, and press with full-body weight to maximize filet size.', criteria_order: 2 },
      { name: 'Load with Discipline', description: 'Line baskets and grill precisely\u2014tips in, spaced evenly, no overlap, no contact.', criteria_order: 3 },
      { name: 'Clean as You Go', description: 'Sift the coater, wipe down constantly, maintain a spotless breading zone, and re-work & sift coater to minimize waste.', criteria_order: 4 },
      { name: 'Protect the Zone', description: 'Follow the Food Safety 5\u2014no shortcuts, no mess. Keep everything clean, labeled, covered, and fully compliant.', criteria_order: 5 },
    ],
  },
  {
    name: 'Prep',
    zone: 'BOH',
    description:
      'The Prep Team Member ensures all cold items\u2014salads, wraps, fruit cups, yogurts, and kale\u2014are prepped with precision, labeled correctly, and stored safely. This role supports the heart of kitchen flow and product readiness. Whether prepping to stock Kanbans or building to order during peak times, the Prep Team keeps our cold line running with excellence, speed, and food safety. Above all, they remain ready to pivot\u2014to serve the guest in front of us first.',
    display_order: 5,
    criteria: [
      { name: 'Assemble with Accuracy', description: 'Build with accuracy every time\u2014no underfills, no overfills. Every cup and salad should be exact and consistent.', criteria_order: 1 },
      { name: 'Stock & Support the Line', description: 'Use Kanbans, date labels, and First In, First Out (FIFO)\u2014always use the oldest product first. Keep product flowing to prep for now and the next wave.', criteria_order: 2 },
      { name: 'Check Quality & Temp Everything', description: "Don't just assemble and go\u2014verify standards every time. Be the gatekeeper of quality and consistency.", criteria_order: 3 },
      { name: 'Flow & Rotate', description: 'Know when to pause prep and shift to real-time support\u2014serving the guest NOW always comes first.', criteria_order: 4 },
      { name: 'Protect the Zone', description: 'Follow the Food Safety 5\u2014no shortcuts, no mess. Keep everything clean, labeled, covered, and fully compliant.', criteria_order: 5 },
    ],
  },
  {
    name: 'Fries',
    zone: 'BOH',
    description:
      'The Fries Team Member is responsible for cooking, salting, and staging waffle fries with consistency, urgency, and care. This role ensures fry quality during every part of the day\u2014crispy, hot, and salted just right\u2014while maintaining oil cleanliness, hold time compliance, and communication with Baggers and Kitchen Leads. Great fries elevate every meal\u2014this role protects that standard.',
    display_order: 6,
    criteria: [
      { name: 'Drop with Timing', description: 'Drop fries proactively or on request using business cues, chute flow, and bagger communication.', criteria_order: 1 },
      { name: 'Fry & Finish Right', description: 'Cook to golden crispness, shake thoroughly, salt evenly, and never serve soggy fries.', criteria_order: 2 },
      { name: 'Stage for Quality & Speed', description: 'Stage fries correctly in chutes following screen, ensuring freshness.', criteria_order: 3 },
      { name: 'Watch & Rotate', description: 'Monitor hold times, discard expired fries, and rotate pans to maintain <5 min quality standard.', criteria_order: 4 },
      { name: 'Protect the Zone', description: 'Follow the Food Safety 5\u2014no shortcuts, no mess. Keep everything clean, labeled, covered, and fully compliant.', criteria_order: 5 },
    ],
  },
  {
    name: 'Team Lead BOH',
    zone: 'BOH',
    description:
      'BOH Team Leads are responsible for leading their zone with excellence, engaging the team, championing the guest experience, and holding standards.',
    display_order: 7,
    criteria: [
      { name: 'Lead the Zone', description: 'Take ownership of your area and ensure smooth operations.', criteria_order: 1 },
      { name: 'Engage the team', description: 'Motivate and support team members to perform their best.', criteria_order: 2 },
      { name: 'Champion the Guest Experience', description: 'Ensure every guest receives exceptional service.', criteria_order: 3 },
      { name: 'Hold the Standards', description: 'Maintain quality and consistency in all operations.', criteria_order: 4 },
      { name: 'Lead Yourself First', description: 'Model the behavior you expect from others.', criteria_order: 5 },
    ],
  },
];

// ---------------------------------------------------------------------------
// FOH Positions (8)
// ---------------------------------------------------------------------------

const FOH_POSITIONS: TemplatePosition[] = [
  {
    name: 'Drinks 1/3',
    zone: 'FOH',
    description:
      'Drinks 1/3 is responsible for preparing guest beverages with speed, accuracy, and cleanliness. This team member ensures proper recipes are followed, all drinks are labeled, and beverage orders are staged and communicated effectively.',
    display_order: 8,
    criteria: [
      { name: 'Scoop & Serve', description: "Follow recipes with hustle & precision for accuracy, 'ice it right'.", criteria_order: 1 },
      { name: 'Clean & Crisp', description: 'No drips, no puddles, no mess\u2014every cup should shine.', criteria_order: 2 },
      { name: 'Lid & Label', description: 'Punch lid, label on lid, place it with purpose on the drinks staging zone.', criteria_order: 3 },
      { name: 'Slide & Organize', description: 'Keep drinks in order, use carriers as needed, slide beverages down to keep drink order paired correctly.', criteria_order: 4 },
      { name: 'Communicate & Team Up', description: 'Communicate needs, call for boost, leverage drinks 2 to clear wave.', criteria_order: 5 },
    ],
  },
  {
    name: 'Drinks 2',
    zone: 'FOH',
    description:
      'Drinks 2 serves as the support engine behind all beverage execution. This role ensures Drinks 1/3 are fully stocked, teas and lemonades are prepped, desserts are made with care, and the beverage zone stays clean, safe, and ready for peak times. Drinks 2 also supports as a BOOST to keep the RULE of 4.',
    display_order: 9,
    criteria: [
      { name: 'Supply & Boost', description: 'Keep cups, lids, ice, teas full for all drink zones, boost drinks 1/3 as needed, restock to meet demand.', criteria_order: 1 },
      { name: 'Prep & Pour', description: 'Stay ahead with lemonades, waters, & special drinks.', criteria_order: 2 },
      { name: 'Dessert & Deliver', description: 'KPS bump to label dessert, prepare all desserts, communicate with drinks 1 and 3 before making drinks.', criteria_order: 3 },
      { name: 'Clean & Clear', description: 'Wipe, dry, squeegee floors, cockpit shines because of you.', criteria_order: 4 },
      { name: 'Prioritize & Respond', description: 'Assess your zone and proactively make decisions, shift fast when a wave comes, hurricane drinks as needed.', criteria_order: 5 },
    ],
  },
  {
    name: 'iPOS',
    zone: 'FOH',
    description:
      "Outside Order Takers represent the guest's first impression in the drive-thru. This role is responsible for warm greetings, capturing accurate orders, closing line gaps, and keeping communication clear and consistent\u2014all while creating a fast, friendly, and personal experience.",
    display_order: 10,
    criteria: [
      { name: 'Smile & Shine', description: "Wave high, greet warmly, and set the tone with joy. Use the Core 4 for every guest interaction\u2014it's their first impression of us.", criteria_order: 1 },
      { name: 'Catch Every Detail', description: 'Get names, cars, plates, and lanes right\u2014every time.', criteria_order: 2 },
      { name: 'Lead, Offer, Repeat', description: 'Lead the guest in the ordering (actively using the guest name), offer to scan the app, offer seasonal items & ask to make EVERY order large, & repeat it back line by line.', criteria_order: 3 },
      { name: 'Close Gaps & Call It Out', description: 'Keep the line tight, speak loud & clear, help the team flow.', criteria_order: 4 },
      { name: 'Friendly Farewell', description: "Ask if there's anything else you can do to serve our guests (PPG) and send them off with a warm 'See you again soon.' This is the most impressionable role in the entire guest experience\u2014make it count!", criteria_order: 5 },
    ],
  },
  {
    name: 'Host',
    zone: 'FOH',
    description:
      'The Host is the face of hospitality inside the restaurant. This role welcomes guests, provides clear direction, takes orders tableside, keeps the dining room, restrooms, & playscape spotless, and creates moments of care through second-mile service.',
    display_order: 11,
    criteria: [
      { name: 'Smile & Shine', description: "Wave high, greet warmly, and set the tone with joy. Use the Core 4 for every guest interaction\u2014it's their first impression of us.", criteria_order: 1 },
      { name: 'Greet & Seat', description: 'Give clear direction about tableside, offer a menu, seat guests with care, guide them to a table as needed.', criteria_order: 2 },
      { name: 'Lead, Offer, Repeat', description: 'Lead the guest in the ordering (actively using the guest name), offer to scan the app, offer seasonal items & ask to make EVERY order large, & repeat it back line by line.', criteria_order: 3 },
      { name: 'Welcoming Environment & PPG', description: 'Clean as a secondary priority to serving guests, upkeep guest-ready: tables, floors, trash, glass, restrooms, playscape, & RESTOCK.', criteria_order: 4 },
      { name: 'Friendly Farewell', description: "Ask if there's anything else you can do to serve our guests (PPG) and send them off with a warm 'See you again soon.' This is the most impressionable role in the entire guest experience\u2014make it count!", criteria_order: 5 },
    ],
  },
  {
    name: 'OMD',
    zone: 'FOH',
    description:
      'The OMD team member delivers meals with accuracy, warmth, and urgency. This role ensures orders are verified and matched to the correct guest, communicates clearly during delays, maintains traffic flow, and brings hospitality to life at the final point of the guest experience.',
    display_order: 12,
    criteria: [
      { name: 'Smile & Shine', description: "Wave high, greet warmly, and set the tone with joy. Use the Core 4 for every guest interaction\u2014it's their first impression of us.", criteria_order: 1 },
      { name: 'Grab & Go', description: 'Hustle out ready-to-go orders and deliver with urgency. Prioritize Carry-out and Mobile first, then Dine-In, followed by Third-Party. Stay efficient.', criteria_order: 2 },
      { name: 'Match & Hand-Off', description: "Match food and drinks, confirm names, and repeat part of the order to ensure accuracy. Own the moment\u2014this is more than a handoff, it's a chance to connect. PPG.", criteria_order: 3 },
      { name: 'Close Gaps & Call It Out', description: 'Keep the line tight, speak loud & clear, help the team flow.', criteria_order: 4 },
      { name: 'Friendly Farewell', description: "Ask if there's anything else you can do to serve our guests (PPG) and send them off with a warm 'See you again soon.' This is the most impressionable role in the entire guest experience\u2014make it count!", criteria_order: 5 },
    ],
  },
  {
    name: 'Bagging',
    zone: 'FOH',
    description:
      'Baggers are the final quality control checkpoint before guests receive their food. This role is responsible for assembling accurate orders, maintaining a fast-paced flow, upholding pristine presentation standards, and communicating clearly with both BOH and OMD.',
    display_order: 13,
    criteria: [
      { name: 'Bump & Bag', description: 'Only bump ready to bag orders while prioritizing mobile thru, then bag it with hustle & precision for accuracy.', criteria_order: 1 },
      { name: 'Pull & Organize', description: 'Pull entrees from the chute, slide specials to Dine-In side, place specials in organized rows.', criteria_order: 2 },
      { name: 'Flow & Go', description: 'Stay in motion, no frozen bodies, no wasted time, keep movement in the assembly line, step back if not in motion.', criteria_order: 3 },
      { name: 'Print & Stage', description: 'Print receipts from master KPS, stage food with paired drink in the landing zone, & Call GOOD order to notify OMD.', criteria_order: 4 },
      { name: 'Echo Holds', description: 'Echo holds from BOH to OMD, call to park big & special orders.', criteria_order: 5 },
    ],
  },
  {
    name: 'Runner',
    zone: 'FOH',
    description:
      'The Runner bridges the gap between operational execution and guest experience. Positioned inside the restaurant, the Runner is responsible for delivering Dine-In meals with hospitality, calling and handing off Carry-Out orders with care, and sealing and verifying all 3rd-party orders. This role ensures order accuracy, warm guest engagement, and seamless handoffs\u2014protecting the final moment before the guest receives their meal.',
    display_order: 14,
    criteria: [
      { name: 'Smile & Shine', description: "Wave high, greet warmly, and set the tone with joy. Use the Core 4 for every guest interaction\u2014it's their first impression of us.", criteria_order: 1 },
      { name: 'Grab & Go', description: 'Hustle out ready-to-go orders and deliver with urgency. Prioritize Carry-out and Mobile first, then Dine-In, followed by Third-Party. Stay efficient.', criteria_order: 2 },
      { name: 'Match & Hand-Off', description: "Match food and drinks, confirm names, and repeat part of the order to ensure accuracy. Own the moment\u2014this is more than a handoff, it's a chance to connect. PPG.", criteria_order: 3 },
      { name: 'Add Value Always', description: "Ask, 'Where can I add the most value right now?' Step in to support Host, Bagging, and Drinks. Stay engaged and guest-focused, especially between waves.", criteria_order: 4 },
      { name: 'Friendly Farewell', description: "Ask if there's anything else you can do to serve our guests (PPG) and send them off with a warm 'See you again soon.' This is the most impressionable role in the entire guest experience\u2014make it count!", criteria_order: 5 },
    ],
  },
  {
    name: 'Team Lead FOH',
    zone: 'FOH',
    description:
      'FOH Team Leads are responsible for leading their zone with excellence, engaging the team, championing the guest experience, and holding standards.',
    display_order: 15,
    criteria: [
      { name: 'Lead the Zone', description: 'Take ownership of your area and ensure smooth operations.', criteria_order: 1 },
      { name: 'Engage the team', description: 'Motivate and support team members to perform their best.', criteria_order: 2 },
      { name: 'Champion the Guest Experience', description: 'Ensure every guest receives exceptional service.', criteria_order: 3 },
      { name: 'Hold the Standards', description: 'Maintain quality and consistency in all operations.', criteria_order: 4 },
      { name: 'Lead Yourself First', description: 'Model the behavior you expect from others.', criteria_order: 5 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** All template positions (BOH first, then FOH) */
export const POSITION_TEMPLATE: TemplatePosition[] = [...BOH_POSITIONS, ...FOH_POSITIONS];

/** Template position names for quick lookup (to check if a position was modified) */
export const TEMPLATE_POSITION_NAMES = new Set(POSITION_TEMPLATE.map((p) => p.name));

/** Get template positions filtered by zone */
export function getTemplatePositionsByZone(zone: 'FOH' | 'BOH'): TemplatePosition[] {
  return POSITION_TEMPLATE.filter((p) => p.zone === zone);
}

/** Check if a position name matches the template (case-insensitive) */
export function isTemplatePosition(name: string): boolean {
  return TEMPLATE_POSITION_NAMES.has(name);
}

/** Get criteria for a template position by name. Returns empty array if not found. */
export function getTemplateCriteria(positionName: string): TemplateCriteria[] {
  const position = POSITION_TEMPLATE.find((p) => p.name === positionName);
  return position?.criteria ?? [];
}
