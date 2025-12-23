import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import IconButton from '@mui/material/IconButton';
import { styled } from '@mui/material/styles';
import { createSupabaseClient } from '@/util/supabase/component';
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
  '& .MuiInputLabel-root': {
    fontFamily,
  },
}));

interface Employee {
  id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  email: string | null;
}

interface RoleHierarchy {
  role_name: string;
  hierarchy_level: number;
  color?: string;
}

interface LocationInfo {
  id: string;
  location_number: string;
  name: string;
}

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onUserCreated: () => void;
  orgId: string | null;
  locationId: string | null;
}

// Simple check if email looks like a Gmail address (fallback if MX lookup failed)
function looksLikeGmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain === 'gmail.com' || domain === 'googlemail.com';
}

// Generate a random alphanumeric password
function generateTempPassword(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Google Sign In Button (display only, no functionality)
function GoogleSignInButton() {
  return (
    <button
      type="button"
      disabled
      style={{
        width: '100%',
        padding: '12px 16px',
        fontSize: '14px',
        fontWeight: '500',
        backgroundColor: '#ffffff',
        color: '#111827',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        cursor: 'default',
        fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Sign in with Google
    </button>
  );
}

export function AddUserModal({ open, onClose, onUserCreated, orgId, locationId }: AddUserModalProps) {
  const [step, setStep] = React.useState<'select' | 'credentials'>('select');
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [roles, setRoles] = React.useState<RoleHierarchy[]>([]);
  const [orgLocations, setOrgLocations] = React.useState<LocationInfo[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = React.useState<Set<string>>(new Set());
  const [existingUserEmployeeIds, setExistingUserEmployeeIds] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [emailError, setEmailError] = React.useState<string | null>(null);

  // Credentials display state
  const [createdEmail, setCreatedEmail] = React.useState('');
  const [createdPassword, setCreatedPassword] = React.useState('');
  const [copiedEmail, setCopiedEmail] = React.useState(false);
  const [copiedPassword, setCopiedPassword] = React.useState(false);
  const [isGoogleEmail, setIsGoogleEmail] = React.useState(false);
  const [googleCheckFailed, setGoogleCheckFailed] = React.useState(false);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Check if this is a multi-location org
  const isMultiLocation = orgLocations.length > 1;

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setStep('select');
      setSelectedEmployeeId('');
      setEmail('');
      setEmailError(null);
      setError(null);
      setCreatedEmail('');
      setCreatedPassword('');
      // Reset location selection - will be populated with all locations on data fetch
      setSelectedLocationIds(new Set());
    }
  }, [open]);

  // Fetch employees, locations, and existing users
  React.useEffect(() => {
    async function fetchData() {
      if (!open || !locationId || !orgId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch all locations for this org
        const { data: locationsData, error: locationsError } = await supabase
          .from('locations')
          .select('id, location_number, name')
          .eq('org_id', orgId)
          .order('location_number');

        if (locationsError) throw locationsError;
        setOrgLocations(locationsData || []);
        
        // Default: select all locations
        if (locationsData && locationsData.length > 0) {
          setSelectedLocationIds(new Set(locationsData.map(l => l.id)));
        }

        // Fetch role hierarchy from org_roles table
        const { data: rolesData, error: rolesError } = await supabase
          .from('org_roles')
          .select('role_name, hierarchy_level, color')
          .eq('org_id', orgId)
          .lte('hierarchy_level', 2) // Only levels 0, 1, 2
          .order('hierarchy_level');

        if (rolesError) throw rolesError;
        setRoles(rolesData || []);

        // Get role names with hierarchy level 0, 1, or 2
        const eligibleRoles = (rolesData || []).map(r => r.role_name);

        // Fetch employees with these roles
        const { data: employeesData, error: employeesError } = await supabase
          .from('employees')
          .select('id, full_name, first_name, last_name, role, email')
          .eq('location_id', locationId)
          .eq('active', true)
          .in('role', eligibleRoles)
          .order('full_name');

        if (employeesError) throw employeesError;
        setEmployees(employeesData || []);

        // Fetch existing app_users to know which employees already have accounts
        const { data: usersData, error: usersError } = await supabase
          .from('app_users')
          .select('employee_id')
          .eq('org_id', orgId)
          .not('employee_id', 'is', null);

        if (usersError) throw usersError;
        const existingIds = new Set((usersData || []).map(u => u.employee_id).filter(Boolean));
        setExistingUserEmployeeIds(existingIds);

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load employees');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [open, locationId, orgId, supabase]);

  // Filter out employees who already have accounts
  const availableEmployees = React.useMemo(() => {
    return employees.filter(e => !existingUserEmployeeIds.has(e.id));
  }, [employees, existingUserEmployeeIds]);

  // Get selected employee
  const selectedEmployee = React.useMemo(() => {
    return employees.find(e => e.id === selectedEmployeeId);
  }, [employees, selectedEmployeeId]);

  // Pre-fill email if employee has one
  React.useEffect(() => {
    if (selectedEmployee?.email) {
      setEmail(selectedEmployee.email);
    } else {
      setEmail('');
    }
    setEmailError(null);
  }, [selectedEmployee]);

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value.trim()) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (value) validateEmail(value);
  };

  // Handle location checkbox toggle
  const handleLocationToggle = (locationId: string) => {
    setSelectedLocationIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(locationId)) {
        newSet.delete(locationId);
      } else {
        newSet.add(locationId);
      }
      return newSet;
    });
  };

  const handleCreateUser = async () => {
    if (!selectedEmployee || !validateEmail(email)) return;

    // For multi-location orgs, at least one location must be selected
    if (isMultiLocation && selectedLocationIds.size === 0) {
      setError('Please select at least one location');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const tempPassword = generateTempPassword(12);

      // Call API to create auth user
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: tempPassword,
          firstName: selectedEmployee.first_name || selectedEmployee.full_name?.split(' ')[0] || '',
          lastName: selectedEmployee.last_name || selectedEmployee.full_name?.split(' ').slice(1).join(' ') || '',
          role: selectedEmployee.role || 'User',
          orgId,
          employeeId: selectedEmployee.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      // Save location access for multi-location orgs
      if (isMultiLocation && result.userId) {
        const locationAccessRecords = Array.from(selectedLocationIds).map(locId => ({
          user_id: result.userId,
          location_id: locId,
        }));

        const { error: accessError } = await supabase
          .from('user_location_access')
          .insert(locationAccessRecords);

        if (accessError) {
          console.error('Error saving location access:', accessError);
          // Don't fail the whole operation, user was created successfully
        }
      }

      // Success - show credentials
      setCreatedEmail(email.trim());
      setCreatedPassword(tempPassword);
      setIsGoogleEmail(result.isGoogleEmail || false);
      setGoogleCheckFailed(result.googleCheckFailed || false);
      setStep('credentials');

    } catch (err: any) {
      console.error('Error creating user:', err);
      setError(err.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (text: string, type: 'email' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'email') {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      } else {
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClose = () => {
    if (step === 'credentials') {
      onUserCreated();
    }
    onClose();
  };

  const getRoleHierarchyLevel = (roleName: string | null): number | null => {
    if (!roleName) return null;
    const role = roles.find(r => r.role_name === roleName);
    return role?.hierarchy_level ?? null;
  };

  const getRoleColorKey = (roleName: string | null): string | undefined => {
    if (!roleName) return undefined;
    const role = roles.find(r => r.role_name === roleName);
    return role?.color;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        }
      }}
    >
      <DialogTitle sx={{ fontFamily, fontWeight: 600 }}>
        {step === 'select' ? 'Add Levelset Dashboard User' : 'User Created Successfully'}
      </DialogTitle>
      <DialogContent>
        {step === 'select' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} sx={{ color: '#31664a' }} />
              </Box>
            ) : (
              <>
                {error && (
                  <Typography sx={{ color: '#dc2626', fontSize: 14, fontFamily }}>
                    {error}
                  </Typography>
                )}

                <StyledTextField
                  select
                  label="Select Employee"
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  fullWidth
                  helperText="Only the Operator and the next 2 levels of leadership can have access to the Levelset dashboard at this time"
                  InputLabelProps={{ shrink: true }}
                >
                  <MenuItem value="" disabled>
                    <em>Select an employee...</em>
                  </MenuItem>
                  {availableEmployees.map((emp) => {
                    const colorKey = getRoleColorKey(emp.role);
                    const roleColor = getRoleColor(colorKey);
                    return (
                      <MenuItem key={emp.id} value={emp.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          <span>{emp.full_name || `${emp.first_name} ${emp.last_name}`}</span>
                          {emp.role && (
                            <Box
                              component="span"
                              sx={{
                                ml: 'auto',
                                px: 1,
                                py: 0.25,
                                fontSize: 11,
                                fontWeight: 600,
                                color: roleColor.text,
                                backgroundColor: roleColor.bg,
                                borderRadius: 1,
                              }}
                            >
                              {emp.role}
                            </Box>
                          )}
                        </Box>
                      </MenuItem>
                    );
                  })}
                  {availableEmployees.length === 0 && (
                    <MenuItem disabled>
                      <em>No eligible employees available</em>
                    </MenuItem>
                  )}
                </StyledTextField>

                {selectedEmployee && (
                  <>
                    <StyledTextField
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={handleEmailChange}
                      fullWidth
                      error={!!emailError}
                      helperText={emailError || 'This email will be used for login credentials'}
                      required
                    />

                    {/* Location access checkboxes - only for multi-location orgs */}
                    {isMultiLocation && (
                      <Box>
                        <Typography sx={{ fontFamily, fontSize: 14, fontWeight: 500, color: '#111827', mb: 1 }}>
                          Location Access
                        </Typography>
                        <Typography sx={{ fontFamily, fontSize: 13, color: '#6b7280', mb: 1.5 }}>
                          Select which locations this user can access
                        </Typography>
                        <FormGroup sx={{ 
                          backgroundColor: '#f9fafb', 
                          borderRadius: 2, 
                          p: 2,
                          border: '1px solid #e5e7eb',
                        }}>
                          {orgLocations.map(loc => (
                            <FormControlLabel
                              key={loc.id}
                              control={
                                <Checkbox
                                  checked={selectedLocationIds.has(loc.id)}
                                  onChange={() => handleLocationToggle(loc.id)}
                                  sx={{
                                    color: '#31664a',
                                    '&.Mui-checked': { color: '#31664a' },
                                  }}
                                />
                              }
                              label={
                                <Typography sx={{ fontFamily, fontSize: 14 }}>
                                  {loc.name} ({loc.location_number})
                                </Typography>
                              }
                            />
                          ))}
                        </FormGroup>
                      </Box>
                    )}
                  </>
                )}
              </>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <Typography sx={{ fontFamily, fontSize: 14, color: '#4b5563' }}>
              The user account has been created. Share these login credentials with the new user:
            </Typography>

            <Box sx={{ 
              backgroundColor: '#f9fafb', 
              borderRadius: 2, 
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}>
              <Box>
                <Typography sx={{ fontFamily, fontSize: 12, color: '#6b7280', mb: 0.5 }}>
                  Email
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontFamily, fontSize: 14, fontWeight: 500, color: '#111827', flex: 1 }}>
                    {createdEmail}
                  </Typography>
                  <IconButton size="small" onClick={() => handleCopy(createdEmail, 'email')}>
                    {copiedEmail ? <CheckIcon fontSize="small" sx={{ color: '#31664a' }} /> : <ContentCopyIcon fontSize="small" />}
                  </IconButton>
                </Box>
              </Box>

              <Box>
                <Typography sx={{ fontFamily, fontSize: 12, color: '#6b7280', mb: 0.5 }}>
                  Temporary Password
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ 
                    fontFamily: 'monospace', 
                    fontSize: 14, 
                    fontWeight: 500, 
                    color: '#111827',
                    backgroundColor: '#ffffff',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    border: '1px solid #e5e7eb',
                    flex: 1,
                  }}>
                    {createdPassword}
                  </Typography>
                  <IconButton size="small" onClick={() => handleCopy(createdPassword, 'password')}>
                    {copiedPassword ? <CheckIcon fontSize="small" sx={{ color: '#31664a' }} /> : <ContentCopyIcon fontSize="small" />}
                  </IconButton>
                </Box>
              </Box>
            </Box>

            {isGoogleEmail && (
              <Box sx={{ 
                backgroundColor: '#f0fdf4', 
                borderRadius: 2, 
                p: 2,
                border: '1px solid #bbf7d0',
              }}>
                <Typography sx={{ fontFamily, fontSize: 14, color: '#166534', mb: 2 }}>
                  This user has a Google email address. They can also sign in using the Google button on the login page:
                </Typography>
                <GoogleSignInButton />
              </Box>
            )}

            {googleCheckFailed && looksLikeGmail(createdEmail) && (
              <Box sx={{ 
                backgroundColor: '#f0fdf4', 
                borderRadius: 2, 
                p: 2,
                border: '1px solid #bbf7d0',
              }}>
                <Typography sx={{ fontFamily, fontSize: 14, color: '#166534', mb: 2 }}>
                  This appears to be a Gmail address. The user can also sign in using the Google button on the login page:
                </Typography>
                <GoogleSignInButton />
              </Box>
            )}

            {googleCheckFailed && !looksLikeGmail(createdEmail) && (
              <Box sx={{ 
                backgroundColor: '#fffbeb', 
                borderRadius: 2, 
                p: 2,
                border: '1px solid #fde68a',
              }}>
                <Typography sx={{ fontFamily, fontSize: 14, color: '#92400e', mb: 2 }}>
                  If this is a Google Workspace (Gmail for Business) email, the user can also sign in using the Google button:
                </Typography>
                <GoogleSignInButton />
              </Box>
            )}

            <Typography sx={{ fontFamily, fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>
              Note: Password reset functionality is not yet available. Please save these credentials securely.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {step === 'select' ? (
          <>
            <Button
              onClick={handleClose}
              sx={{
                fontFamily,
                textTransform: 'none',
                color: '#6b7280',
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              variant="contained"
              disabled={!selectedEmployeeId || !email || !!emailError || creating}
              sx={{
                fontFamily,
                textTransform: 'none',
                backgroundColor: '#31664a',
                '&:hover': {
                  backgroundColor: '#264d38',
                },
                '&.Mui-disabled': {
                  backgroundColor: '#e5e7eb',
                },
              }}
            >
              {creating ? 'Creating...' : 'Create User'}
            </Button>
          </>
        ) : (
          <Button
            onClick={handleClose}
            variant="contained"
            sx={{
              fontFamily,
              textTransform: 'none',
              backgroundColor: '#31664a',
              '&:hover': {
                backgroundColor: '#264d38',
              },
            }}
          >
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default AddUserModal;
