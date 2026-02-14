import * as React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PrintIcon from '@mui/icons-material/Print';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CheckIcon from '@mui/icons-material/Check';
import CircularProgress from '@mui/material/CircularProgress';
import sty from './MobileAppAccess.module.css';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { createSupabaseClient } from '@/util/supabase/component';
import { usePermissions, P } from '@/lib/providers/PermissionsProvider';

const fontFamily = '"Satoshi", sans-serif';
const STORAGE_DOMAIN = 'https://files.levelset.io';

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

const PasswordTextField = styled(TextField)(() => ({
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
  '& input[type="password"]': {
    fontSize: 24,
    letterSpacing: 4,
  },
}));

interface MobileAppAccessProps {
  disabled?: boolean;
}

export function MobileAppAccess({ disabled = false }: MobileAppAccessProps) {
  const { selectedLocationMobileToken, selectedLocationNumber, selectedLocationId } = useLocationContext();
  const [copied, setCopied] = React.useState(false);
  
  // QR image state - try to load from storage first
  const [qrImageUrl, setQrImageUrl] = React.useState<string | null>(null);
  const [qrLoading, setQrLoading] = React.useState(true);
  const [useLocalQr, setUseLocalQr] = React.useState(false);
  
  // Password state
  const [password, setPassword] = React.useState<string>('');
  const [originalPassword, setOriginalPassword] = React.useState<string>('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [passwordLoading, setPasswordLoading] = React.useState(true);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [pendingPassword, setPendingPassword] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);

  const supabase = React.useMemo(() => createSupabaseClient(), []);
  const { has } = usePermissions();
  
  // Permission checks
  const canViewPassword = has(P.MOBILE_VIEW_PASSWORD) && !disabled;
  const canChangePassword = has(P.MOBILE_CHANGE_PASSWORD) && !disabled;
  const canManageConfig = has(P.MOBILE_MANAGE_CONFIG) && !disabled;

  const pwaUrl = selectedLocationMobileToken 
    ? `https://app.levelset.io/mobile/${selectedLocationMobileToken}`
    : null;

  // Try to load QR image from storage
  React.useEffect(() => {
    async function loadQrImage() {
      if (!selectedLocationId) {
        setQrLoading(false);
        return;
      }

      setQrLoading(true);
      const qrUrl = `${STORAGE_DOMAIN}/storage/v1/object/public/location_assets/pwa/qr_img/${selectedLocationId}.png`;
      
      try {
        // Check if the QR image exists in storage
        const response = await fetch(qrUrl, { method: 'HEAD' });
        if (response.ok) {
          setQrImageUrl(qrUrl);
          setUseLocalQr(false);
        } else {
          // Fall back to local generation
          setUseLocalQr(true);
        }
      } catch (err) {
        console.log('Could not load QR from storage, using local generation');
        setUseLocalQr(true);
      } finally {
        setQrLoading(false);
      }
    }

    loadQrImage();
  }, [selectedLocationId]);

  // Fetch password
  React.useEffect(() => {
    async function fetchPassword() {
      if (!selectedLocationId) {
        setPasswordLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('locations')
          .select('discipline_password')
          .eq('id', selectedLocationId)
          .single();

        if (fetchError) throw fetchError;

        setPassword(data?.discipline_password || '');
        setOriginalPassword(data?.discipline_password || '');
      } catch (err) {
        console.error('Error fetching password:', err);
      } finally {
        setPasswordLoading(false);
      }
    }

    fetchPassword();
  }, [selectedLocationId, supabase]);

  const handleCopyUrl = async () => {
    if (!pwaUrl) return;
    try {
      await navigator.clipboard.writeText(pwaUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handlePrint = () => {
    // Open the PDF from storage bucket using custom domain
    if (selectedLocationId) {
      const pdfUrl = `${STORAGE_DOMAIN}/storage/v1/object/public/location_assets/pwa/info_pdf/${selectedLocationId}.pdf`;
      window.open(pdfUrl, '_blank');
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleSavePassword = () => {
    if (password !== originalPassword) {
      setPendingPassword(password);
      setShowConfirmModal(true);
    }
  };

  const confirmPasswordChange = async () => {
    if (!selectedLocationId) return;

    try {
      const { error: updateError } = await supabase
        .from('locations')
        .update({ discipline_password: pendingPassword })
        .eq('id', selectedLocationId);

      if (updateError) throw updateError;

      setOriginalPassword(pendingPassword);
      setShowConfirmModal(false);
    } catch (err) {
      console.error('Error updating password:', err);
      setError('Failed to update password');
    }
  };

  const cancelPasswordChange = () => {
    setShowConfirmModal(false);
    setPassword(originalPassword);
  };

  const hasPasswordChanges = password !== originalPassword;

  return (
    <div className={sty.container}>
      <div className={sty.intro}>
        <h3 className={sty.introTitle}>Mobile App Access</h3>
        <p className={sty.introDescription}>
          Use this QR code to give leaders access to the Levelset mobile app. 
          The mobile app allows leaders to complete forms like positional ratings and discipline 
          documentation on the go. When scanned, it will open the app directly for this location.
        </p>
      </div>

      <div className={sty.qrSection}>
        {pwaUrl ? (
          <>
            <div className={sty.qrContainer}>
              {qrLoading ? (
                <CircularProgress size={32} sx={{ color: '#31664a' /* TODO: Use design token */ }} />
              ) : qrImageUrl && !useLocalQr ? (
                // Use QR from storage (same as PDF)
                <img 
                  src={qrImageUrl} 
                  alt="QR Code" 
                  style={{ width: 200, height: 200 }}
                />
              ) : (
                // Fallback to local QR generation
                <QRCodeSVG
                  value={pwaUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                  fgColor="#31664a" /* TODO: Use design token */
                  imageSettings={{
                    src: '/Levelset Icon Non Trans.png',
                    x: undefined,
                    y: undefined,
                    height: 40,
                    width: 40,
                    excavate: true,
                  }}
                />
              )}
            </div>
            <div className={sty.qrInfo}>
              <p className={sty.locationLabel}>
                Location: <strong>{selectedLocationNumber || 'Unknown'}</strong>
              </p>
              <div className={sty.urlRow}>
                <p className={sty.urlText}>{pwaUrl}</p>
                <IconButton
                  size="small"
                  onClick={handleCopyUrl}
                  title="Copy link"
                  sx={{ color: copied ? '#31664a' /* TODO: Use design token */ : '#666' }}
                >
                  {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                </IconButton>
              </div>
            </div>
            <div className={sty.instructions}>
              <h4 className={sty.instructionsTitle}>How to use:</h4>
              <ol className={sty.instructionsList}>
                <li>Print this page or display it on a screen in the back office</li>
                <li>Have leaders scan the QR code with their phone camera</li>
                <li>They will be taken directly to the Levelset mobile app</li>
                <li>Leaders can add the app to their home screen for quick access</li>
              </ol>
            </div>
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              sx={{
                fontFamily,
                textTransform: 'none',
                borderColor: '#31664a' /* TODO: Use design token */,
                color: '#31664a' /* TODO: Use design token */,
                marginTop: 2,
                '&:hover': {
                  borderColor: '#31664a' /* TODO: Use design token */,
                  backgroundColor: 'rgba(49, 102, 74, 0.08)',
                },
              }}
            >
              Print This Page
            </Button>
          </>
        ) : (
          <div className={sty.noToken}>
            <p>No mobile token found for this location.</p>
            <p>Please contact support to enable mobile access.</p>
          </div>
        )}
      </div>

      {/* Discipline Password Section */}
      <div className={sty.passwordSection}>
        <h4 className={sty.sectionTitle}>Discipline Form Password</h4>
        <p className={sty.sectionDescription}>
          This password is required to access the discipline form in the mobile app. 
          Leaders must enter this password before they can submit a discipline form.
        </p>

        {error && <div className={sty.errorMessage}>{error}</div>}

        <div className={sty.passwordRow}>
          <PasswordTextField
            type={showPassword ? 'text' : 'password'}
            value={passwordLoading ? '' : password}
            onChange={handlePasswordChange}
            placeholder={passwordLoading ? 'Loading...' : 'Enter password'}
            disabled={passwordLoading || disabled}
            size="small"
            sx={{ width: 280 }}
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                  size="small"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              ),
            }}
          />
          {hasPasswordChanges && !disabled && (
            <Button
              variant="contained"
              onClick={handleSavePassword}
              sx={{
                fontFamily,
                textTransform: 'none',
                backgroundColor: '#31664a' /* TODO: Use design token */,
                '&:hover': {
                  backgroundColor: '#264d38',
                },
              }}
            >
              Save Password
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog 
        open={showConfirmModal} 
        onClose={cancelPasswordChange}
        PaperProps={{
          sx: {
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle sx={{ fontFamily }}>Confirm Password Change</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontFamily }}>
            Are you sure you want to change the discipline form password? 
            All leaders will need to use the new password to access the discipline form.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={cancelPasswordChange} 
            sx={{ 
              fontFamily, 
              textTransform: 'none',
              color: '#dc2626',
              backgroundColor: '#fef2f2',
              '&:hover': {
                backgroundColor: '#fee2e2',
              },
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmPasswordChange} 
            variant="contained"
            sx={{
              fontFamily,
              textTransform: 'none',
              backgroundColor: '#31664a' /* TODO: Use design token */,
              '&:hover': {
                backgroundColor: '#264d38',
              },
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default MobileAppAccess;
