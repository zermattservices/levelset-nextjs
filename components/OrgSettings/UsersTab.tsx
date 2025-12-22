import * as React from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import sty from './UsersTab.module.css';
import { createSupabaseClient } from '@/util/supabase/component';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { AddUserModal } from './AddUserModal';
import { AddAdminModal } from './AddAdminModal';
import { getRoleColor, type OrgRole } from '@/lib/role-utils';

const fontFamily = '"Satoshi", sans-serif';

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

interface EmployeeLinkedUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_id: string;
  employee_role: string | null;
  is_operator: boolean;
}

interface AdminOnlyUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface UsersTabProps {
  orgId: string | null;
  currentUserRole?: string | null;
}

export function UsersTab({ orgId, currentUserRole }: UsersTabProps) {
  const { selectedLocationId } = useLocationContext();
  
  // Check if current user can edit operator emails (only Operator or Levelset Admin)
  const canEditOperatorEmail = currentUserRole === 'Operator' || currentUserRole === 'Levelset Admin';
  
  const [employeeLinkedUsers, setEmployeeLinkedUsers] = React.useState<EmployeeLinkedUser[]>([]);
  const [adminOnlyUsers, setAdminOnlyUsers] = React.useState<AdminOnlyUser[]>([]);
  const [orgRoles, setOrgRoles] = React.useState<OrgRole[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editEmail, setEditEmail] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [addUserModalOpen, setAddUserModalOpen] = React.useState(false);
  const [addAdminModalOpen, setAddAdminModalOpen] = React.useState(false);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Get role color from org_roles
  const getRoleColorKey = React.useCallback((roleName: string | null): string | undefined => {
    if (!roleName) return undefined;
    const role = orgRoles.find(r => r.role_name === roleName);
    return role?.color;
  }, [orgRoles]);

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
      }));

      // Sort with operators first
      linkedUsers.sort((a, b) => {
        if (a.is_operator && !b.is_operator) return -1;
        if (!a.is_operator && b.is_operator) return 1;
        return a.first_name.localeCompare(b.first_name);
      });

      setEmployeeLinkedUsers(linkedUsers);

      // Fetch admin-only users (no employee_id)
      const { data: adminData, error: adminError } = await supabase
        .from('app_users')
        .select('id, first_name, last_name, email')
        .eq('org_id', orgId)
        .is('employee_id', null)
        .order('first_name');

      if (adminError) throw adminError;
      setAdminOnlyUsers(adminData || []);

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
        <h3 className={sty.introTitle}>Users</h3>
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
                <th className={sty.headerCellActions}></th>
              </tr>
            </thead>
            <tbody>
              {employeeLinkedUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className={sty.emptyState}>
                    No leadership users configured yet. Click "Add User" to get started.
                  </td>
                </tr>
              ) : (
                employeeLinkedUsers.map((user) => {
                  const colorKey = getRoleColorKey(user.employee_role);
                  const roleColor = getRoleColor(colorKey);
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
                            {(!user.is_operator || canEditOperatorEmail) && (
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
                      <td className={sty.cellActions}>
                        {!user.is_operator && (
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
                <th className={sty.headerCellActions}></th>
              </tr>
            </thead>
            <tbody>
              {adminOnlyUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className={sty.emptyState}>
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
                          <IconButton
                            size="small"
                            onClick={() => handleEditClick(user.id, user.email, false)}
                            className={sty.editButton}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </div>
                      )}
                    </td>
                    <td className={sty.cell}>
                      <span className={sty.roleBadge} style={{ backgroundColor: '#e0e7ff', color: '#4f46e5' }}>
                        Administrator
                      </span>
                    </td>
                    <td className={sty.cellActions}>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteUser(user.id)}
                        className={sty.deleteButton}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
    </div>
  );
}

export default UsersTab;
