import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Checkbox,
  FormControlLabel,
  Switch,
  Divider,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { createSupabaseClient } from '@/util/supabase/component';
import { useAuth } from '@/lib/providers/AuthProvider';
import { getRoleColor, type OrgRole } from '@/lib/role-utils';
import { SectionManager } from './SectionManager';
import {
  fontFamily,
  dialogPaperSx,
  dialogTitleSx,
  dialogContentSx,
  dialogActionsSx,
  cancelButtonSx,
  primaryButtonSx,
} from '../dialogStyles';
import sty from './EvaluationSettingsModal.module.css';

interface EvaluationSection {
  id: string;
  name: string;
  name_es?: string;
  order: number;
  is_predefined: boolean;
}

interface EvaluationSettings {
  applicable_roles?: string[];
  notifications?: {
    notify_on_submit?: boolean;
  };
  sections?: EvaluationSection[];
  questions?: Record<string, any>;
  role_level?: number;
}

interface EvaluationSettingsModalProps {
  open: boolean;
  onClose: () => void;
  evaluationSettings: EvaluationSettings;
  onSave: (settings: EvaluationSettings) => Promise<void>;
}

const DEFAULT_SECTIONS: EvaluationSection[] = [
  { id: 'sec_leadership', name: 'Leadership Culture', order: 0, is_predefined: true },
  { id: 'sec_execution', name: 'Execution of Core Strategy', order: 1, is_predefined: true },
  { id: 'sec_win', name: "What's Important Now", order: 2, is_predefined: true },
  { id: 'sec_results', name: 'Business Results', order: 3, is_predefined: true },
];

export function EvaluationSettingsModal({
  open,
  onClose,
  evaluationSettings,
  onSave,
}: EvaluationSettingsModalProps) {
  const auth = useAuth();
  const [roles, setRoles] = React.useState<OrgRole[]>([]);
  const [rolesLoading, setRolesLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [applicableRoles, setApplicableRoles] = React.useState<string[]>([]);
  const [notifyOnSubmit, setNotifyOnSubmit] = React.useState(false);
  const [sections, setSections] = React.useState<EvaluationSection[]>([]);

  React.useEffect(() => {
    if (!open || !auth.org_id) return;
    const fetchRoles = async () => {
      setRolesLoading(true);
      try {
        const supabase = createSupabaseClient();
        const { data } = await supabase
          .from('org_roles')
          .select('*')
          .eq('org_id', auth.org_id)
          .order('hierarchy_level', { ascending: true });
        if (data) setRoles(data as OrgRole[]);
      } catch {
        // silently handle
      } finally {
        setRolesLoading(false);
      }
    };
    fetchRoles();
  }, [open, auth.org_id]);

  React.useEffect(() => {
    if (open) {
      setApplicableRoles(evaluationSettings.applicable_roles || []);
      setNotifyOnSubmit(evaluationSettings.notifications?.notify_on_submit ?? false);
      setSections(
        evaluationSettings.sections?.length
          ? evaluationSettings.sections
          : DEFAULT_SECTIONS
      );
    }
  }, [open, evaluationSettings]);

  const lockedRoleId = React.useMemo(() => {
    if (roles.length === 0) return null;
    const sorted = [...roles].sort((a, b) => a.hierarchy_level - b.hierarchy_level);
    return sorted[0].id;
  }, [roles]);

  const handleRoleToggle = (roleId: string) => {
    if (roleId === lockedRoleId) return;
    setApplicableRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const finalRoles = lockedRoleId && !applicableRoles.includes(lockedRoleId)
        ? [lockedRoleId, ...applicableRoles]
        : applicableRoles;
      await onSave({
        ...evaluationSettings,
        applicable_roles: finalRoles,
        notifications: { notify_on_submit: notifyOnSubmit },
        sections,
      });
      onClose();
    } catch {
      // error handled by parent snackbar
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: dialogPaperSx }}
    >
      <DialogTitle sx={dialogTitleSx}>
        Evaluation Settings
        <IconButton size="small" onClick={onClose} aria-label="Close settings">
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={dialogContentSx}>
        {/* Applicable Roles */}
        <div className={sty.modalSection}>
          <h4 className={sty.modalSectionTitle}>Applicable Roles</h4>
          <p className={sty.modalSectionDescription}>
            Select which roles this evaluation applies to.
          </p>
          {rolesLoading ? (
            <CircularProgress size={20} />
          ) : (
            <div className={sty.rolesGrid}>
              {roles.map((role) => {
                const isLocked = role.id === lockedRoleId;
                const isChecked = isLocked || applicableRoles.includes(role.id);
                const color = getRoleColor(role.color);
                return (
                  <div key={role.id} className={sty.roleRow}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isChecked}
                          disabled={isLocked}
                          onChange={() => handleRoleToggle(role.id)}
                          size="small"
                          sx={{
                            '&.Mui-checked': { color: 'var(--ls-color-brand)' },
                          }}
                        />
                      }
                      label={
                        <span
                          className={sty.roleChip}
                          style={{ backgroundColor: color.bg, color: color.text }}
                        >
                          {role.role_name}
                        </span>
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Divider />

        {/* Notifications */}
        <div className={sty.modalSection}>
          <h4 className={sty.modalSectionTitle}>Notifications</h4>
          <div className={sty.notificationRow}>
            <span className={sty.notificationLabel}>Notify when evaluation is submitted</span>
            <Switch
              checked={notifyOnSubmit}
              onChange={(e) => setNotifyOnSubmit(e.target.checked)}
              size="small"
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: 'var(--ls-color-brand)',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: 'var(--ls-color-brand)',
                },
              }}
            />
          </div>
          <span className={sty.notificationHint}>
            Recipient configuration coming soon
          </span>
        </div>

        <Divider />

        {/* Scoring Sections */}
        <div className={sty.modalSection}>
          <h4 className={sty.modalSectionTitle}>Scoring Sections</h4>
          <p className={sty.modalSectionDescription}>
            Manage the sections used to group and score evaluation questions.
          </p>
          <SectionManager
            sections={sections}
            onSectionsChange={setSections}
          />
        </div>
      </DialogContent>

      <DialogActions sx={dialogActionsSx}>
        <Button onClick={onClose} disabled={saving} sx={cancelButtonSx}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
          sx={primaryButtonSx}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
