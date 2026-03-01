-- Org Chart: Departments, Groups, and Employee Supervisor Relationships
-- Creates three new tables and adds four new columns to employees

-- 1. org_departments table
CREATE TABLE IF NOT EXISTS org_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  department_head_id UUID, -- FK added after employees columns exist
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_departments_org ON org_departments(org_id);
CREATE INDEX IF NOT EXISTS idx_org_departments_org_loc ON org_departments(org_id, location_id);

-- 2. org_groups table
CREATE TABLE IF NOT EXISTS org_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  department_id UUID REFERENCES org_departments(id) ON DELETE SET NULL,
  role_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_groups_org ON org_groups(org_id);
CREATE INDEX IF NOT EXISTS idx_org_groups_org_loc ON org_groups(org_id, location_id);
CREATE INDEX IF NOT EXISTS idx_org_groups_dept ON org_groups(department_id);

-- 3. org_group_members join table
CREATE TABLE IF NOT EXISTS org_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_group_id UUID NOT NULL REFERENCES org_groups(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_group_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_org_group_members_group ON org_group_members(org_group_id);
CREATE INDEX IF NOT EXISTS idx_org_group_members_employee ON org_group_members(employee_id);
CREATE INDEX IF NOT EXISTS idx_org_group_members_org ON org_group_members(org_id);

-- 4. Add new columns to employees
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS direct_supervisor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supervisor_group_id UUID REFERENCES org_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES org_departments(id) ON DELETE SET NULL;

-- CHECK constraint: at most one of direct_supervisor_id OR supervisor_group_id
ALTER TABLE employees
  ADD CONSTRAINT chk_supervisor_exclusive
  CHECK (NOT (direct_supervisor_id IS NOT NULL AND supervisor_group_id IS NOT NULL));

-- Now add the department_head FK back to org_departments
ALTER TABLE org_departments
  ADD CONSTRAINT fk_dept_head FOREIGN KEY (department_head_id) REFERENCES employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employees_supervisor ON employees(direct_supervisor_id) WHERE direct_supervisor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_supervisor_group ON employees(supervisor_group_id) WHERE supervisor_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id) WHERE department_id IS NOT NULL;

-- 5. RLS policies
ALTER TABLE org_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_departments_select" ON org_departments FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "org_departments_insert" ON org_departments FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "org_departments_update" ON org_departments FOR UPDATE TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "org_departments_delete" ON org_departments FOR DELETE TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

ALTER TABLE org_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_groups_select" ON org_groups FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "org_groups_insert" ON org_groups FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "org_groups_update" ON org_groups FOR UPDATE TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "org_groups_delete" ON org_groups FOR DELETE TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

ALTER TABLE org_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_group_members_select" ON org_group_members FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "org_group_members_insert" ON org_group_members FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "org_group_members_delete" ON org_group_members FOR DELETE TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));
