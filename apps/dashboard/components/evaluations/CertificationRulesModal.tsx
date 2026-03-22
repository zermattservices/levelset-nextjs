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
  Switch,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import { createSupabaseClient } from '@/util/supabase/component';
import { getRoleColor, type OrgRole } from '@/lib/role-utils';
import type { CertificationEvaluationRule } from '@/lib/evaluations/types';
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

export interface CertificationRulesModalProps {
  open: boolean;
  onClose: () => void;
  locationId: string;
  orgId: string;
  getAccessToken?: () => Promise<string | null>;
}

const TRIGGER_OPTIONS = [
  { value: 'certification_pending', label: 'Certification — Pending' },
  { value: 'certification_pip', label: 'Certification — PIP' },
];

export function CertificationRulesModal({
  open,
  onClose,
  locationId,
  orgId,
  getAccessToken,
}: CertificationRulesModalProps) {
  const [rules, setRules] = React.useState<CertificationEvaluationRule[]>([]);
  const [formTemplates, setFormTemplates] = React.useState<FormTemplate[]>([]);
  const [roles, setRoles] = React.useState<OrgRole[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Get access token — use prop if provided, otherwise fetch inline
  const resolveToken = React.useCallback(async (): Promise<string | null> => {
    if (getAccessToken) return getAccessToken();
    try {
      const supabase = createSupabaseClient();
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || null;
    } catch {
      return null;
    }
  }, [getAccessToken]);

  // Create-form state
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [formTemplateId, setFormTemplateId] = React.useState<string>('');
  const [targetRoleIds, setTargetRoleIds] = React.useState<string[]>([]);
  const [reviewerRoleIds, setReviewerRoleIds] = React.useState<string[]>([]);
  const [triggerOn, setTriggerOn] = React.useState<string[]>([]);

  // Load all data when dialog opens
  React.useEffect(() => {
    if (!open || !orgId) return;

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const supabase = createSupabaseClient();

        // Build auth headers
        const headers: Record<string, string> = {};
        const token = await resolveToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const [rulesRes, templatesJsonRes, rolesRes] = await Promise.all([
          fetch(
            `/api/evaluations/certification-rules?org_id=${encodeURIComponent(orgId)}&location_id=${encodeURIComponent(locationId)}`,
            { headers }
          ),
          fetch(`/api/forms?org_id=${encodeURIComponent(orgId)}&form_type=evaluation`, { headers }),
          supabase
            .from('org_roles')
            .select('*')
            .eq('org_id', orgId)
            .order('hierarchy_level', { ascending: true }),
        ]);

        if (cancelled) return;

        if (!rulesRes.ok) {
          throw new Error('Failed to load certification rules');
        }
        if (!templatesJsonRes.ok) {
          throw new Error('Failed to load form templates');
        }
        const rulesData = await rulesRes.json();
        const templatesData = await templatesJsonRes.json();
        if (rolesRes.error) throw new Error('Failed to load roles');

        // API returns array directly, not { templates: [...] }
        const allTemplates = Array.isArray(templatesData) ? templatesData : (templatesData.templates ?? []);
        const evalTemplates = allTemplates.filter(
          (t: any) => t.is_active
        );

        setRules(rulesData.rules ?? []);
        setFormTemplates(evalTemplates);
        setRoles((rolesRes.data as OrgRole[]) ?? []);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [open, orgId, locationId]);

  // Reset create form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setShowCreateForm(false);
      resetCreateForm();
    }
  }, [open]);

  function resetCreateForm() {
    setFormTemplateId('');
    setTargetRoleIds([]);
    setReviewerRoleIds([]);
    setTriggerOn([]);
    setError(null);
  }

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

  const handleTriggerToggle = (trigger: string) => {
    setTriggerOn((prev) =>
      prev.includes(trigger) ? prev.filter((t) => t !== trigger) : [...prev, trigger]
    );
  };

  const handleCreate = async () => {
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
    if (triggerOn.length === 0) {
      setError('Please select at least one trigger condition.');
      return;
    }

    setSaving(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = await resolveToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/evaluations/certification-rules', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          org_id: orgId,
          location_id: locationId,
          form_template_id: formTemplateId,
          target_role_ids: targetRoleIds,
          reviewer_role_ids: reviewerRoleIds,
          trigger_on: triggerOn,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to create rule');
      }

      const { rule } = await res.json();
      setRules((prev) => [rule, ...prev]);
      setShowCreateForm(false);
      resetCreateForm();
    } catch (err: any) {
      setError(err.message || 'Failed to create rule');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (rule: CertificationEvaluationRule) => {
    const newActive = !rule.is_active;
    // Optimistic update
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, is_active: newActive } : r))
    );

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = await resolveToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/evaluations/certification-rules', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id: rule.id, org_id: orgId, is_active: newActive }),
      });

      if (!res.ok) {
        // Revert on failure
        setRules((prev) =>
          prev.map((r) => (r.id === rule.id ? { ...r, is_active: rule.is_active } : r))
        );
      }
    } catch {
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, is_active: rule.is_active } : r))
      );
    }
  };

  const handleDelete = async (ruleId: string) => {
    const prev = [...rules];
    setRules((r) => r.filter((item) => item.id !== ruleId));

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = await resolveToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/evaluations/certification-rules', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ id: ruleId, org_id: orgId }),
      });

      if (!res.ok) {
        setRules(prev);
      }
    } catch {
      setRules(prev);
    }
  };

  const getRoleName = (roleId: string): string => {
    const role = roles.find((r) => r.id === roleId);
    return role?.role_name ?? 'Unknown';
  };

  const getRoleColorKey = (roleId: string): string | null => {
    const role = roles.find((r) => r.id === roleId);
    return role?.color ?? null;
  };

  const getTriggerLabel = (trigger: string): string => {
    const option = TRIGGER_OPTIONS.find((o) => o.value === trigger);
    return option?.label ?? trigger;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { ...dialogPaperSx, maxHeight: '85vh' } }}
    >
      <DialogTitle sx={dialogTitleSx}>
        Certification Evaluation Rules
        <IconButton size="small" onClick={onClose} aria-label="Close dialog">
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ ...dialogContentSx, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} sx={{ color: 'var(--ls-color-brand)' }} />
          </Box>
        ) : (
          <>
            {/* Existing rules */}
            {rules.length === 0 && !showCreateForm && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '48px 24px',
                  textAlign: 'center',
                  gap: '12px',
                  border: '2px dashed var(--ls-color-muted-border)',
                  borderRadius: '12px',
                  background: 'var(--ls-color-neutral-foreground)',
                }}
              >
                <Typography
                  sx={{
                    fontFamily,
                    fontSize: 16,
                    fontWeight: 600,
                    color: 'var(--ls-color-text-primary)',
                  }}
                >
                  No certification rules configured
                </Typography>
                <Typography sx={{ fontFamily, fontSize: 14, color: 'var(--ls-color-muted)' }}>
                  Certification rules define which evaluation forms are triggered when an
                  employee's certification status changes (e.g., Pending or PIP).
                </Typography>
              </Box>
            )}

            {rules.map((rule) => (
              <Box
                key={rule.id}
                sx={{
                  p: 2.5,
                  borderRadius: '12px',
                  border: '1px solid var(--ls-color-muted-border)',
                  backgroundColor: 'var(--ls-color-bg-container)',
                  boxShadow: '0px 2px 6px rgba(15, 23, 42, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                }}
              >
                {/* Header row */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily,
                      fontSize: 15,
                      fontWeight: 700,
                      color: 'var(--ls-color-text-primary)',
                    }}
                  >
                    {(rule as any).form_templates?.name ?? rule.form_template?.name ?? 'Unknown form'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Switch
                      size="small"
                      checked={rule.is_active}
                      onChange={() => handleToggleActive(rule)}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: 'var(--ls-color-brand)',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: 'var(--ls-color-brand)',
                        },
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(rule.id)}
                      sx={{ color: 'var(--ls-color-destructive-base)' }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                </Box>

                {/* Triggers */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography
                    sx={{
                      fontFamily,
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--ls-color-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      mr: 0.5,
                    }}
                  >
                    Triggers:
                  </Typography>
                  {rule.trigger_on.map((trigger) => (
                    <Box
                      key={trigger}
                      sx={{
                        px: 1.5,
                        py: 0.25,
                        borderRadius: '6px',
                        backgroundColor: 'var(--ls-color-warning-soft)',
                        color: 'var(--ls-color-warning-base)',
                        fontFamily,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {getTriggerLabel(trigger)}
                    </Box>
                  ))}
                </Box>

                {/* Target roles */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography
                    sx={{
                      fontFamily,
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--ls-color-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      mr: 0.5,
                    }}
                  >
                    Target:
                  </Typography>
                  {rule.target_role_ids.map((roleId) => {
                    const color = getRoleColor(getRoleColorKey(roleId));
                    return (
                      <Box
                        key={roleId}
                        sx={{
                          px: 1,
                          py: 0.25,
                          borderRadius: '4px',
                          backgroundColor: color.bg,
                          color: color.text,
                          fontFamily,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {getRoleName(roleId)}
                      </Box>
                    );
                  })}
                </Box>

                {/* Reviewer roles */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography
                    sx={{
                      fontFamily,
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--ls-color-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      mr: 0.5,
                    }}
                  >
                    Reviewers:
                  </Typography>
                  {rule.reviewer_role_ids.map((roleId) => {
                    const color = getRoleColor(getRoleColorKey(roleId));
                    return (
                      <Box
                        key={roleId}
                        sx={{
                          px: 1,
                          py: 0.25,
                          borderRadius: '4px',
                          backgroundColor: color.bg,
                          color: color.text,
                          fontFamily,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {getRoleName(roleId)}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            ))}

            {/* Create form */}
            {showCreateForm && (
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: '12px',
                  border: '2px solid var(--ls-color-brand)',
                  backgroundColor: 'var(--ls-color-bg-container)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <Typography
                  sx={{
                    fontFamily,
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--ls-color-text-primary)',
                  }}
                >
                  New Certification Rule
                </Typography>

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

                {/* Trigger On */}
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
                    Trigger On
                  </Typography>
                  <Typography
                    sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-muted)', mb: 1 }}
                  >
                    Which certification status transitions should create an evaluation request.
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {TRIGGER_OPTIONS.map((opt) => (
                      <FormControlLabel
                        key={opt.value}
                        control={
                          <Checkbox
                            checked={triggerOn.includes(opt.value)}
                            onChange={() => handleTriggerToggle(opt.value)}
                            size="small"
                            sx={{ '&.Mui-checked': { color: 'var(--ls-color-brand)' } }}
                          />
                        }
                        label={
                          <Typography sx={{ fontFamily, fontSize: 13 }}>{opt.label}</Typography>
                        }
                      />
                    ))}
                  </Box>
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
                  <Typography
                    sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-muted)', mb: 1 }}
                  >
                    Which employee roles will be evaluated when their certification status changes.
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
                  <Typography
                    sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-muted)', mb: 1 }}
                  >
                    Which roles are permitted to conduct these evaluations.
                  </Typography>
                  <RolesCheckboxList
                    roles={roles}
                    selectedIds={reviewerRoleIds}
                    onToggle={handleReviewerRoleToggle}
                  />
                </div>

                {error && (
                  <Typography
                    sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-destructive-base)' }}
                  >
                    {error}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                  <Button
                    onClick={() => {
                      setShowCreateForm(false);
                      resetCreateForm();
                    }}
                    disabled={saving}
                    sx={cancelButtonSx}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleCreate}
                    disabled={saving}
                    startIcon={
                      saving ? <CircularProgress size={14} color="inherit" /> : null
                    }
                    sx={primaryButtonSx}
                  >
                    {saving ? 'Creating...' : 'Create Rule'}
                  </Button>
                </Box>
              </Box>
            )}

            {/* Error display (for non-create errors) */}
            {error && !showCreateForm && (
              <Typography
                sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-destructive-base)' }}
              >
                {error}
              </Typography>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={dialogActionsSx}>
        {!showCreateForm && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setShowCreateForm(true);
              setError(null);
            }}
            sx={primaryButtonSx}
          >
            Add Rule
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} sx={cancelButtonSx}>
          Close
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
          <Box
            key={role.id}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, padding: '4px 0' }}
          >
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
