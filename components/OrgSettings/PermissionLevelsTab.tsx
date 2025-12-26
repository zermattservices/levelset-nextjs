/**
 * Permission Levels Tab
 * Displays permission profiles with left/right panel layout:
 * - Left: Table of permission levels
 * - Right: Assigned users for selected level
 */

import * as React from 'react';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import sty from './PermissionLevelsTab.module.css';
import { createSupabaseClient } from '@/util/supabase/component';
import { AddPermissionLevelModal } from './AddPermissionLevelModal';

const fontFamily = '"Satoshi", sans-serif';

interface PermissionProfile {
  id: string;
  name: string;
  hierarchy_level: number;
  linked_role_name: string | null;
  is_system_default: boolean;
}

interface AssignedUser {
  id: string;
  name: string;
  email: string;
}

interface PermissionLevelsTabProps {
  orgId: string | null;
  disabled?: boolean;
  userHierarchyLevel: number;
  canEditLevel: (targetLevel: number) => boolean;
  onEditProfile: (profileId: string) => void;
}

export function PermissionLevelsTab({
  orgId,
  disabled = false,
  userHierarchyLevel,
  canEditLevel,
  onEditProfile,
}: PermissionLevelsTabProps) {
  const [profiles, setProfiles] = React.useState<PermissionProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = React.useState<string | null>(null);
  const [assignedUsers, setAssignedUsers] = React.useState<AssignedUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingUsers, setLoadingUsers] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Fetch permission profiles
  const fetchProfiles = React.useCallback(async () => {
    if (!orgId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('permission_profiles')
        .select('id, name, hierarchy_level, linked_role_name, is_system_default')
        .eq('org_id', orgId)
        .order('hierarchy_level', { ascending: true })
        .order('is_system_default', { ascending: false });

      if (fetchError) throw fetchError;

      setProfiles(data || []);
    } catch (err: any) {
      console.error('Error fetching permission profiles:', err);
      setError(err.message || 'Failed to load permission profiles');
    } finally {
      setLoading(false);
    }
  }, [orgId, supabase]);

  React.useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Fetch assigned users when a profile is selected
  const fetchAssignedUsers = React.useCallback(async (profileId: string) => {
    if (!orgId || !profileId) return;

    setLoadingUsers(true);

    try {
      // Get the selected profile details
      const selectedProfile = profiles.find(p => p.id === profileId);
      if (!selectedProfile) return;

      // For system default profiles, get users by hierarchy level
      // For custom profiles, get users explicitly assigned
      const { data: appUsers, error: usersError } = await supabase
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

      if (usersError) throw usersError;

      // Get org roles to determine hierarchy levels
      const { data: orgRoles } = await supabase
        .from('org_roles')
        .select('role_name, hierarchy_level')
        .eq('org_id', orgId);

      const roleToLevel = new Map(orgRoles?.map(r => [r.role_name, r.hierarchy_level]) || []);

      // Filter users based on profile assignment
      const filteredUsers: AssignedUser[] = [];

      for (const user of appUsers || []) {
        let userProfileId: string | null = null;

        if (user.permission_profile_id && !user.use_role_default) {
          // User has explicit profile assignment
          userProfileId = user.permission_profile_id;
        } else {
          // User uses role default - find their hierarchy level and corresponding system profile
          const employeeData = user.employees as { role?: string } | null;
          const role = employeeData?.role;
          const level = role ? roleToLevel.get(role) : null;

          if (level !== null && level !== undefined) {
            // Find the system default profile for this level
            const systemProfile = profiles.find(
              p => p.hierarchy_level === level && p.is_system_default
            );
            userProfileId = systemProfile?.id || null;
          }
        }

        if (userProfileId === profileId) {
          filteredUsers.push({
            id: user.id,
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown',
            email: user.email || '',
          });
        }
      }

      // Sort alphabetically
      filteredUsers.sort((a, b) => a.name.localeCompare(b.name));

      setAssignedUsers(filteredUsers);
    } catch (err: any) {
      console.error('Error fetching assigned users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [orgId, profiles, supabase]);

  // Handle profile selection
  const handleViewAssignments = (profileId: string) => {
    if (selectedProfileId === profileId) {
      setSelectedProfileId(null);
      setAssignedUsers([]);
    } else {
      setSelectedProfileId(profileId);
      fetchAssignedUsers(profileId);
    }
  };

  // Handle profile deletion
  const handleDeleteProfile = async (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile || profile.is_system_default) return;

    if (!window.confirm(`Are you sure you want to delete the "${profile.name}" permission level?`)) {
      return;
    }

    setDeleting(profileId);

    try {
      const { error: deleteError } = await supabase
        .from('permission_profiles')
        .delete()
        .eq('id', profileId);

      if (deleteError) throw deleteError;

      // Clear selection if deleted profile was selected
      if (selectedProfileId === profileId) {
        setSelectedProfileId(null);
        setAssignedUsers([]);
      }

      fetchProfiles();
    } catch (err: any) {
      console.error('Error deleting profile:', err);
      alert('Failed to delete permission level');
    } finally {
      setDeleting(null);
    }
  };

  // Handle profile creation
  const handleProfileCreated = () => {
    setAddModalOpen(false);
    fetchProfiles();
  };

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  if (loading) {
    return (
      <div className={sty.loadingContainer}>
        <CircularProgress size={32} sx={{ color: '#31664a' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={sty.errorContainer}>
        <p>{error}</p>
        <Button onClick={fetchProfiles} variant="outlined" size="small">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={sty.container}>
      {/* Left panel - Permission levels table */}
      <div className={sty.leftPanel}>
        <div className={sty.panelHeader}>
          <h3 className={sty.panelTitle}>Permission Levels</h3>
          {!disabled && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setAddModalOpen(true)}
              sx={{
                fontFamily,
                fontSize: 13,
                textTransform: 'none',
                borderColor: '#e5e7eb',
                color: '#374151',
                '&:hover': {
                  borderColor: '#31664a',
                  backgroundColor: 'rgba(49, 102, 74, 0.04)',
                },
              }}
            >
              Add Custom Level
            </Button>
          )}
        </div>

        <div className={sty.tableContainer}>
          <table className={sty.table}>
            <thead>
              <tr>
                <th className={sty.th}>Level</th>
                <th className={sty.th}>Role</th>
                <th className={sty.th}>Permission Level</th>
                <th className={sty.thActions}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => {
                const canEdit = canEditLevel(profile.hierarchy_level);
                const isSelected = selectedProfileId === profile.id;

                return (
                  <tr
                    key={profile.id}
                    className={`${sty.tr} ${isSelected ? sty.trSelected : ''}`}
                  >
                    <td className={sty.td}>
                      <Chip
                        label={profile.hierarchy_level}
                        size="small"
                        sx={{
                          fontFamily,
                          fontSize: 12,
                          fontWeight: 500,
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          height: 24,
                        }}
                      />
                    </td>
                    <td className={sty.td}>
                      {profile.linked_role_name ? (
                        <span className={sty.roleName}>{profile.linked_role_name}</span>
                      ) : (
                        <span className={sty.noRole}>—</span>
                      )}
                    </td>
                    <td className={sty.td}>
                      <span className={sty.profileName}>{profile.name}</span>
                      {profile.is_system_default && (
                        <Chip
                          label="System"
                          size="small"
                          sx={{
                            fontFamily,
                            fontSize: 10,
                            fontWeight: 500,
                            backgroundColor: '#dbeafe',
                            color: '#1e40af',
                            height: 18,
                            marginLeft: 1,
                          }}
                        />
                      )}
                    </td>
                    <td className={sty.tdActions}>
                      <IconButton
                        size="small"
                        onClick={() => handleViewAssignments(profile.id)}
                        title="View Assignments"
                        sx={{
                          color: isSelected ? '#31664a' : '#6b7280',
                          '&:hover': { color: '#31664a' },
                        }}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      {canEdit && !disabled && (
                        <>
                          <IconButton
                            size="small"
                            onClick={() => onEditProfile(profile.id)}
                            title="Edit Permissions"
                            sx={{
                              color: '#6b7280',
                              '&:hover': { color: '#31664a' },
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          {!profile.is_system_default && (
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteProfile(profile.id)}
                              title="Delete"
                              disabled={deleting === profile.id}
                              sx={{
                                color: '#6b7280',
                                '&:hover': { color: '#dc2626' },
                              }}
                            >
                              {deleting === profile.id ? (
                                <CircularProgress size={16} />
                              ) : (
                                <DeleteIcon fontSize="small" />
                              )}
                            </IconButton>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right panel - Assigned users */}
      <div className={sty.rightPanel}>
        <div className={sty.panelHeader}>
          <h3 className={sty.panelTitle}>
            {selectedProfile
              ? `Users with "${selectedProfile.name}"`
              : 'Select a level to view users'}
          </h3>
        </div>

        <div className={sty.usersContainer}>
          {!selectedProfileId ? (
            <div className={sty.emptyState}>
              Click "View Assignments" on a permission level to see assigned users.
            </div>
          ) : loadingUsers ? (
            <div className={sty.loadingUsers}>
              <CircularProgress size={24} sx={{ color: '#31664a' }} />
            </div>
          ) : assignedUsers.length === 0 ? (
            <div className={sty.emptyState}>
              No users are assigned to this permission level.
            </div>
          ) : (
            <table className={sty.usersTable}>
              <thead>
                <tr>
                  <th className={sty.th}>Name</th>
                  <th className={sty.th}>Email</th>
                </tr>
              </thead>
              <tbody>
                {assignedUsers.map((user) => (
                  <tr key={user.id} className={sty.tr}>
                    <td className={sty.td}>{user.name}</td>
                    <td className={sty.td}>
                      <span className={sty.email}>{user.email}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Permission Level Modal */}
      <AddPermissionLevelModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onCreated={handleProfileCreated}
        orgId={orgId}
        existingLevels={profiles.map(p => p.hierarchy_level)}
      />
    </div>
  );
}

export default PermissionLevelsTab;
