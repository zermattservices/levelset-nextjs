import * as React from 'react';
import { TextField, Autocomplete } from '@mui/material';
import { getRoleColor } from '@/lib/role-utils';
import { createSupabaseClient } from '@/util/supabase/component';
import type { OrgChartData, OrgChartEmployee } from '@/lib/org-chart-types';
import sty from './EmployeeDetailPanel.module.css';

interface EmployeeDetailPanelProps {
  employeeId: string | null;
  chartData: OrgChartData;
  onClose: () => void;
  canEdit: boolean;
  canViewPay: boolean;
  onUpdate: () => void;
  onUpdateEmployee: (employeeId: string, updates: Partial<OrgChartEmployee>) => void;
  position: { x: number; y: number } | null;
  locationId: string;
}

type SupervisorOption = {
  type: 'employee' | 'group';
  id: string;
  label: string;
};

function computeTenure(hireDate: string | null): string {
  if (!hireDate) return 'N/A';
  const hire = new Date(hireDate);
  const now = new Date();
  const diffMs = now.getTime() - hire.getTime();
  const totalMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0) return `${months}mo`;
  if (months === 0) return `${years}y`;
  return `${years}y ${months}mo`;
}

function formatPay(employee: OrgChartEmployee): string {
  if (employee.actual_pay == null) return 'Not set';
  if (employee.actual_pay_type === 'salary') {
    return `$${employee.actual_pay.toLocaleString()}/yr`;
  }
  return `$${employee.actual_pay.toFixed(2)}/hr`;
}

async function apiPost(intent: string, payload: Record<string, any>, locationId: string) {
  const supabase = createSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const params = new URLSearchParams({ location_id: locationId });
  const res = await fetch(`/api/org-chart?${params.toString()}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token || ''}`,
    },
    body: JSON.stringify({ intent, ...payload }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function getPopoverStyle(
  click: { x: number; y: number }
): React.CSSProperties {
  const W = 320;
  const H = 440;
  const PAD = 16;

  let left = click.x + 20;
  let top = click.y - 60;

  if (left + W > window.innerWidth - PAD) {
    left = click.x - W - 20;
  }
  if (left < PAD) left = PAD;
  if (top + H > window.innerHeight - PAD) {
    top = window.innerHeight - H - PAD;
  }
  if (top < PAD) top = PAD;

  return { left, top };
}

export function EmployeeDetailPanel({
  employeeId,
  chartData,
  onClose,
  canEdit,
  canViewPay,
  onUpdate,
  onUpdateEmployee,
  position,
  locationId,
}: EmployeeDetailPanelProps) {
  const employee = employeeId
    ? chartData.employees.find((e) => e.id === employeeId)
    : null;

  const [titleValue, setTitleValue] = React.useState('');
  const [saving, setSaving] = React.useState<string | null>(null);
  const autoAssignedRef = React.useRef<string | null>(null);

  // Must be before early return to satisfy React hooks rules
  React.useEffect(() => {
    if (employee) {
      setTitleValue(
        employee.role === 'Operator'
          ? (employee.title || 'Owner/Operator')
          : (employee.title || '')
      );
    }
  }, [employee?.id, employee?.role, employee?.title]);

  // Build supervisor options (needed before auto-assign effect)
  const roleMap = React.useMemo(
    () => new Map(chartData.roles.map((r) => [r.role_name, r])),
    [chartData.roles]
  );
  const role = employee ? chartData.roles.find((r) => r.role_name === employee.role) : null;
  const empLevel = role?.hierarchy_level ?? 999;
  const hasRoles = chartData.roles.length > 0;

  const supervisorOptions: SupervisorOption[] = React.useMemo(() => {
    if (!employee) return [];
    return [
      ...chartData.employees
        .filter((e) => {
          if (e.id === employee.id) return false;
          if (!hasRoles) return true;
          const eRole = roleMap.get(e.role);
          return (eRole?.hierarchy_level ?? 999) < empLevel;
        })
        .map((e) => ({
          type: 'employee' as const,
          id: e.id,
          label: e.full_name,
        })),
      ...chartData.groups
        .filter((g) => {
          if (!hasRoles) return true;
          const gRole = roleMap.get(g.role_name);
          return (gRole?.hierarchy_level ?? 999) < empLevel;
        })
        .map((g) => ({
          type: 'group' as const,
          id: g.id,
          label: `${g.name} [${g.role_name}]`,
        })),
    ];
  }, [employee?.id, chartData.employees, chartData.groups, roleMap, empLevel, hasRoles]);

  // Auto-assign: if only one supervisor option and no current supervisor, assign automatically
  React.useEffect(() => {
    if (!employee || !canEdit || !position) return;
    if (employee.direct_supervisor_id || employee.supervisor_group_id) return;
    if (supervisorOptions.length !== 1) return;
    // Only auto-assign once per employee
    if (autoAssignedRef.current === employee.id) return;
    autoAssignedRef.current = employee.id;

    const option = supervisorOptions[0];
    const updates: Partial<OrgChartEmployee> =
      option.type === 'employee'
        ? { direct_supervisor_id: option.id, supervisor_group_id: null }
        : { direct_supervisor_id: null, supervisor_group_id: option.id };

    // Optimistic update
    onUpdateEmployee(employee.id, updates);

    // Fire-and-forget API call
    apiPost('update_supervisor', {
      employee_id: employee.id,
      supervisor_type: option.type,
      supervisor_id: option.id,
    }, locationId).catch((err) => {
      console.error('Failed to auto-assign supervisor:', err);
    });
  }, [employee?.id, supervisorOptions.length, canEdit, position]);

  if (!employee || !position) return null;

  const roleColor = getRoleColor(role?.color);
  const initials =
    `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();

  // Current supervisor value
  let currentSup: SupervisorOption | null = null;
  if (employee.direct_supervisor_id) {
    currentSup =
      supervisorOptions.find(
        (o) => o.type === 'employee' && o.id === employee.direct_supervisor_id
      ) || null;
  } else if (employee.supervisor_group_id) {
    currentSup =
      supervisorOptions.find(
        (o) => o.type === 'group' && o.id === employee.supervisor_group_id
      ) || null;
  }

  // Current department
  const currentDept = employee.department_id
    ? chartData.departments.find((d) => d.id === employee.department_id) || null
    : null;

  // Find supervisor name for read-only display
  let supervisorLabel = 'None';
  if (employee.direct_supervisor_id) {
    const sup = chartData.employees.find(
      (e) => e.id === employee.direct_supervisor_id
    );
    supervisorLabel = sup ? sup.full_name : 'Unknown';
  } else if (employee.supervisor_group_id) {
    const grp = chartData.groups.find(
      (g) => g.id === employee.supervisor_group_id
    );
    supervisorLabel = grp ? `${grp.name} [Role Group]` : 'Unknown group';
  }

  // Direct reports
  const directReports = chartData.employees.filter(
    (e) => e.direct_supervisor_id === employee.id
  );

  // Optimistic save: supervisor
  const handleSupervisorChange = async (val: SupervisorOption | null) => {
    // Optimistic local update - instant chart redraw with new edge
    const updates: Partial<OrgChartEmployee> =
      val?.type === 'employee'
        ? { direct_supervisor_id: val.id, supervisor_group_id: null }
        : val?.type === 'group'
          ? { direct_supervisor_id: null, supervisor_group_id: val.id }
          : { direct_supervisor_id: null, supervisor_group_id: null };
    onUpdateEmployee(employee.id, updates);

    // Background API save
    setSaving('supervisor');
    try {
      await apiPost('update_supervisor', {
        employee_id: employee.id,
        supervisor_type: val?.type || null,
        supervisor_id: val?.id || null,
      }, locationId);
    } catch (err) {
      console.error('Failed to update supervisor:', err);
      // Revert on error
      onUpdate();
    } finally {
      setSaving(null);
    }
  };

  // Optimistic save: department
  const handleDepartmentChange = async (val: any) => {
    onUpdateEmployee(employee.id, { department_id: val?.id || null });

    setSaving('department');
    try {
      await apiPost('update_employee_department', {
        employee_id: employee.id,
        department_id: val?.id || null,
      }, locationId);
    } catch (err) {
      console.error('Failed to update department:', err);
      onUpdate();
    } finally {
      setSaving(null);
    }
  };

  // Save title on blur or Enter
  const handleTitleSave = async () => {
    const newTitle = titleValue.trim() || null;
    if (newTitle === (employee.title || null)) return;

    onUpdateEmployee(employee.id, { title: newTitle });

    setSaving('title');
    try {
      await apiPost('update_employee_title', {
        employee_id: employee.id,
        title: newTitle,
      }, locationId);
    } catch (err) {
      console.error('Failed to update title:', err);
      onUpdate();
    } finally {
      setSaving(null);
    }
  };

  const popoverStyle = getPopoverStyle(position);

  const inputSx = {
    '& .MuiInputBase-root': {
      fontSize: 13,
      fontFamily: 'var(--ls-font-body)',
      backgroundColor: 'var(--ls-color-bg-container)',
      borderRadius: 'var(--ls-radius-sm)',
    },
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: 'var(--ls-color-muted-border)',
      },
      '&:hover fieldset': {
        borderColor: 'var(--ls-color-muted)',
      },
      '&.Mui-focused fieldset': {
        borderColor: 'var(--ls-color-brand)',
        borderWidth: 1,
      },
    },
    '& .MuiInputBase-input': {
      fontSize: 13,
      fontFamily: 'var(--ls-font-body)',
      padding: '6px 10px',
    },
    '& .MuiAutocomplete-input': {
      fontSize: 13,
      fontFamily: 'var(--ls-font-body)',
      padding: '4px 6px !important',
    },
  };

  return (
    <>
      <div className={sty.backdrop} onClick={onClose} />
      <div className={sty.popover} style={popoverStyle}>
        {/* Header */}
        <div className={sty.header}>
          <div
            className={sty.avatar}
            style={{ backgroundColor: roleColor.bg, color: roleColor.text }}
          >
            {initials}
          </div>
          <div className={sty.headerInfo}>
            <h3 className={sty.name}>{employee.full_name}</h3>
            <span
              className={sty.roleBadge}
              style={{
                backgroundColor: roleColor.bg,
                color: roleColor.text,
              }}
            >
              {employee.role}
            </span>
          </div>
          <button className={sty.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        {/* Body */}
        <div className={sty.body}>
          {/* Editable fields */}
          {canEdit ? (
            <>
              <div className={sty.field}>
                <label className={sty.fieldLabel}>Reports to</label>
                <Autocomplete
                  size="small"
                  options={supervisorOptions}
                  getOptionLabel={(opt) => opt.label}
                  value={currentSup}
                  onChange={(_, val) => handleSupervisorChange(val)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="None"
                      sx={inputSx}
                      variant="outlined"
                    />
                  )}
                  isOptionEqualToValue={(opt, val) =>
                    opt.type === val.type && opt.id === val.id
                  }
                  disabled={!!saving}
                  slotProps={{
                    popper: { style: { zIndex: 1400 } },
                    listbox: {
                      style: {
                        fontSize: 13,
                        fontFamily: 'var(--ls-font-body)',
                        maxHeight: 200,
                      },
                    },
                  }}
                />
              </div>

              <div className={sty.field}>
                <label className={sty.fieldLabel}>Department</label>
                <Autocomplete
                  size="small"
                  options={chartData.departments}
                  getOptionLabel={(opt) => opt.name}
                  value={currentDept}
                  onChange={(_, val) => handleDepartmentChange(val)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="None"
                      sx={inputSx}
                      variant="outlined"
                    />
                  )}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  disabled={!!saving}
                  slotProps={{
                    popper: { style: { zIndex: 1400 } },
                    listbox: {
                      style: {
                        fontSize: 13,
                        fontFamily: 'var(--ls-font-body)',
                        maxHeight: 200,
                      },
                    },
                  }}
                />
              </div>

              <div className={sty.field}>
                <label className={sty.fieldLabel}>Title</label>
                <TextField
                  size="small"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTitleSave();
                  }}
                  placeholder="e.g., Director of Operations"
                  sx={inputSx}
                  variant="outlined"
                  disabled={!!saving}
                />
              </div>

              {saving && <p className={sty.saving}>Saving...</p>}
            </>
          ) : (
            <>
              {employee.title && (
                <div className={sty.field}>
                  <span className={sty.fieldLabel}>Title</span>
                  <span className={sty.fieldValue}>{employee.title}</span>
                </div>
              )}
              <div className={sty.field}>
                <span className={sty.fieldLabel}>Reports to</span>
                <span className={sty.fieldValue}>{supervisorLabel}</span>
              </div>
              {currentDept && (
                <div className={sty.field}>
                  <span className={sty.fieldLabel}>Department</span>
                  <span className={sty.fieldValue}>{currentDept.name}</span>
                </div>
              )}
            </>
          )}

          <div className={sty.divider} />

          {/* Info grid */}
          <div className={sty.infoGrid}>
            <div className={sty.infoItem}>
              <span className={sty.infoItemLabel}>Tenure</span>
              <span className={sty.infoItemValue}>
                {computeTenure(employee.hire_date)}
              </span>
            </div>
            <div className={sty.infoItem}>
              <span className={sty.infoItemLabel}>Area</span>
              <span className={sty.infoItemValue}>
                {[employee.is_foh && 'FOH', employee.is_boh && 'BOH']
                  .filter(Boolean)
                  .join(' · ') || 'N/A'}
              </span>
            </div>
            {canViewPay && (
              <div className={sty.infoItem}>
                <span className={sty.infoItemLabel}>Pay</span>
                <span className={sty.infoItemValue}>
                  {formatPay(employee)}
                </span>
              </div>
            )}
            <div className={sty.infoItem}>
              <span className={sty.infoItemLabel}>Certified</span>
              <span className={sty.infoItemValue}>
                {employee.certified_status || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Direct Reports */}
        {directReports.length > 0 && (
          <div className={sty.reportsSection}>
            <h4 className={sty.reportsSectionTitle}>
              Direct Reports ({directReports.length})
            </h4>
            <div className={sty.reportsList}>
              {directReports.map((r) => {
                const rColor = getRoleColor(
                  chartData.roles.find((rl) => rl.role_name === r.role)?.color
                );
                return (
                  <div key={r.id} className={sty.reportItem}>
                    <span className={sty.reportName}>{r.full_name}</span>
                    <span
                      className={sty.reportRoleBadge}
                      style={{
                        backgroundColor: rColor.bg,
                        color: rColor.text,
                      }}
                    >
                      {r.role}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
