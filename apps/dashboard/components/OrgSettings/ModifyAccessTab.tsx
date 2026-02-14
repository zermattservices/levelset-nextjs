/**
 * Modify Access Tab
 * Configure granular permissions for each permission profile
 * Features:
 * - Dropdown to select profile
 * - Module accordion with checkboxes
 * - X/Y pill showing enabled count
 * - Search filtering
 */

import * as React from 'react';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { styled } from '@mui/material/styles';
import sty from './ModifyAccessTab.module.css';
import { createSupabaseClient } from '@/util/supabase/component';
import {
  PERMISSION_MODULES,
  MODULE_METADATA,
  SUB_ITEM_METADATA,
  P,
  PermissionKey,
  getModulePermissions,
} from '@/lib/permissions/constants';
import { resolveDependencies, getDependentPermissions } from '@/lib/permissions/service';
import { useAuth } from '@/lib/providers/AuthProvider';

const fontFamily = '"Satoshi", sans-serif';

const StyledSelect = styled(Select)(() => ({
  fontFamily,
  fontSize: 14,
  minWidth: 280,
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#e5e7eb',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: '#31664a' /* TODO: Use design token */,
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#31664a' /* TODO: Use design token */,
  },
}));

const StyledTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    fontFamily,
    fontSize: 14,
    '&:hover fieldset': {
      borderColor: '#31664a' /* TODO: Use design token */,
    },
    '&.Mui-focused fieldset': {
      borderColor: '#31664a' /* TODO: Use design token */,
    },
  },
}));

interface PermissionProfile {
  id: string;
  name: string;
  hierarchy_level: number;
  is_system_default: boolean;
  is_admin_profile?: boolean;
}

interface AccessRecord {
  sub_item_id: string;
  is_enabled: boolean;
}

interface SubItemData {
  id: string;
  key: string;
  module_key: string;
}

interface ModifyAccessTabProps {
  orgId: string | null;
  disabled?: boolean;
  userHierarchyLevel: number;
  canEditLevel: (targetLevel: number) => boolean;
  initialProfileId: string | null;
}

export function ModifyAccessTab({
  orgId,
  disabled = false,
  userHierarchyLevel,
  canEditLevel,
  initialProfileId,
}: ModifyAccessTabProps) {
  const [profiles, setProfiles] = React.useState<PermissionProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = React.useState<string | null>(initialProfileId);
  const [accessMap, setAccessMap] = React.useState<Map<string, boolean>>(new Map());
  const [subItemMap, setSubItemMap] = React.useState<Map<string, SubItemData>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [loadingAccess, setLoadingAccess] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandedModules, setExpandedModules] = React.useState<Set<string>>(new Set());
  const [employeesModalOpen, setEmployeesModalOpen] = React.useState(false);
  const [assignedEmployees, setAssignedEmployees] = React.useState<{ name: string; email: string }[]>([]);
  const [loadingEmployees, setLoadingEmployees] = React.useState(false);

  const supabase = React.useMemo(() => createSupabaseClient(), []);
  const auth = useAuth();
  
  // Levelset Admin can see all tiers
  const isLevelsetAdmin = auth.role === 'Levelset Admin';
  
  // Admin profiles can be edited by tier 0 and tier 1 users
  const canEditAdminProfiles = isLevelsetAdmin || userHierarchyLevel <= 1;
  
  // Split profiles into role-based and admin profiles
  const roleProfiles = React.useMemo(() => {
    return profiles.filter(p => !p.is_admin_profile);
  }, [profiles]);
  
  const adminProfiles = React.useMemo(() => {
    return profiles.filter(p => p.is_admin_profile);
  }, [profiles]);
  
  // Filter role profiles to only show those the user can see
  // Users can only see permission tiers below their own
  const visibleRoleProfiles = React.useMemo(() => {
    if (isLevelsetAdmin) return roleProfiles;
    return roleProfiles.filter(p => p.hierarchy_level > userHierarchyLevel);
  }, [roleProfiles, userHierarchyLevel, isLevelsetAdmin]);
  
  // Combined visible profiles (role profiles + admin profiles if user can see them)
  const visibleProfiles = React.useMemo(() => {
    if (canEditAdminProfiles) {
      return [...visibleRoleProfiles, ...adminProfiles];
    }
    return visibleRoleProfiles;
  }, [visibleRoleProfiles, adminProfiles, canEditAdminProfiles]);

  // Update selected profile when initial profile changes
  React.useEffect(() => {
    if (initialProfileId) {
      setSelectedProfileId(initialProfileId);
    }
  }, [initialProfileId]);

  // Fetch profiles and sub-item metadata
  React.useEffect(() => {
    async function fetchData() {
      if (!orgId) return;

      setLoading(true);

      try {
        // Fetch profiles
        const { data: profilesData } = await supabase
          .from('permission_profiles')
          .select('id, name, hierarchy_level, is_system_default, is_admin_profile')
          .eq('org_id', orgId)
          .order('hierarchy_level', { ascending: true })
          .order('is_system_default', { ascending: false });

        setProfiles(profilesData || []);

        // Fetch sub-items with module keys
        const { data: subItems } = await supabase
          .from('permission_sub_items')
          .select(`
            id,
            key,
            permission_modules!inner (
              key
            )
          `);

        const subItemData = new Map<string, SubItemData>();
        for (const item of (subItems as any[]) || []) {
          const fullKey = `${item.permission_modules.key}.${item.key}`;
          subItemData.set(fullKey, {
            id: item.id,
            key: item.key,
            module_key: item.permission_modules.key,
          });
        }
        setSubItemMap(subItemData);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orgId, supabase]);

  // Fetch access records when profile changes
  React.useEffect(() => {
    async function fetchAccess() {
      if (!selectedProfileId) {
        setAccessMap(new Map());
        return;
      }

      setLoadingAccess(true);

      try {
        const { data: accessData } = await supabase
          .from('permission_profile_access')
          .select(`
            sub_item_id,
            is_enabled,
            permission_sub_items!inner (
              key,
              permission_modules!inner (
                key
              )
            )
          `)
          .eq('profile_id', selectedProfileId);

        const access = new Map<string, boolean>();
        for (const record of (accessData as any[]) || []) {
          const fullKey = `${record.permission_sub_items.permission_modules.key}.${record.permission_sub_items.key}`;
          access.set(fullKey, record.is_enabled);
        }
        setAccessMap(access);
      } catch (err) {
        console.error('Error fetching access:', err);
      } finally {
        setLoadingAccess(false);
      }
    }

    fetchAccess();
  }, [selectedProfileId, supabase]);

  // Toggle permission and auto-save
  const handleTogglePermission = async (permissionKey: PermissionKey, enabled: boolean) => {
    if (!selectedProfileId) return;

    const subItem = subItemMap.get(permissionKey);
    if (!subItem) return;

    // Handle dependencies
    const metadata = SUB_ITEM_METADATA[permissionKey];
    let permissionsToUpdate = [{ key: permissionKey, enabled }];

    // If enabling and this permission depends on another, enable the dependency
    if (enabled && metadata.dependsOn) {
      const depSubItem = subItemMap.get(metadata.dependsOn);
      if (depSubItem && !accessMap.get(metadata.dependsOn)) {
        permissionsToUpdate.push({ key: metadata.dependsOn, enabled: true });
      }
    }

    // If disabling and other permissions depend on this one, disable them too
    if (!enabled) {
      const dependents = getDependentPermissions(permissionKey);
      for (const depKey of dependents) {
        if (accessMap.get(depKey)) {
          permissionsToUpdate.push({ key: depKey, enabled: false });
        }
      }
    }

    // Optimistic update
    const newAccessMap = new Map(accessMap);
    for (const update of permissionsToUpdate) {
      newAccessMap.set(update.key, update.enabled);
    }
    setAccessMap(newAccessMap);

    // Save to database
    setSaving(true);
    try {
      for (const update of permissionsToUpdate) {
        const updateSubItem = subItemMap.get(update.key);
        if (!updateSubItem) continue;

        await supabase
          .from('permission_profile_access')
          .upsert(
            {
              profile_id: selectedProfileId,
              sub_item_id: updateSubItem.id,
              is_enabled: update.enabled,
            },
            { onConflict: 'profile_id,sub_item_id' }
          );
      }
    } catch (err) {
      console.error('Error saving permission:', err);
      // Revert on error
      setAccessMap(accessMap);
    } finally {
      setSaving(false);
    }
  };

  // Fetch assigned employees for display modal
  const handleDisplayEmployees = async () => {
    if (!selectedProfileId || !orgId) return;

    setEmployeesModalOpen(true);
    setLoadingEmployees(true);

    try {
      const selectedProfile = profiles.find(p => p.id === selectedProfileId);
      if (!selectedProfile) return;

      const { data: appUsers } = await supabase
        .from('app_users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          permission_profile_id,
          use_role_default,
          employees!app_users_employee_id_fkey (
            role
          )
        `)
        .eq('org_id', orgId);

      const { data: orgRoles } = await supabase
        .from('org_roles')
        .select('role_name, hierarchy_level')
        .eq('org_id', orgId);

      const roleToLevel = new Map(orgRoles?.map(r => [r.role_name, r.hierarchy_level]) || []);

      const employees: { name: string; email: string }[] = [];

      for (const user of appUsers || []) {
        let userProfileId: string | null = null;

        if (user.permission_profile_id && !user.use_role_default) {
          userProfileId = user.permission_profile_id;
        } else {
          const employeeData = user.employees as { role?: string } | null;
          const role = employeeData?.role;
          const level = role ? roleToLevel.get(role) : null;

          if (level !== null && level !== undefined) {
            const systemProfile = profiles.find(
              p => p.hierarchy_level === level && p.is_system_default
            );
            userProfileId = systemProfile?.id || null;
          }
        }

        if (userProfileId === selectedProfileId) {
          employees.push({
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown',
            email: user.email || '',
          });
        }
      }

      employees.sort((a, b) => a.name.localeCompare(b.name));
      setAssignedEmployees(employees);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);
  // Admin profiles can be edited by tier 0 and 1 users, role profiles use canEditLevel
  // Levelset Admin can edit everything including operator (level 0)
  const canEdit = selectedProfile 
    ? selectedProfile.is_admin_profile 
      ? canEditAdminProfiles && !disabled 
      : (isLevelsetAdmin || canEditLevel(selectedProfile.hierarchy_level)) && !disabled 
    : false;

  // Get module order and filter by search
  const moduleKeys = Object.values(PERMISSION_MODULES);
  const sortedModules = moduleKeys
    .map(key => ({
      key,
      metadata: MODULE_METADATA[key],
      permissions: getModulePermissions(key),
    }))
    .sort((a, b) => a.metadata.order - b.metadata.order);

  // Filter permissions by search
  const filterPermissions = (permissions: PermissionKey[]) => {
    if (!searchQuery) return permissions;
    const query = searchQuery.toLowerCase();
    return permissions.filter(key => {
      const metadata = SUB_ITEM_METADATA[key];
      return (
        metadata.name.toLowerCase().includes(query) ||
        metadata.description.toLowerCase().includes(query)
      );
    });
  };

  // Calculate enabled count for a module
  const getModuleEnabledCount = (permissions: PermissionKey[]) => {
    let enabled = 0;
    for (const key of permissions) {
      if (accessMap.get(key)) enabled++;
    }
    return { enabled, total: permissions.length };
  };

  // Get pill color based on count
  const getPillColor = (enabled: number, total: number) => {
    if (enabled === total) return { bg: '#dcfce7', color: '#166534' }; // Green
    if (enabled === 0) return { bg: '#f3f4f6', color: '#6b7280' }; // Grey
    return { bg: '#fef3c7', color: '#92400e' }; // Yellow
  };

  if (loading) {
    return (
      <div className={sty.loadingContainer}>
        <CircularProgress size={32} sx={{ color: '#31664a' /* TODO: Use design token */ }} />
      </div>
    );
  }

  return (
    <div className={sty.container}>
      {/* Header with profile selector */}
      <div className={sty.header}>
        <div className={sty.headerLeft}>
          <FormControl size="small">
            <StyledSelect
              value={selectedProfileId || ''}
              onChange={(e) => setSelectedProfileId(e.target.value as string)}
              displayEmpty
            >
              <MenuItem value="" disabled sx={{ fontFamily, fontSize: 14 }}>
                Select a permission level
              </MenuItem>
              {visibleProfiles.map((profile) => (
                <MenuItem
                  key={profile.id}
                  value={profile.id}
                  sx={{ fontFamily, fontSize: 14 }}
                >
                  {profile.name}{profile.is_admin_profile ? ' (Admin)' : ` - Tier ${profile.hierarchy_level}`}
                </MenuItem>
              ))}
            </StyledSelect>
          </FormControl>

          {selectedProfileId && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<PeopleIcon />}
              onClick={handleDisplayEmployees}
              sx={{
                fontFamily,
                fontSize: 13,
                textTransform: 'none',
                borderColor: '#e5e7eb',
                color: '#374151',
                '&:hover': {
                  borderColor: '#31664a' /* TODO: Use design token */,
                  backgroundColor: 'rgba(49, 102, 74, 0.04)',
                },
              }}
            >
              Display Employees
            </Button>
          )}
        </div>

        {saving && (
          <div className={sty.savingIndicator}>
            <CircularProgress size={16} sx={{ color: '#31664a' /* TODO: Use design token */ }} />
            <span>Saving...</span>
          </div>
        )}
      </div>

      {/* Search bar */}
      <div className={sty.searchContainer}>
        <StyledTextField
          placeholder="Search permissions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#9ca3af' }} />
              </InputAdornment>
            ),
          }}
        />
      </div>

      {/* Permission modules */}
      {!selectedProfileId ? (
        <div className={sty.emptyState}>
          Select a permission level to view and edit permissions.
        </div>
      ) : loadingAccess ? (
        <div className={sty.loadingContainer}>
          <CircularProgress size={24} sx={{ color: '#31664a' /* TODO: Use design token */ }} />
        </div>
      ) : (
        <div className={sty.modulesContainer}>
          {sortedModules.map(({ key: moduleKey, metadata, permissions }) => {
            const filteredPermissions = filterPermissions(permissions);
            if (filteredPermissions.length === 0) return null;

            const { enabled, total } = getModuleEnabledCount(permissions);
            const pillColor = getPillColor(enabled, total);
            const isExpanded = expandedModules.has(moduleKey);

            return (
              <Accordion
                key={moduleKey}
                expanded={isExpanded}
                onChange={() => {
                  const next = new Set(expandedModules);
                  if (isExpanded) {
                    next.delete(moduleKey);
                  } else {
                    next.add(moduleKey);
                  }
                  setExpandedModules(next);
                }}
                sx={{
                  '&:before': { display: 'none' },
                  boxShadow: 'none',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px !important',
                  marginBottom: 1,
                  '&.Mui-expanded': {
                    margin: '0 0 8px 0',
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    '& .MuiAccordionSummary-content': {
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                    },
                  }}
                >
                  <Chip
                    label={`${enabled}/${total}`}
                    size="small"
                    sx={{
                      fontFamily,
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: pillColor.bg,
                      color: pillColor.color,
                      height: 24,
                      minWidth: 50,
                    }}
                  />
                  <div>
                    <div className={sty.moduleName}>{metadata.name}</div>
                    <div className={sty.moduleDescription}>{metadata.description}</div>
                  </div>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <div className={sty.permissionsList}>
                    {filteredPermissions.map((permKey) => {
                      const permMetadata = SUB_ITEM_METADATA[permKey];
                      const isEnabled = accessMap.get(permKey) || false;
                      const hasDependency = permMetadata.dependsOn !== undefined;
                      const isDependencyEnabled = hasDependency
                        ? accessMap.get(permMetadata.dependsOn!)
                        : true;

                      return (
                        <div key={permKey} className={sty.permissionItem}>
                          <Checkbox
                            checked={isEnabled}
                            onChange={(e) => handleTogglePermission(permKey, e.target.checked)}
                            disabled={!canEdit}
                            sx={{
                              padding: '4px',
                              color: '#d1d5db',
                              '&.Mui-checked': {
                                color: '#31664a' /* TODO: Use design token */,
                              },
                            }}
                          />
                          <div className={sty.permissionContent}>
                            <div className={sty.permissionName}>
                              {permMetadata.name}
                              {hasDependency && !isDependencyEnabled && (
                                <span className={sty.dependencyNote}>
                                  (requires {SUB_ITEM_METADATA[permMetadata.dependsOn!].name})
                                </span>
                              )}
                            </div>
                            <div className={sty.permissionDescription}>
                              {permMetadata.description}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </div>
      )}

      {/* Tier restriction message */}
      {selectedProfile && !canEdit && (
        <div className={sty.tierRestriction}>
          You can only edit permission levels below your current tier (Level {userHierarchyLevel}).
        </div>
      )}

      {/* Display Employees Modal */}
      <Dialog
        open={employeesModalOpen}
        onClose={() => setEmployeesModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontFamily, fontSize: 18, fontWeight: 600 }}>
          Users with "{selectedProfile?.name}"
        </DialogTitle>
        <DialogContent>
          {loadingEmployees ? (
            <div className={sty.loadingContainer}>
              <CircularProgress size={24} sx={{ color: '#31664a' /* TODO: Use design token */ }} />
            </div>
          ) : assignedEmployees.length === 0 ? (
            <div className={sty.emptyState}>No users are assigned to this permission level.</div>
          ) : (
            <div className={sty.employeesList}>
              {assignedEmployees.map((emp, idx) => (
                <div key={idx} className={sty.employeeItem}>
                  <span className={sty.employeeName}>{emp.name}</span>
                  <span className={sty.employeeEmail}>{emp.email}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setEmployeesModalOpen(false)}
            sx={{ fontFamily, textTransform: 'none' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default ModifyAccessTab;
