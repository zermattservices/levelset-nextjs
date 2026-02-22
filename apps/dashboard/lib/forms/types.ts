/**
 * Form Management Module - Type Definitions
 */

export interface FormGroup {
  id: string;
  org_id: string;
  name: string;
  name_es: string | null;
  description: string | null;
  description_es: string | null;
  slug: string;
  is_system: boolean;
  icon: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  // Joined/computed fields
  templates?: FormTemplate[];
  template_count?: number;
}

export interface FormTemplate {
  id: string;
  org_id: string;
  group_id: string;
  name: string;
  name_es: string | null;
  slug: string;
  description: string | null;
  description_es: string | null;
  form_type: FormType;
  schema: Record<string, any>;
  ui_schema: Record<string, any>;
  settings: Record<string, any>;
  is_active: boolean;
  is_system: boolean;
  created_by: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  group?: FormGroup;
  submission_count?: number;
}

export interface FormSubmission {
  id: string;
  org_id: string;
  location_id: string | null;
  template_id: string;
  form_type: string;
  submitted_by: string | null;
  employee_id: string | null;
  response_data: Record<string, any>;
  schema_snapshot: Record<string, any>;
  score: number | null;
  status: SubmissionStatus;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joined fields
  template?: FormTemplate;
  submitted_by_name?: string;
  employee_name?: string;
}

export interface FormConnector {
  id: string;
  key: string;
  name: string;
  name_es: string | null;
  description: string | null;
  description_es: string | null;
  category: string;
  return_type: 'boolean' | 'number' | 'percentage';
  params: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export type FormType = 'rating' | 'discipline' | 'evaluation' | 'custom';
export type SubmissionStatus = 'submitted' | 'deleted';

// System group slugs (predefined, cannot be deleted)
export const SYSTEM_GROUP_SLUGS = {
  POSITIONAL_EXCELLENCE: 'positional_excellence',
  DISCIPLINE: 'discipline',
  EVALUATIONS: 'evaluations',
} as const;

export type SystemGroupSlug = (typeof SYSTEM_GROUP_SLUGS)[keyof typeof SYSTEM_GROUP_SLUGS];
