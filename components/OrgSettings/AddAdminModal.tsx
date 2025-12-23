import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
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

interface LocationInfo {
  id: string;
  location_number: string;
  name: string;
}

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

interface AddAdminModalProps {
  open: boolean;
  onClose: () => void;
  onUserCreated: () => void;
  orgId: string | null;
}

// Simple check if email looks like a Gmail address
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

// Google Sign In Button (display only)
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

export function AddAdminModal({ open, onClose, onUserCreated, orgId }: AddAdminModalProps) {
  const [step, setStep] = React.useState<'form' | 'credentials'>('form');
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [emailError, setEmailError] = React.useState<string | null>(null);
  
  // Location state
  const [orgLocations, setOrgLocations] = React.useState<LocationInfo[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = React.useState<Set<string>>(new Set());
  const [loadingLocations, setLoadingLocations] = React.useState(true);

  // Credentials display state
  const [createdEmail, setCreatedEmail] = React.useState('');
  const [createdPassword, setCreatedPassword] = React.useState('');
  const [copiedEmail, setCopiedEmail] = React.useState(false);
  const [copiedPassword, setCopiedPassword] = React.useState(false);
  const [isGoogleEmail, setIsGoogleEmail] = React.useState(false);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Check if this is a multi-location org
  const isMultiLocation = orgLocations.length > 1;

  // Fetch locations when modal opens
  React.useEffect(() => {
    async function fetchLocations() {
      if (!open || !orgId) {
        setLoadingLocations(false);
        return;
      }

      setLoadingLocations(true);
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('id, location_number, name')
          .eq('org_id', orgId)
          .order('location_number');

        if (error) throw error;
        setOrgLocations(data || []);
        
        // Default: select all locations
        if (data && data.length > 0) {
          setSelectedLocationIds(new Set(data.map(l => l.id)));
        }
      } catch (err) {
        console.error('Error fetching locations:', err);
      } finally {
        setLoadingLocations(false);
      }
    }

    fetchLocations();
  }, [open, orgId, supabase]);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setStep('form');
      setFirstName('');
      setLastName('');
      setEmail('');
      setEmailError(null);
      setError(null);
      setCreatedEmail('');
      setCreatedPassword('');
      setSelectedLocationIds(new Set());
    }
  }, [open]);

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
    if (!firstName.trim() || !lastName.trim() || !validateEmail(email) || !orgId) return;

    // For multi-location orgs, at least one location must be selected
    if (isMultiLocation && selectedLocationIds.size === 0) {
      setError('Please select at least one location');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const tempPassword = generateTempPassword(12);

      // Call API to create auth user (admin-only, no employee)
      const response = await fetch('/api/admin/create-admin-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: tempPassword,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          orgId,
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
      setIsGoogleEmail(result.isGoogleEmail || looksLikeGmail(email.trim()));
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

  const isFormValid = firstName.trim() && lastName.trim() && email.trim() && !emailError;

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
        {step === 'form' ? 'Add Administrative User' : 'User Created Successfully'}
      </DialogTitle>
      <DialogContent>
        {step === 'form' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            {error && (
              <Typography sx={{ color: '#dc2626', fontSize: 14, fontFamily }}>
                {error}
              </Typography>
            )}

            <Typography sx={{ fontFamily, fontSize: 14, color: '#6b7280' }}>
              Create a dashboard user who is not linked to an employee record. 
              This is useful for administrative staff who need access but don&apos;t work at a specific location.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <StyledTextField
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                fullWidth
                required
              />
              <StyledTextField
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                fullWidth
                required
              />
            </Box>

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
            {isMultiLocation && !loadingLocations && (
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

            <Typography sx={{ fontFamily, fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>
              Note: Password reset functionality is not yet available. Please save these credentials securely.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {step === 'form' ? (
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
              disabled={!isFormValid || creating}
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
              {creating ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Create User'}
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

export default AddAdminModal;
