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

interface AppUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  permissions: string | null;
  employee_id: string | null;
}

interface UsersTabProps {
  orgId: string | null;
  currentUserRole?: string | null;
}

export function UsersTab({ orgId, currentUserRole }: UsersTabProps) {
  const { selectedLocationId } = useLocationContext();
  
  // Check if current user can edit operator emails (only Operator or Levelset Admin)
  const canEditOperatorEmail = currentUserRole === 'Operator' || currentUserRole === 'Levelset Admin';
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editEmail, setEditEmail] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [addModalOpen, setAddModalOpen] = React.useState(false);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Fetch users for this organization
  const fetchUsers = React.useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('app_users')
        .select('id, first_name, last_name, email, role, permissions, employee_id')
        .eq('org_id', orgId)
        .order('permissions', { ascending: false }) // Operator first
        .order('first_name');

      if (fetchError) throw fetchError;
      setUsers(data || []);
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

  const handleEditClick = (user: AppUser) => {
    // Don't allow editing operator email unless current user is Operator or Levelset Admin
    if (user.permissions === 'operator' && !canEditOperatorEmail) {
      return;
    }
    setEditingId(user.id);
    setEditEmail(user.email);
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

      setUsers(prev => prev.map(u => 
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

  const handleDeleteUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user || user.permissions === 'operator') return;

    if (!confirm(`Are you sure you want to remove ${user.first_name} ${user.last_name} from dashboard access?`)) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('app_users')
        .delete()
        .eq('id', userId);

      if (deleteError) throw deleteError;

      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to remove user');
    }
  };

  const handleUserCreated = () => {
    fetchUsers();
    setAddModalOpen(false);
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
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className={sty.emptyState}>
                  No users configured yet. Click "Add User" to get started.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className={sty.row}>
                  <td className={sty.cell}>
                    <span className={sty.userName}>
                      {user.first_name} {user.last_name}
                    </span>
                    {user.permissions === 'operator' && (
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
                        {/* Only show edit button if user is not operator, or if current user can edit operator emails */}
                        {(user.permissions !== 'operator' || canEditOperatorEmail) && (
                          <IconButton
                            size="small"
                            onClick={() => handleEditClick(user)}
                            className={sty.editButton}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        )}
                      </div>
                    )}
                  </td>
                  <td className={sty.cell}>
                    <span className={sty.roleBadge}>{user.role}</span>
                  </td>
                  <td className={sty.cellActions}>
                    {user.permissions !== 'operator' && (
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

      <Button
        variant="outlined"
        size="small"
        startIcon={<AddIcon />}
        onClick={() => setAddModalOpen(true)}
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

      <AddUserModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onUserCreated={handleUserCreated}
        orgId={orgId}
        locationId={selectedLocationId}
      />
    </div>
  );
}

export default UsersTab;
