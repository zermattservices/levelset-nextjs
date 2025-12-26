import * as React from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import BusinessIcon from '@mui/icons-material/Business';
import sty from './UsersTab.module.css';
import { createSupabaseClient } from '@/util/supabase/component';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { AddUserModal } from './AddUserModal';
import { AddAdminModal } from './AddAdminModal';
import { EditLocationAccessModal } from './EditLocationAccessModal';
import { getRoleColor, type OrgRole } from '@/lib/role-utils';
import { usePermissions } from '@/lib/providers/PermissionsProvider';
import { clearPermissionCache } from '@/lib/permissions/service';

const fontFamily = '"Satoshi", sans-serif';

const OrgLevelTag = styled(Chip)(() => ({
  fontFamily,
  fontSize: 11,
  fontWeight: 500,
  height: 22,
  backgroundColor: '#f0fdf4',
  color: '#166534',
  border: '1px solid #bbf7d0',
  '& .MuiChip-icon': {
    fontSize: 14,
    color: '#166534',
  },
}));

const StyledTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    fontFamily,
    fontSize: 14,
    '&:hover fieldset': {
      borderColor: '#31664a',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#31664a',
    },
  },
}));

const StyledSelect = styled(Select)(() => ({
  fontFamily,
  fontSize: 13,
  minWidth: 140,
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#e5e7eb',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: '#31664a',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#31664a',
  },
  '& .MuiSelect-select': {
    padding: '6px 12px',
  },
}));

interface LocationInfo {
  id: string;
  location_number: string;
  name: string;
}

interface PermissionProfile {
  id: string;
  name: string;
  hierarchy_level: number;
  is_system_default: boolean;
}

interface EmployeeLinkedUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_id: string;
  employee_role: string | null;
  is_operator: boolean;
  location_access: string[]; // Array of location IDs the user has access to
  permission_profile_id: string | null;
  use_role_default: boolean;
}

interface AdminOnlyUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  location_access: string[]; // Array of location IDs the user has access to
  permission_profile_id: string | null;
}

interface UsersTabProps {
  orgId: string | null;
  currentUserRole?: string | null;
  disabled?: boolean;
}

export function UsersTab({ orgId, currentUserRole, disabled = false }: UsersTabProps) {
  const { selectedLocationId, userHierarchyLevel } = useLocationContext();
  const { refresh: refreshPermissions } = usePermissions();
  
  // Check if current user can edit operator emails (only Operator or Levelset Admin)
  const canEditOperatorEmail = currentUserRole === 'Operator' || currentUserRole === 'Levelset Admin';
  
  // Levelset Admin can see all tiers
  const isLevelsetAdmin = currentUserRole === 'Levelset Admin';
  
  const [employeeLinkedUsers, setEmployeeLinkedUsers] = React.useState<EmployeeLinkedUser[]>([]);
  const [adminOnlyUsers, setAdminOnlyUsers] = React.useState<AdminOnlyUser[]>([]);
  const [orgRoles, setOrgRoles] = React.useState<OrgRole[]>([]);
  const [orgLocations, setOrgLocations] = React.useState<LocationInfo[]>([]);
  const [permissionProfiles, setPermissionProfiles] = React.useState<PermissionProfile[]>([]);
  
  // Filter profiles to only show those the user can see
  // Users can only see permission tiers below their own
  const visibleProfiles = React.useMemo(() => {
    if (isLevelsetAdmin) return permissionProfiles;
    if (userHierarchyLevel === null) return [];
    return permissionProfiles.filter(p => p.hierarchy_level > userHierarchyLevel);
  }, [permissionProfiles, userHierarchyLevel, isLevelsetAdmin]);
  
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editEmail, setEditEmail] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [savingPermission, setSavingPermission] = React.useState<string | null>(null);
  const [addUserModalOpen, setAddUserModalOpen] = React.useState(false);
  const [addAdminModalOpen, setAddAdminModalOpen] = React.useState(false);
  const [editLocationModalOpen, setEditLocationModalOpen] = React.useState(false);
  const [editingLocationUser, setEditingLocationUser] = React.useState<{
    id: string;
    name: string;
    locationAccess: string[];
  } | null>(null);
  const [locationCount, setLocationCount] = React.useState<number>(0);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Fetch location count for the organization
  React.useEffect(() => {
    async function fetchLocationCount() {
      if (!orgId) return;
      
      const { count } = await supabase
        .from('locations')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId);
      
      setLocationCount(count || 0);
    }
    
    fetchLocationCount();
  }, [orgId, supabase]);

  // Get role color from org_roles
  const getRoleColorKey = React.useCallback((roleName: string | null): string | undefined => {
    if (!roleName) return undefined;
    const role = orgRoles.find(r => r.role_name === roleName);
    return role?.color;
  }, [orgRoles]);

  // Helper to get location number by ID
  const getLocationNumber = React.useCallback((locationId: string): string => {
    const loc = orgLocations.find(l => l.id === locationId);
    return loc?.location_number || '';
  }, [orgLocations]);

  // Handle opening the edit location access modal
  const handleEditLocationAccess = (userId: string, userName: string, locationAccess: string[]) => {
    if (disabled) return;
    setEditingLocationUser({ id: userId, name: userName, locationAccess });
    setEditLocationModalOpen(true);
  };

  // Handle location access saved
  const handleLocationAccessSaved = () => {
    fetchUsers();
    setEditLocationModalOpen(false);
    setEditingLocationUser(null);
  };

  // Render location access pills
  const renderLocationPills = (locationIds: string[], userId: string, userName: string) => {
    if (locationCount <= 1) return null;
    
    // Sort location IDs by their location number
    const sortedIds = [...locationIds].sort((a, b) => {
      const numA = getLocationNumber(a);
      const numB = getLocationNumber(b);
      return numA.localeCompare(numB);
    });

    const content = sortedIds.length === 0 ? (
      <span className={sty.noAccessText}>No locations</span>
    ) : (
      sortedIds.map(locId => {
        const locNum = getLocationNumber(locId);
        if (!locNum) return null;
        return (
          <span key={locId} className={sty.locationPill}>
            {locNum}
          </span>
        );
      })
    );

    return (
      <div 
        className={`${sty.locationPillsContainer} ${!disabled ? sty.locationPillsClickable : ''}`}
        onClick={() => handleEditLocationAccess(userId, userName, locationIds)}
        role={disabled ? undefined : "button"}
        tabIndex={disabled ? undefined : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleEditLocationAccess(userId, userName, locationIds);
          }
        }}
        title={disabled ? undefined : "Click to edit location access"}
      >
        {content}
        {!disabled && (
          <EditIcon className={sty.locationEditIcon} fontSize="small" />
        )}
      </div>
    );
  };

  // Fetch users for this organization
  const fetchUsers = React.useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch org_roles for colors
      const { data: rolesData, error: rolesError } = await supabase
        .from('org_roles')
        .select('*')
        .eq('org_id', orgId)
        .order('hierarchy_level');

      if (rolesError) throw rolesError;
      setOrgRoles(rolesData || []);

      // Fetch permission profiles for this org
      const { data: profilesData, error: profilesError } = await supabase
        .from('permission_profiles')
        .select('id, name, hierarchy_level, is_system_default')
        .eq('org_id', orgId)
        .order('hierarchy_level')
        .order('is_system_default', { ascending: false });

      if (profilesError) throw profilesError;
      setPermissionProfiles(profilesData || []);

      // Fetch all locations for this org
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('id, location_number, name')
        .eq('org_id', orgId)
        .order('location_number');

      if (locationsError) throw locationsError;
      setOrgLocations(locationsData || []);

      // Fetch all location access records for this org's users
      const { data: allLocationAccess, error: accessError } = await supabase
        .from('user_location_access')
        .select('user_id, location_id');

      // Create a map of user_id -> array of location_ids
      const locationAccessMap = new Map<string, string[]>();
      if (!accessError && allLocationAccess) {
        for (const access of allLocationAccess) {
          const existing = locationAccessMap.get(access.user_id) || [];
          existing.push(access.location_id);
          locationAccessMap.set(access.user_id, existing);
        }
      }

      // Fetch employee-linked users with their employee's role
      const { data: linkedData, error: linkedError } = await supabase
        .from('app_users')
        .select(`
          id, 
          first_name, 
          last_name, 
          email, 
          employee_id,
          permissions,
          permission_profile_id,
          use_role_default,
          employees!app_users_employee_id_fkey (
            role
          )
        `)
        .eq('org_id', orgId)
        .not('employee_id', 'is', null)
        .order('first_name');

      if (linkedError) throw linkedError;

      const linkedUsers: EmployeeLinkedUser[] = (linkedData || []).map((user: any) => ({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        employee_id: user.employee_id,
        employee_role: user.employees?.role || null,
        is_operator: user.permissions === 'operator',
        location_access: locationAccessMap.get(user.id) || [],
        permission_profile_id: user.permission_profile_id,
        use_role_default: user.use_role_default ?? true,
      }));

      // Sort by hierarchy level (0 first), then alphabetically within each level
      linkedUsers.sort((a, b) => {
        const levelA = (rolesData || []).find(r => r.role_name === a.employee_role)?.hierarchy_level ?? 999;
        const levelB = (rolesData || []).find(r => r.role_name === b.employee_role)?.hierarchy_level ?? 999;
        if (levelA !== levelB) return levelA - levelB;
        return a.first_name.localeCompare(b.first_name);
      });

      setEmployeeLinkedUsers(linkedUsers);

      // Fetch admin-only users (no employee_id)
      const { data: adminData, error: adminError } = await supabase
        .from('app_users')
        .select('id, first_name, last_name, email, permission_profile_id')
        .eq('org_id', orgId)
        .is('employee_id', null)
        .order('first_name');

      if (adminError) throw adminError;
      
      const adminUsers: AdminOnlyUser[] = (adminData || []).map((user: any) => ({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        location_access: locationAccessMap.get(user.id) || [],
        permission_profile_id: user.permission_profile_id,
      }));
      
      setAdminOnlyUsers(adminUsers);

    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [orgId, supabase]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Get permission profile name for display
  const getPermissionProfileDisplay = React.useCallback((
    user: EmployeeLinkedUser | AdminOnlyUser,
    isEmployeeLinked: boolean
  ): string => {
    if (isEmployeeLinked) {
      const linkedUser = user as EmployeeLinkedUser;
      if (linkedUser.use_role_default || !linkedUser.permission_profile_id) {
        return 'Default (from role)';
      }
    }
    
    const profile = permissionProfiles.find(p => p.id === user.permission_profile_id);
    return profile?.name || 'Not assigned';
  }, [permissionProfiles]);

  // Get the system default profile for a user based on their role hierarchy
  const getSystemProfileForRole = React.useCallback((roleName: string | null): PermissionProfile | undefined => {
    if (!roleName) return undefined;
    const role = orgRoles.find(r => r.role_name === roleName);
    if (!role) return undefined;
    return permissionProfiles.find(p => p.hierarchy_level === role.hierarchy_level && p.is_system_default);
  }, [orgRoles, permissionProfiles]);

  // Handle permission profile change
  const handlePermissionProfileChange = async (
    userId: string,
    authUserId: string | undefined,
    value: string,
    isEmployeeLinked: boolean
  ) => {
    setSavingPermission(userId);
    try {
      if (isEmployeeLinked && value === 'default') {
        // Set to use role default
        const { error: updateError } = await supabase
          .from('app_users')
          .update({ 
            use_role_default: true,
            permission_profile_id: null
          })
          .eq('id', userId);

        if (updateError) throw updateError;

        setEmployeeLinkedUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, use_role_default: true, permission_profile_id: null } : u
        ));
      } else {
        // Set explicit profile
        const { error: updateError } = await supabase
          .from('app_users')
          .update({ 
            use_role_default: false,
            permission_profile_id: value
          })
          .eq('id', userId);

        if (updateError) throw updateError;

        if (isEmployeeLinked) {
          setEmployeeLinkedUsers(prev => prev.map(u => 
            u.id === userId ? { ...u, use_role_default: false, permission_profile_id: value } : u
          ));
        } else {
          setAdminOnlyUsers(prev => prev.map(u => 
            u.id === userId ? { ...u, permission_profile_id: value } : u
          ));
        }
      }

      // Clear permission cache for this user if we have their auth ID
      if (authUserId && orgId) {
        clearPermissionCache(authUserId, orgId);
      }
      
      // Refresh permissions context
      await refreshPermissions();
    } catch (err) {
      console.error('Error updating permission profile:', err);
      setError('Failed to update permission level');
    } finally {
      setSavingPermission(null);
    }
  };

  const handleEditClick = (userId: string, userEmail: string, isOperator: boolean) => {
    // Don't allow editing operator email unless current user is Operator or Levelset Admin
    if (isOperator && !canEditOperatorEmail) {
      return;
    }
    setEditingId(userId);
    setEditEmail(userEmail);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditEmail('');
  };

  const handleSaveEmail = async (userId: string) => {
    if (!editEmail.trim()) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('app_users')
        .update({ email: editEmail.trim() })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Update local state
      setEmployeeLinkedUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, email: editEmail.trim() } : u
      ));
      setAdminOnlyUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, email: editEmail.trim() } : u
      ));
      setEditingId(null);
      setEditEmail('');
      setError(null);
    } catch (err) {
      console.error('Error updating email:', err);
      setError('Failed to update email');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string, isOperator: boolean = false) => {
    if (isOperator) return;

    const linkedUser = employeeLinkedUsers.find(u => u.id === userId);
    const adminUser = adminOnlyUsers.find(u => u.id === userId);
    const user = linkedUser || adminUser;
    
    if (!user) return;

    if (!confirm(`Are you sure you want to remove ${user.first_name} ${user.last_name} from dashboard access?`)) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('app_users')
        .delete()
        .eq('id', userId);

      if (deleteError) throw deleteError;

      setEmployeeLinkedUsers(prev => prev.filter(u => u.id !== userId));
      setAdminOnlyUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to remove user');
    }
  };

  const handleUserCreated = () => {
    fetchUsers();
    setAddUserModalOpen(false);
    setAddAdminModalOpen(false);
  };

  if (loading) {
    return (
      <div className={sty.loadingContainer}>
        <CircularProgress size={32} sx={{ color: '#31664a' }} />
      </div>
    );
  }

  return (
    <div className={sty.container}>
      <div className={sty.intro}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 className={sty.introTitle}>Users</h3>
          {locationCount > 1 && (
            <OrgLevelTag
              icon={<BusinessIcon />}
              label="Applies to all locations"
              size="small"
            />
          )}
        </div>
        <p className={sty.introDescription}>
          Manage users who have access to the Levelset dashboard for this organization.
          Users can sign in to view reports, submit ratings, and manage team members.
        </p>
      </div>

      {error && <div className={sty.errorMessage}>{error}</div>}

      {/* Employee-Linked Users Section */}
      <div className={sty.section}>
        <h4 className={sty.sectionTitle}>Leadership Team</h4>
        <p className={sty.sectionDescription}>
          Team members with leadership roles who have dashboard access.
        </p>
        
        <div className={sty.tableContainer}>
          <table className={sty.table}>
            <thead>
              <tr>
                <th className={sty.headerCell}>Name</th>
                <th className={sty.headerCell}>Email</th>
                <th className={sty.headerCell}>Role</th>
                <th className={sty.headerCell}>Permission Level</th>
                {locationCount > 1 && (
                  <th className={sty.headerCell}>Location Access</th>
                )}
                <th className={sty.headerCellActions}></th>
              </tr>
            </thead>
            <tbody>
              {employeeLinkedUsers.length === 0 ? (
                <tr>
                  <td colSpan={locationCount > 1 ? 6 : 5} className={sty.emptyState}>
                    No leadership users configured yet. Click "Add User" to get started.
                  </td>
                </tr>
              ) : (
                employeeLinkedUsers.map((user) => {
                  const colorKey = getRoleColorKey(user.employee_role);
                  const roleColor = getRoleColor(colorKey);
                  const currentProfileId = user.use_role_default ? 'default' : (user.permission_profile_id || '');
                  return (
                    <tr key={user.id} className={sty.row}>
                      <td className={sty.cell}>
                        <span className={sty.userName}>
                          {user.first_name} {user.last_name}
                        </span>
                        {user.is_operator && (
                          <span className={sty.operatorBadge}>Operator</span>
                        )}
                      </td>
                      <td className={sty.cell}>
                        {editingId === user.id ? (
                          <div className={sty.editEmailRow}>
                            <StyledTextField
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              size="small"
                              placeholder="Email address"
                              sx={{ flex: 1 }}
                              autoFocus
                            />
                            <IconButton
                              size="small"
                              onClick={() => handleSaveEmail(user.id)}
                              disabled={saving}
                              sx={{ color: '#31664a' }}
                            >
                              <CheckIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={handleCancelEdit}
                              disabled={saving}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </div>
                        ) : (
                          <div className={sty.emailRow}>
                            <span className={sty.email}>{user.email}</span>
                            {(!user.is_operator || canEditOperatorEmail) && !disabled && (
                              <IconButton
                                size="small"
                                onClick={() => handleEditClick(user.id, user.email, user.is_operator)}
                                className={sty.editButton}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            )}
                          </div>
                        )}
                      </td>
                      <td className={sty.cell}>
                        {user.employee_role && (
                          <span 
                            className={sty.roleBadge}
                            style={{
                              backgroundColor: roleColor.bg,
                              color: roleColor.text,
                            }}
                          >
                            {user.employee_role}
                          </span>
                        )}
                      </td>
                      <td className={sty.cell}>
                        {disabled ? (
                          <span className={sty.permissionLevelText}>
                            {getPermissionProfileDisplay(user, true)}
                          </span>
                        ) : (
                          <FormControl size="small">
                            <StyledSelect
                              value={currentProfileId}
                              onChange={(e) => handlePermissionProfileChange(user.id, undefined, e.target.value as string, true)}
                              disabled={savingPermission === user.id}
                              displayEmpty
                            >
                              <MenuItem value="default" sx={{ fontFamily, fontSize: 13 }}>
                                Default (from role)
                              </MenuItem>
                              {visibleProfiles.map((profile) => (
                                <MenuItem key={profile.id} value={profile.id} sx={{ fontFamily, fontSize: 13 }}>
                                  {profile.name}
                                </MenuItem>
                              ))}
                            </StyledSelect>
                          </FormControl>
                        )}
                      </td>
                      {locationCount > 1 && (
                        <td className={sty.cell}>
                          {renderLocationPills(user.location_access, user.id, `${user.first_name} ${user.last_name}`)}
                        </td>
                      )}
                      <td className={sty.cellActions}>
                        {!user.is_operator && !disabled && (
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteUser(user.id, user.is_operator)}
                            className={sty.deleteButton}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!disabled && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setAddUserModalOpen(true)}
            sx={{
              fontFamily,
              fontSize: 13,
              textTransform: 'none',
              borderColor: '#31664a',
              color: '#31664a',
              marginTop: 2,
              '&:hover': {
                borderColor: '#31664a',
                backgroundColor: 'rgba(49, 102, 74, 0.08)',
              },
            }}
          >
            Add User
          </Button>
        )}
      </div>

      {/* Admin-Only Users Section */}
      <div className={sty.section}>
        <h4 className={sty.sectionTitle}>Administrative Users</h4>
        <p className={sty.sectionDescription}>
          Users who need dashboard access but are not employees at a location.
        </p>
        
        <div className={sty.tableContainer}>
          <table className={sty.table}>
            <thead>
              <tr>
                <th className={sty.headerCell}>Name</th>
                <th className={sty.headerCell}>Email</th>
                <th className={sty.headerCell}>Role</th>
                <th className={sty.headerCell}>Permission Level</th>
                {locationCount > 1 && (
                  <th className={sty.headerCell}>Location Access</th>
                )}
                <th className={sty.headerCellActions}></th>
              </tr>
            </thead>
            <tbody>
              {adminOnlyUsers.length === 0 ? (
                <tr>
                  <td colSpan={locationCount > 1 ? 6 : 5} className={sty.emptyState}>
                    No administrative users configured yet.
                  </td>
                </tr>
              ) : (
                adminOnlyUsers.map((user) => (
                  <tr key={user.id} className={sty.row}>
                    <td className={sty.cell}>
                      <span className={sty.userName}>
                        {user.first_name} {user.last_name}
                      </span>
                    </td>
                    <td className={sty.cell}>
                      {editingId === user.id ? (
                        <div className={sty.editEmailRow}>
                          <StyledTextField
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            size="small"
                            placeholder="Email address"
                            sx={{ flex: 1 }}
                            autoFocus
                          />
                          <IconButton
                            size="small"
                            onClick={() => handleSaveEmail(user.id)}
                            disabled={saving}
                            sx={{ color: '#31664a' }}
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={handleCancelEdit}
                            disabled={saving}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </div>
                      ) : (
                        <div className={sty.emailRow}>
                          <span className={sty.email}>{user.email}</span>
                          {!disabled && (
                            <IconButton
                              size="small"
                              onClick={() => handleEditClick(user.id, user.email, false)}
                              className={sty.editButton}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          )}
                        </div>
                      )}
                    </td>
                    <td className={sty.cell}>
                      <span className={sty.roleBadge} style={{ backgroundColor: '#e0e7ff', color: '#4f46e5' }}>
                        Administrator
                      </span>
                    </td>
                    <td className={sty.cell}>
                      {disabled ? (
                        <span className={sty.permissionLevelText}>
                          {getPermissionProfileDisplay(user, false)}
                        </span>
                      ) : (
                        <FormControl size="small">
                          <StyledSelect
                            value={user.permission_profile_id || ''}
                            onChange={(e) => handlePermissionProfileChange(user.id, undefined, e.target.value as string, false)}
                            disabled={savingPermission === user.id}
                            displayEmpty
                          >
                            <MenuItem value="" disabled sx={{ fontFamily, fontSize: 13 }}>
                              Select level...
                            </MenuItem>
                            {visibleProfiles.map((profile) => (
                              <MenuItem key={profile.id} value={profile.id} sx={{ fontFamily, fontSize: 13 }}>
                                {profile.name}
                              </MenuItem>
                            ))}
                          </StyledSelect>
                        </FormControl>
                      )}
                    </td>
                    {locationCount > 1 && (
                      <td className={sty.cell}>
                        {renderLocationPills(user.location_access, user.id, `${user.first_name} ${user.last_name}`)}
                      </td>
                    )}
                    <td className={sty.cellActions}>
                      {!disabled && (
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteUser(user.id)}
                          className={sty.deleteButton}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!disabled && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setAddAdminModalOpen(true)}
            sx={{
              fontFamily,
              fontSize: 13,
              textTransform: 'none',
              borderColor: '#31664a',
              color: '#31664a',
              marginTop: 2,
              '&:hover': {
                borderColor: '#31664a',
                backgroundColor: 'rgba(49, 102, 74, 0.08)',
              },
            }}
          >
            Add Administrator
          </Button>
        )}
      </div>

      <AddUserModal
        open={addUserModalOpen}
        onClose={() => setAddUserModalOpen(false)}
        onUserCreated={handleUserCreated}
        orgId={orgId}
        locationId={selectedLocationId}
      />

      <AddAdminModal
        open={addAdminModalOpen}
        onClose={() => setAddAdminModalOpen(false)}
        onUserCreated={handleUserCreated}
        orgId={orgId}
      />

      <EditLocationAccessModal
        open={editLocationModalOpen}
        onClose={() => {
          setEditLocationModalOpen(false);
          setEditingLocationUser(null);
        }}
        onSaved={handleLocationAccessSaved}
        userId={editingLocationUser?.id || null}
        userName={editingLocationUser?.name || ''}
        currentLocationAccess={editingLocationUser?.locationAccess || []}
        orgLocations={orgLocations}
        disabled={disabled}
      />
    </div>
  );
}

export default UsersTab;
