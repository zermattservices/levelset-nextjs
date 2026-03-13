/**
 * Form Mapping Utilities
 *
 * Converts mobile form data (semantic keys) into form management
 * response_data (field IDs) using a template's settings.field_mappings.
 */

export interface FieldMappings {
  leader_id?: string;
  employee_id?: string;
  position?: string;
  ratings?: string[];  // Array of 5 field IDs for rating_1..rating_5
  notes?: string;
  infraction_id?: string;
  infraction_date?: string;
  acknowledged?: string;
  team_member_signature?: string;
  leader_signature?: string;
}

export interface SystemTemplate {
  id: string;
  name: string;
  name_es: string | null;
  slug: string;
  form_type: string;
  schema: Record<string, any>;
  ui_schema: Record<string, any>;
  settings: {
    field_mappings: FieldMappings;
  };
  is_system: boolean;
}

/**
 * Build response_data for a rating form submission.
 * Maps semantic rating form values to field IDs from field_mappings.
 */
export function buildRatingResponseData(
  mappings: FieldMappings,
  data: {
    leaderId: string;
    employeeId: string;
    position: string;
    ratings: number[];
    notes: string | null;
  }
): Record<string, any> {
  const responseData: Record<string, any> = {};

  if (mappings.leader_id) {
    responseData[mappings.leader_id] = data.leaderId;
  }
  if (mappings.employee_id) {
    responseData[mappings.employee_id] = data.employeeId;
  }
  if (mappings.position) {
    responseData[mappings.position] = data.position;
  }
  if (mappings.ratings && Array.isArray(mappings.ratings)) {
    for (let i = 0; i < mappings.ratings.length; i++) {
      responseData[mappings.ratings[i]] = data.ratings[i] ?? 0;
    }
  }
  if (mappings.notes && data.notes) {
    responseData[mappings.notes] = data.notes;
  }

  return responseData;
}

/**
 * Build response_data for an infraction form submission.
 * Maps semantic infraction form values to field IDs from field_mappings.
 */
export function buildInfractionResponseData(
  mappings: FieldMappings,
  data: {
    leaderId: string;
    employeeId: string;
    infractionId: string;
    infractionDate: string;
    acknowledged: boolean;
    notes: string | null;
    teamMemberSignature: string | null;
    leaderSignature: string;
  }
): Record<string, any> {
  const responseData: Record<string, any> = {};

  if (mappings.employee_id) {
    responseData[mappings.employee_id] = data.employeeId;
  }
  if (mappings.leader_id) {
    responseData[mappings.leader_id] = data.leaderId;
  }
  if (mappings.infraction_id) {
    responseData[mappings.infraction_id] = data.infractionId;
  }
  if (mappings.infraction_date) {
    responseData[mappings.infraction_date] = data.infractionDate;
  }
  if (mappings.acknowledged) {
    responseData[mappings.acknowledged] = data.acknowledged;
  }
  if (mappings.notes && data.notes) {
    responseData[mappings.notes] = data.notes;
  }
  if (mappings.team_member_signature && data.teamMemberSignature) {
    responseData[mappings.team_member_signature] = data.teamMemberSignature;
  }
  if (mappings.leader_signature) {
    responseData[mappings.leader_signature] = data.leaderSignature;
  }

  return responseData;
}
