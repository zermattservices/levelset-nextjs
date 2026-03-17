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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { createSupabaseClient } from '@/util/supabase/component';
import { getRoleColor, type OrgRole } from '@/lib/role-utils';
import type { ScheduleRule, EvaluationCadence } from '@/lib/evaluations/types';
import {
  fontFamily,
  dialogPaperSx,
  dialogTitleSx,
  dialogContentSx,
  dialogActionsSx,
  cancelButtonSx,
  primaryButtonSx,
  inputLabelSx,
  menuItemSx,
} from '@/components/forms/dialogStyles';

interface FormTemplate {
  id: string;
  name: string;
  is_active: boolean;
}

export interface ScheduleRuleDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  orgId: string;
  rule?: ScheduleRule | null;
}

const CADENCE_OPTIONS: { value: EvaluationCadence; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
];

export function ScheduleRuleDialog({
  open,
  onClose,
  onSaved,
  orgId,
  rule,
}: ScheduleRuleDialogProps) {
  const isEdit = Boolean(rule);

  const [formTemplates, setFormTemplates] = React.useState<FormTemplate[]>([]);
  const [roles, setRoles] = React.useState<OrgRole[]>([]);
  const [loadingData, setLoadingData] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Form state
  const [formTemplateId, setFormTemplateId] = React.useState<string>('');
  const [cadence, setCadence] = React.useState<EvaluationCadence>('quarterly');
  const [targetRoleIds, setTargetRoleIds] = React.useState<string[]>([]);
  const [reviewerRoleIds, setReviewerRoleIds] = React.useState<string[]>([]);

  // Load data when dialog opens
  React.useEffect(() => {
    if (!open || !orgId) return;

    let cancelled = false;

    async function loadData() {
      setLoadingData(true);
      setError(null);
      try {
        const supabase = createSupabaseClient();
        const [templatesRes, rolesResult] = await Promise.all([
          fetch(`/api/forms?org_id=${orgId}&form_type=evaluation`, { credentials: 'include' }),
          supabase
            .from('org_roles')
            .select('*')
            .eq('org_id', orgId)
            .order('hierarchy_level', { ascending: true }),
        ]);

        if (cancelled) return;

        if (!templatesRes.ok) throw new Error('Failed to load form templates');
        const templatesData = await templatesRes.json();
        if (rolesResult.error) throw new Error('Failed to load roles');

        // The API returns { templates: [...] }
        const allTemplates = templatesData.templates ?? [];
        const evalTemplates = allTemplates.filter(
          (t: any) => t.is_active
        );
        setFormTemplates(evalTemplates);
        setRoles(rolesResult.data as OrgRole[] ?? []);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load data');
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [open, orgId]);

  // Populate form state from rule prop when editing
  React.useEffect(() => {
    if (open) {
      if (rule) {
        setFormTemplateId(rule.form_template_id);
        setCadence(rule.cadence);
        setTargetRoleIds(rule.target_role_ids ?? []);
        setReviewerRoleIds(rule.reviewer_role_ids ?? []);
      } else {
        setFormTemplateId('');
        setCadence('quarterly');
        setTargetRoleIds([]);
        setReviewerRoleIds([]);
      }
      setError(null);
    }
  }, [open, rule]);

  const handleTargetRoleToggle = (roleId: string) => {
    setTargetRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleReviewerRoleToggle = (roleId: string) => {
    setReviewerRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSave = async () => {
    setError(null);

    if (!formTemplateId) {
      setError('Please select an evaluation form.');
      return;
    }
    if (targetRoleIds.length === 0) {
      setError('Please select at least one target role.');
      return;
    }
    if (reviewerRoleIds.length === 0) {
      setError('Please select at least one reviewer role.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        form_template_id: formTemplateId,
        target_role_ids: targetRoleIds,
        reviewer_role_ids: reviewerRoleIds,
        cadence,
        ...(isEdit && rule ? { id: rule.id } : {}),
      };

      const res = await fetch('/api/evaluations/schedule-rules', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save evaluation rule');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save evaluation rule');
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
        {isEdit ? 'Edit Evaluation Rule' : 'Create Evaluation Rule'}
        <IconButton size="small" onClick={onClose} aria-label="Close dialog">
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={dialogContentSx}>
        {loadingData ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} sx={{ color: 'var(--ls-color-brand)' }} />
          </Box>
        ) : (
          <>
            {/* Evaluation Form */}
            <div>
              <Typography
                sx={{
                  fontFamily,
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--ls-color-text-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  mb: 1,
                }}
              >
                Evaluation Form
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel sx={inputLabelSx}>Select form</InputLabel>
                <Select
                  value={formTemplateId}
                  onChange={(e) => setFormTemplateId(e.target.value)}
                  label="Select form"
                  sx={{
                    fontFamily,
                    fontSize: 14,
                    borderRadius: '8px',
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--ls-color-brand)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--ls-color-brand)',
                    },
                  }}
                >
                  {formTemplates.length === 0 ? (
                    <MenuItem disabled sx={menuItemSx}>
                      No active evaluation forms found
                    </MenuItem>
                  ) : (
                    formTemplates.map((tmpl) => (
                      <MenuItem key={tmpl.id} value={tmpl.id} sx={menuItemSx}>
                        {tmpl.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </div>

            <Divider />

            {/* Cadence */}
            <div>
              <Typography
                sx={{
                  fontFamily,
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--ls-color-text-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  mb: 1,
                }}
              >
                Cadence
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel sx={inputLabelSx}>Frequency</InputLabel>
                <Select
                  value={cadence}
                  onChange={(e) => setCadence(e.target.value as EvaluationCadence)}
                  label="Frequency"
                  sx={{
                    fontFamily,
                    fontSize: 14,
                    borderRadius: '8px',
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--ls-color-brand)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--ls-color-brand)',
                    },
                  }}
                >
                  {CADENCE_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value} sx={menuItemSx}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <Divider />

            {/* Target Roles */}
            <div>
              <Typography
                sx={{
                  fontFamily,
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--ls-color-text-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  mb: 0.5,
                }}
              >
                Target Roles
              </Typography>
              <Typography sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-muted)', mb: 1 }}>
                Which employee roles will be evaluated under this rule.
              </Typography>
              <RolesCheckboxList
                roles={roles}
                selectedIds={targetRoleIds}
                onToggle={handleTargetRoleToggle}
              />
            </div>

            <Divider />

            {/* Reviewer Roles */}
            <div>
              <Typography
                sx={{
                  fontFamily,
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--ls-color-text-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  mb: 0.5,
                }}
              >
                Reviewer Roles
              </Typography>
              <Typography sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-muted)', mb: 1 }}>
                Which roles are permitted to conduct these evaluations.
              </Typography>
              <RolesCheckboxList
                roles={roles}
                selectedIds={reviewerRoleIds}
                onToggle={handleReviewerRoleToggle}
              />
            </div>

            {error && (
              <Typography sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-destructive-base)' }}>
                {error}
              </Typography>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={dialogActionsSx}>
        <Button onClick={onClose} disabled={saving} sx={cancelButtonSx}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || loadingData}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
          sx={primaryButtonSx}
        >
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Rule'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Private helper ────────────────────────────────────────────────────────────

interface RolesCheckboxListProps {
  roles: OrgRole[];
  selectedIds: string[];
  onToggle: (roleId: string) => void;
}

function RolesCheckboxList({ roles, selectedIds, onToggle }: RolesCheckboxListProps) {
  if (roles.length === 0) {
    return (
      <Typography sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-muted)' }}>
        No roles configured for this organization.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {roles.map((role) => {
        const color = getRoleColor(role.color);
        return (
          <Box key={role.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, padding: '4px 0' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedIds.includes(role.id)}
                  onChange={() => onToggle(role.id)}
                  size="small"
                  sx={{ '&.Mui-checked': { color: 'var(--ls-color-brand)' } }}
                />
              }
              label={
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 10px',
                    borderRadius: '4px',
                    fontFamily,
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor: color.bg,
                    color: color.text,
                  }}
                >
                  {role.role_name}
                </span>
              }
            />
          </Box>
        );
      })}
    </Box>
  );
}
