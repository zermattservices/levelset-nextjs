"use client";

import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  Avatar,
  Divider,
  TextField,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useAuth } from '@/lib/providers/AuthProvider';
import { createSupabaseClient } from '@/util/supabase/component';
import { format, parseISO } from 'date-fns';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const levelsetGreen = '#31664a'; // TODO: Use design token

export interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | undefined;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
      <Box sx={{ color: '#6b7280', mt: 0.25 }}>{icon}</Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </Typography>
        <Typography sx={{ fontFamily, fontSize: 15, fontWeight: 500, color: '#111827' }}>
          {value || '-'}
        </Typography>
      </Box>
    </Box>
  );
}

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const auth = useAuth();
  const supabase = React.useMemo(() => createSupabaseClient(), []);
  
  const [isEditing, setIsEditing] = React.useState(false);
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setFirstName(auth.first_name || '');
      setLastName(auth.last_name || '');
      setPhone(auth.phone || '');
      setIsEditing(false);
      setError(null);
      setSuccess(false);
    }
  }, [open, auth.first_name, auth.last_name, auth.phone]);

  const handleSave = async () => {
    if (!auth.appUser?.id) return;
    
    setSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      const { error: updateError } = await supabase
        .from('app_users')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          phone: phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', auth.appUser.id);

      if (updateError) throw updateError;
      
      setSuccess(true);
      setIsEditing(false);
      
      // Refresh the page to update auth context
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFirstName(auth.first_name || '');
    setLastName(auth.last_name || '');
    setPhone(auth.phone || '');
    setIsEditing(false);
    setError(null);
  };

  const formatHireDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'MMMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          overflow: 'hidden',
          maxWidth: 480,
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
        }}
      >
        <Typography sx={{ fontFamily, fontSize: 18, fontWeight: 600, color: '#111827' }}>
          My Profile
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: '#6b7280' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <Box sx={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Profile Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Avatar
            src={auth.profile_image}
            alt={auth.full_name || 'Profile'}
            sx={{
              width: 80,
              height: 80,
              border: `3px solid ${levelsetGreen}`,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            {auth.first_name?.[0] || auth.email?.[0]?.toUpperCase() || '?'}
          </Avatar>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography sx={{ fontFamily, fontSize: 22, fontWeight: 600, color: '#111827' }}>
              {auth.full_name || 'User'}
            </Typography>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: `${levelsetGreen}15`,
                color: levelsetGreen,
                fontFamily,
                fontSize: 13,
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: '20px',
                width: 'fit-content',
              }}
            >
              {auth.role || 'Team Member'}
            </Box>
          </Box>
        </Box>

        <Divider />

        {/* Status Messages */}
        {error && (
          <Alert severity="error" sx={{ borderRadius: '8px' }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ borderRadius: '8px' }}>
            Profile updated successfully! Refreshing...
          </Alert>
        )}

        {/* Profile Info */}
        {isEditing ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                fullWidth
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': { fontFamily },
                  '& .MuiInputLabel-root': { fontFamily },
                }}
              />
              <TextField
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                fullWidth
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': { fontFamily },
                  '& .MuiInputLabel-root': { fontFamily },
                }}
              />
            </Box>
            <TextField
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              fullWidth
              size="small"
              placeholder="(555) 555-5555"
              sx={{
                '& .MuiOutlinedInput-root': { fontFamily },
                '& .MuiInputLabel-root': { fontFamily },
              }}
            />
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 1 }}>
              <Button
                variant="outlined"
                onClick={handleCancel}
                disabled={saving}
                sx={{
                  fontFamily,
                  textTransform: 'none',
                  borderColor: '#e5e7eb',
                  color: '#6b7280',
                  '&:hover': {
                    borderColor: '#d1d5db',
                    backgroundColor: '#f9fafb',
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
                sx={{
                  fontFamily,
                  textTransform: 'none',
                  backgroundColor: levelsetGreen,
                  '&:hover': {
                    backgroundColor: '#285540',
                  },
                }}
              >
                {saving ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Save Changes'}
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <InfoRow
              icon={<PersonOutlineIcon sx={{ fontSize: 20 }} />}
              label="Full Name"
              value={auth.full_name}
            />
            <InfoRow
              icon={<EmailOutlinedIcon sx={{ fontSize: 20 }} />}
              label="Email"
              value={auth.email}
            />
            <InfoRow
              icon={<PhoneOutlinedIcon sx={{ fontSize: 20 }} />}
              label="Phone"
              value={auth.phone}
            />
            <InfoRow
              icon={<BadgeOutlinedIcon sx={{ fontSize: 20 }} />}
              label="Employee ID"
              value={auth.employee_id}
            />
            <InfoRow
              icon={<CalendarTodayOutlinedIcon sx={{ fontSize: 20 }} />}
              label="Hire Date"
              value={formatHireDate(auth.hire_date)}
            />
            
            <Box sx={{ mt: 1 }}>
              <Button
                variant="outlined"
                startIcon={<EditOutlinedIcon />}
                onClick={() => setIsEditing(true)}
                sx={{
                  fontFamily,
                  textTransform: 'none',
                  borderColor: levelsetGreen,
                  color: levelsetGreen,
                  '&:hover': {
                    borderColor: levelsetGreen,
                    backgroundColor: `${levelsetGreen}08`,
                  },
                }}
              >
                Edit Profile
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Dialog>
  );
}

export default ProfileModal;

