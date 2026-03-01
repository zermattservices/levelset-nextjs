import type { RoleColorKey } from './role-utils';

export interface OrgDepartment {
  id: string;
  name: string;
  org_id: string;
  location_id: string | null;
  department_head_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgGroup {
  id: string;
  name: string;
  org_id: string;
  location_id: string | null;
  department_id: string | null;
  role_name: string;
  supervisor_group_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgGroupMember {
  id: string;
  org_group_id: string;
  employee_id: string;
  org_id: string;
  created_at: string;
}

export interface OrgGroupWithMembers extends OrgGroup {
  members: OrgGroupMember[];
}

export interface OrgChartEmployee {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  role: string;
  title: string | null;
  is_foh: boolean;
  is_boh: boolean;
  is_leader: boolean;
  is_trainer: boolean;
  certified_status: string | null;
  hire_date: string | null;
  calculated_pay: number | null;
  actual_pay: number | null;
  actual_pay_type: string | null;
  direct_supervisor_id: string | null;
  supervisor_group_id: string | null;
  department_id: string | null;
  active: boolean;
}

export interface OrgChartRole {
  id: string;
  role_name: string;
  hierarchy_level: number;
  is_leader: boolean;
  is_trainer: boolean;
  color: RoleColorKey;
}

export interface OrgChartData {
  employees: OrgChartEmployee[];
  departments: OrgDepartment[];
  groups: OrgGroupWithMembers[];
  roles: OrgChartRole[];
}
