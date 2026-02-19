/**
 * Form Type Definitions
 * Shared types for mobile forms
 */

// =============================================================================
// Common Types
// =============================================================================

export interface Employee {
  id: string;
  name: string;
  role?: string;
}

export interface Leader {
  id: string;
  name: string;
  role?: string;
}

// =============================================================================
// Discipline Infraction Types
// =============================================================================

export interface Infraction {
  id: string;
  action: string;
  action_es?: string;
  points: number;
  require_tm_signature?: boolean;
  require_leader_signature?: boolean;
}

export interface InfractionFormData {
  employees: Employee[];
  leaders: Leader[];
  infractions: Infraction[];
  disciplinePassword?: string;
}

export interface InfractionSubmission {
  leaderId: string;
  employeeId: string;
  infractionId: string;
  date: string; // YYYY-MM-DD format
  acknowledged: boolean;
  notes?: string;
  teamMemberSignature?: string;
  leaderSignature: string;
}

// =============================================================================
// Positional Ratings Types
// =============================================================================

export type RatingValue = 1 | 2 | 3;

export interface Position {
  name: string;
  name_es?: string;
  zone: "FOH" | "BOH";
  description?: string;
  description_es?: string;
}

export interface PositionalFormData {
  employees: Employee[];
  leaders: Leader[];
  positions: Position[];
  rolePermissions: Record<string, string[]>;
  requireRatingComments: boolean;
}

export interface PositionLabels {
  labels: string[];
  labels_es?: string[];
  descriptions?: string[];
  descriptions_es?: string[];
}

export interface RatingsSubmission {
  leaderId: string;
  employeeId: string;
  position: string; // zone|name compound format
  ratings: RatingValue[];
  notes?: string;
}

// =============================================================================
// Form State Types
// =============================================================================

export type FormType = "ratings" | "infractions" | null;

export interface FormSubmissionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface LastSubmission {
  formType: "ratings" | "infractions";
  employeeName: string;
  timestamp: Date;
}

// =============================================================================
// Grouped Data for Autocomplete
// =============================================================================

export interface GroupedOption<T> {
  title: string;
  data: T[];
}

/**
 * Group employees/leaders by role for autocomplete display
 */
export function groupByRole<T extends { role?: string }>(
  items: T[]
): GroupedOption<T>[] {
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    const role = item.role || "Other";
    const existing = grouped.get(role) || [];
    existing.push(item);
    grouped.set(role, existing);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([title, data]) => ({ title, data }));
}

/**
 * Group infractions by points for autocomplete display
 */
export function groupInfractionsByPoints(
  infractions: Infraction[]
): GroupedOption<Infraction>[] {
  const grouped = new Map<string, Infraction[]>();

  for (const infraction of infractions) {
    const pointsLabel =
      infraction.points > 0
        ? `+${infraction.points} points`
        : infraction.points < 0
          ? `${infraction.points} points`
          : "0 points";

    const existing = grouped.get(pointsLabel) || [];
    existing.push(infraction);
    grouped.set(pointsLabel, existing);
  }

  // Sort by points value (negative first, then zero, then positive)
  const sortOrder = (label: string): number => {
    if (label.startsWith("-")) return -1;
    if (label === "0 points") return 0;
    return 1;
  };

  return Array.from(grouped.entries())
    .sort(([a], [b]) => sortOrder(a) - sortOrder(b))
    .map(([title, data]) => ({ title, data }));
}

/**
 * Group positions by zone (FOH/BOH)
 */
export function groupPositionsByZone(
  positions: Position[]
): GroupedOption<Position>[] {
  const foh: Position[] = [];
  const boh: Position[] = [];

  for (const position of positions) {
    if (position.zone === "FOH") {
      foh.push(position);
    } else {
      boh.push(position);
    }
  }

  const groups: GroupedOption<Position>[] = [];

  if (foh.length > 0) {
    groups.push({
      title: "Front of House",
      data: foh.sort((a, b) => a.name.localeCompare(b.name)),
    });
  }

  if (boh.length > 0) {
    groups.push({
      title: "Back of House",
      data: boh.sort((a, b) => a.name.localeCompare(b.name)),
    });
  }

  return groups;
}
