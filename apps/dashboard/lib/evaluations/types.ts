export type EvaluationCadence = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
export type EvaluationSource = 'scheduled' | 'certification_pending' | 'certification_pip' | 'manual';
export type EvaluationStatus = 'due' | 'overdue' | 'completed' | 'not_yet_due' | 'skipped';
export type OverrideType = 'skip' | 'defer' | 'include';
export type RequestStatus = 'pending' | 'completed' | 'cancelled';

export interface EvaluationRule {
  id: string;
  org_id: string;
  form_template_id: string;
  target_role_ids: string[];
  reviewer_role_ids: string[];
  cadence: EvaluationCadence;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  form_template?: {
    id: string;
    name: string;
    name_es: string;
    is_active: boolean;
  };
}

export interface EvaluationOverride {
  id: string;
  org_id: string;
  rule_id: string;
  employee_id: string;
  override_type: OverrideType;
  period_start: string;
  defer_until: string | null;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

export interface EvaluationRequest {
  id: string;
  org_id: string;
  location_id: string;
  employee_id: string;
  form_template_id: string;
  trigger_source: EvaluationSource;
  status: RequestStatus;
  triggered_at: string;
  completed_submission_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CertificationEvaluationRule {
  id: string;
  org_id: string;
  location_id: string;
  form_template_id: string;
  target_role_ids: string[];
  reviewer_role_ids: string[];
  trigger_on: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  form_template?: {
    id: string;
    name: string;
    name_es: string;
    is_active: boolean;
  };
}

export interface EvaluationScoreSummary {
  overall_percentage: number;
  sections: { name: string; percentage: number }[];
}

export interface EvaluationItem {
  id: string;
  source: EvaluationSource;
  employee: {
    id: string;
    name: string;
    role: string;
    role_color?: string | null;
    location_id: string;
  };
  evaluation: {
    template_id: string;
    name: string;
    is_active: boolean;
  };
  cadence: EvaluationCadence | null;
  status: EvaluationStatus;
  last_completed_at: string | null;
  last_submission_id: string | null;
  score: EvaluationScoreSummary | null;
  due_date: string;
  can_conduct: boolean;
  rule_id?: string;
  period_start?: string;
  defer_until?: string | null;
  request_id?: string;
}

export interface CadencePeriod {
  start: Date;
  end: Date;
}
