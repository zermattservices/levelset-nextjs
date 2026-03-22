import * as React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { createSupabaseClient } from '@/util/supabase/component';
import {
  fontFamily,
  dialogPaperSx,
  dialogTitleSx,
  cancelButtonSx,
  primaryButtonSx,
} from '@/components/forms/dialogStyles';

export interface EvaluationDeleteMenuProps {
  submissionId: string;
  employeeName: string;
  orgId?: string | null;
  onDeleted: () => void;
}

export function EvaluationDeleteMenu({
  submissionId,
  employeeName,
  orgId,
  onDeleted,
}: EvaluationDeleteMenuProps) {
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  };

  const handleMenuClose = () => setMenuAnchor(null);

  const handleDeleteClick = () => {
    handleMenuClose();
    setDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      const supabase = createSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(
        `/api/forms/submissions/${encodeURIComponent(submissionId)}${orgId ? `?org_id=${encodeURIComponent(orgId)}` : ''}`,
        { method: 'DELETE', headers }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to delete');
      }

      setDialogOpen(false);
      onDeleted();
    } catch (err) {
      console.error('[EvaluationDeleteMenu] Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={handleMenuOpen}
        sx={{
          color: 'var(--ls-color-muted)',
          '&:hover': { color: 'var(--ls-color-neutral-soft-foreground)' },
        }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            fontFamily,
            borderRadius: 2,
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
            border: '1px solid var(--ls-color-muted-border)',
            minWidth: 180,
          },
        }}
      >
        <MenuItem
          onClick={handleDeleteClick}
          sx={{ fontFamily, fontSize: 13, py: 1, px: 2, color: 'var(--ls-color-destructive-base)' }}
        >
          <ListItemIcon>
            <DeleteForeverOutlinedIcon sx={{ fontSize: 16, color: 'var(--ls-color-destructive-base)' }} />
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontFamily, fontSize: 13, color: 'var(--ls-color-destructive-base)' }}>
            Delete Evaluation
          </ListItemText>
        </MenuItem>
      </Menu>

      <Dialog
        open={dialogOpen}
        onClose={() => !deleting && setDialogOpen(false)}
        onClick={(e) => e.stopPropagation()}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { ...dialogPaperSx } }}
      >
        <DialogTitle sx={{ ...dialogTitleSx, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon sx={{ color: 'var(--ls-color-destructive-base)', fontSize: 22 }} />
          Delete Evaluation
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily, fontSize: 14, color: 'var(--ls-color-neutral-soft-foreground)', mb: 2 }}>
            Are you sure you want to delete the evaluation for <strong>{employeeName}</strong>?
          </Typography>
          <Box sx={{
            p: 2,
            borderRadius: '8px',
            backgroundColor: 'var(--ls-color-destructive-soft)',
            border: '1px solid var(--ls-color-destructive-border)',
          }}>
            <Typography sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-destructive-base)', fontWeight: 600 }}>
              This action is irreversible. The following will be permanently deleted:
            </Typography>
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              <li>
                <Typography sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-destructive-base)' }}>
                  The evaluation record and score
                </Typography>
              </li>
              <li>
                <Typography sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-destructive-base)' }}>
                  The associated form submission and response data
                </Typography>
              </li>
            </ul>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            disabled={deleting}
            sx={cancelButtonSx}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDeleteConfirm}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{
              ...primaryButtonSx,
              backgroundColor: 'var(--ls-color-destructive-base)',
              '&:hover': { backgroundColor: 'var(--ls-color-destructive-hover)', boxShadow: 'none' },
            }}
          >
            {deleting ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
