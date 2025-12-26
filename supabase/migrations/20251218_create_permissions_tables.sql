-- Permission System Tables
-- Creates the foundation for granular permission management

-- Table: permission_modules
-- Stores the top-level permission categories (e.g., Positional Excellence, Discipline)
CREATE TABLE IF NOT EXISTS permission_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: permission_sub_items
-- Stores individual permissions within each module
CREATE TABLE IF NOT EXISTS permission_sub_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES permission_modules(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL,
  requires_sub_item_id UUID REFERENCES permission_sub_items(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(module_id, key)
);

CREATE INDEX IF NOT EXISTS idx_permission_sub_items_module ON permission_sub_items(module_id);

-- Table: permission_profiles
-- Stores permission profiles per organization (system defaults and custom)
CREATE TABLE IF NOT EXISTS permission_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hierarchy_level INTEGER NOT NULL,
  linked_role_name TEXT,
  is_system_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permission_profiles_org ON permission_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_permission_profiles_hierarchy ON permission_profiles(org_id, hierarchy_level);

-- Table: permission_profile_access
-- Stores which permissions are enabled for each profile
CREATE TABLE IF NOT EXISTS permission_profile_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES permission_profiles(id) ON DELETE CASCADE,
  sub_item_id UUID NOT NULL REFERENCES permission_sub_items(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, sub_item_id)
);

CREATE INDEX IF NOT EXISTS idx_permission_access_profile ON permission_profile_access(profile_id);
CREATE INDEX IF NOT EXISTS idx_permission_access_sub_item ON permission_profile_access(sub_item_id);

-- Add permission columns to app_users
ALTER TABLE app_users
ADD COLUMN IF NOT EXISTS permission_profile_id UUID REFERENCES permission_profiles(id),
ADD COLUMN IF NOT EXISTS use_role_default BOOLEAN DEFAULT true;

-- Enable RLS on all permission tables
ALTER TABLE permission_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_sub_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_profile_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for permission_modules (read-only for all authenticated users)
CREATE POLICY "permission_modules_select" ON permission_modules
  FOR SELECT TO authenticated USING (true);

-- RLS Policies for permission_sub_items (read-only for all authenticated users)
CREATE POLICY "permission_sub_items_select" ON permission_sub_items
  FOR SELECT TO authenticated USING (true);

-- RLS Policies for permission_profiles
CREATE POLICY "permission_profiles_select" ON permission_profiles
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "permission_profiles_insert" ON permission_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "permission_profiles_update" ON permission_profiles
  FOR UPDATE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "permission_profiles_delete" ON permission_profiles
  FOR DELETE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()
    )
    AND is_system_default = false
  );

-- RLS Policies for permission_profile_access
CREATE POLICY "permission_profile_access_select" ON permission_profile_access
  FOR SELECT TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM permission_profiles WHERE org_id IN (
        SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "permission_profile_access_insert" ON permission_profile_access
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id IN (
      SELECT id FROM permission_profiles WHERE org_id IN (
        SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "permission_profile_access_update" ON permission_profile_access
  FOR UPDATE TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM permission_profiles WHERE org_id IN (
        SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "permission_profile_access_delete" ON permission_profile_access
  FOR DELETE TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM permission_profiles WHERE org_id IN (
        SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
  );
