import * as React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Button,
  IconButton,
  Switch,
  Tooltip,
} from '@mui/material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { createSupabaseClient } from '@/util/supabase/component';
import type { EvaluationRule } from '@/lib/evaluations/types';
import { getRoleColor, type OrgRole } from '@/lib/role-utils';
import { EvaluationRuleDialog } from './EvaluationRuleDialog';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

export interface EvaluationRulesListProps {
  orgId: string | null;
  getAccessToken: () => Promise<string | null>;
}

export function EvaluationRulesList({ orgId, getAccessToken }: EvaluationRulesListProps) {
  const [rules, setRules] = React.useState<EvaluationRule[]>([]);
  const [orgRoles, setOrgRoles] = React.useState<OrgRole[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<EvaluationRule | null>(null);

  const fetchRules = React.useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [rulesRes, rolesResult] = await Promise.all([
        fetch(`/api/evaluations/schedule-rules?org_id=${encodeURIComponent(orgId)}`, { headers }),
        createSupabaseClient()
          .from('org_roles')
          .select('*')
          .eq('org_id', orgId)
          .order('hierarchy_level', { ascending: true }),
      ]);

      if (!rulesRes.ok) {
        const body = await rulesRes.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load evaluation rules');
      }

      const data = await rulesRes.json();
      setRules(data.rules ?? data);
      if (rolesResult.data) setOrgRoles(rolesResult.data as OrgRole[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load evaluation rules');
    } finally {
      setLoading(false);
    }
  }, [orgId, getAccessToken]);

  React.useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleOpenCreate = () => {
    setEditingRule(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (rule: EvaluationRule) => {
    setEditingRule(rule);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingRule(null);
  };

  const handleSaved = () => {
    fetchRules();
  };

  const handleToggleActive = async (rule: EvaluationRule) => {
    setTogglingId(rule.id);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = await getAccessToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/evaluations/schedule-rules', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id: rule.id, org_id: orgId, is_active: !rule.is_active }),
      });
      if (!res.ok) throw new Error('Failed to update rule');
      const data = await res.json();
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, is_active: data.rule?.is_active ?? !rule.is_active } : r))
      );
    } catch {
      // silently revert — the switch will snap back since state wasn't updated
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (rule: EvaluationRule) => {
    if (!window.confirm(`Delete the rule for "${rule.form_template?.name ?? 'this form'}"? This cannot be undone.`)) {
      return;
    }
    setDeletingId(rule.id);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = await getAccessToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/evaluations/schedule-rules', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ id: rule.id, org_id: orgId }),
      });
      if (!res.ok) throw new Error('Failed to delete rule');
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
    } catch {
      // silently handle — user can retry
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
        <CircularProgress size={24} sx={{ color: 'var(--ls-color-brand)' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography sx={{ fontFamily, fontSize: 14, color: 'var(--ls-color-destructive-base)' }}>
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <>
      {/* Header row with Create button */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Typography sx={{ fontFamily, fontSize: 14, color: 'var(--ls-color-muted)' }}>
          {rules.length === 0
            ? 'No evaluation rules configured'
            : `${rules.length} rule${rules.length !== 1 ? 's' : ''}`}
        </Typography>
        {orgId && (
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={handleOpenCreate}
            sx={{
              fontFamily,
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'none',
              backgroundColor: 'var(--ls-color-brand)',
              borderRadius: '8px',
              boxShadow: 'none',
              padding: '5px 14px',
              '&:hover': {
                backgroundColor: 'var(--ls-color-brand-hover)',
                boxShadow: 'none',
              },
            }}
          >
            Create Rule
          </Button>
        )}
      </Box>

      {rules.length === 0 ? (
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
          <SettingsOutlinedIcon sx={{ fontSize: 40, color: 'var(--ls-color-muted)', opacity: 0.5 }} />
          <Typography sx={{ fontFamily, fontSize: 16, fontWeight: 600, color: 'var(--ls-color-text-primary)' }}>
            No evaluation rules configured
          </Typography>
          <Typography sx={{ fontFamily, fontSize: 14, color: 'var(--ls-color-muted)' }}>
            Evaluation rules define when evaluations are automatically assigned to employees.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              orgRoles={orgRoles}
              isToggling={togglingId === rule.id}
              isDeleting={deletingId === rule.id}
              onEdit={handleOpenEdit}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
            />
          ))}
        </Box>
      )}

      {orgId && (
        <EvaluationRuleDialog
          open={dialogOpen}
          onClose={handleDialogClose}
          onSaved={handleSaved}
          orgId={orgId}
          rule={editingRule}
          orgRoles={orgRoles}
          getAccessToken={getAccessToken}
        />
      )}
    </>
  );
}

// ── Private sub-component ─────────────────────────────────────────────────────

interface RuleCardProps {
  rule: EvaluationRule;
  orgRoles: OrgRole[];
  isToggling: boolean;
  isDeleting: boolean;
  onEdit: (rule: EvaluationRule) => void;
  onToggleActive: (rule: EvaluationRule) => void;
  onDelete: (rule: EvaluationRule) => void;
}

function RuleCard({ rule, orgRoles, isToggling, isDeleting, onEdit, onToggleActive, onDelete }: RuleCardProps) {
  const isFormInactive = rule.form_template && !rule.form_template.is_active;

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: '12px',
        border: '1px solid var(--ls-color-muted-border)',
        backgroundColor: 'var(--ls-color-bg-container)',
        boxShadow: '0px 2px 6px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        opacity: isDeleting ? 0.5 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Top row: form name + actions */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography
              sx={{
                fontFamily,
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--ls-color-text-primary)',
              }}
            >
              {rule.form_template?.name ?? 'Unknown form'}
            </Typography>
            {isFormInactive && (
              <Tooltip title="This evaluation form is inactive and won't generate new evaluations">
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    px: 1,
                    py: '2px',
                    borderRadius: '5px',
                    backgroundColor: 'var(--ls-color-warning-soft)',
                    color: 'var(--ls-color-warning-base)',
                  }}
                >
                  <WarningAmberIcon sx={{ fontSize: 12 }} />
                  <Typography sx={{ fontFamily, fontSize: 11, fontWeight: 600 }}>
                    Form inactive
                  </Typography>
                </Box>
              </Tooltip>
            )}
          </Box>
          <Typography sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-muted)' }}>
            {formatCadence(rule.cadence)}
          </Typography>
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          <Tooltip title={rule.is_active ? 'Deactivate rule' : 'Activate rule'}>
            <span>
              <Switch
                checked={rule.is_active}
                disabled={isToggling}
                onChange={() => onToggleActive(rule)}
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--ls-color-brand)' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: 'var(--ls-color-brand)',
                  },
                }}
              />
            </span>
          </Tooltip>
          <Tooltip title="Edit rule">
            <IconButton
              size="small"
              onClick={() => onEdit(rule)}
              disabled={isDeleting}
              sx={{ color: 'var(--ls-color-muted)' }}
            >
              <EditOutlinedIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete rule">
            <IconButton
              size="small"
              onClick={() => onDelete(rule)}
              disabled={isDeleting}
              sx={{
                color: 'var(--ls-color-muted)',
                '&:hover': { color: 'var(--ls-color-destructive-base)' },
              }}
            >
              {isDeleting ? (
                <CircularProgress size={14} sx={{ color: 'var(--ls-color-destructive-base)' }} />
              ) : (
                <DeleteOutlineIcon sx={{ fontSize: 17 }} />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Role chips row */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <RoleChipsRow label="Evaluates" roleIds={rule.target_role_ids} orgRoles={orgRoles} />
        <RoleChipsRow label="Reviewed by" roleIds={rule.reviewer_role_ids} orgRoles={orgRoles} />
      </Box>
    </Box>
  );
}

// ── Role chips row ────────────────────────────────────────────────────────────

interface RoleChipsRowProps {
  label: string;
  roleIds: string[];
  orgRoles: OrgRole[];
}

function RoleChipsRow({ label, roleIds, orgRoles }: RoleChipsRowProps) {
  if (!roleIds || roleIds.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
      <Typography
        sx={{
          fontFamily,
          fontSize: 12,
          color: 'var(--ls-color-muted)',
          flexShrink: 0,
          minWidth: 72,
        }}
      >
        {label}:
      </Typography>
      <RoleChips roleIds={roleIds} orgRoles={orgRoles} />
    </Box>
  );
}

function RoleChips({ roleIds, orgRoles }: { roleIds: string[]; orgRoles: OrgRole[] }) {
  const MAX_VISIBLE = 4;
  const visible = roleIds.slice(0, MAX_VISIBLE);
  const overflow = roleIds.length - MAX_VISIBLE;

  // Build a lookup map for O(1) access
  const roleMap = React.useMemo(() => {
    const map = new Map<string, OrgRole>();
    orgRoles.forEach((r) => map.set(r.id, r));
    return map;
  }, [orgRoles]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
      {visible.map((id) => {
        const role = roleMap.get(id);
        const color = getRoleColor(role?.color ?? 'grey');
        const label = role?.role_name ?? id.slice(-8);
        return (
          <span
            key={id}
            title={role ? role.role_name : id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: '4px',
              fontFamily,
              fontSize: 11,
              fontWeight: 600,
              backgroundColor: color.bg,
              color: color.text,
              maxWidth: 140,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>
        );
      })}
      {overflow > 0 && (
        <Typography sx={{ fontFamily, fontSize: 11, color: 'var(--ls-color-muted)' }}>
          +{overflow} more
        </Typography>
      )}
    </Box>
  );
}

function formatCadence(cadence: string): string {
  switch (cadence) {
    case 'monthly': return 'Monthly';
    case 'quarterly': return 'Quarterly';
    case 'semi_annual': return 'Semi-annual';
    case 'annual': return 'Annual';
    default: return cadence;
  }
}
