import * as React from 'react';
import {
  Drawer,
  IconButton,
  Tabs,
  Tab,
  TextField,
  Button,
  Autocomplete,
  Chip,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { createSupabaseClient } from '@/util/supabase/component';
import type {
  OrgChartData,
  OrgChartEmployee,
  OrgDepartment,
  OrgGroupWithMembers,
} from '@/lib/org-chart-types';
import sty from './ConfigPanel.module.css';

const fontFamily = '"Satoshi", system-ui, -apple-system, sans-serif';
const commonSx = {
  '& .MuiInputBase-input': { fontFamily, fontSize: 13 },
  '& .MuiInputLabel-root': { fontFamily, fontSize: 13 },
};

interface ConfigPanelProps {
  open: boolean;
  onClose: () => void;
  chartData: OrgChartData;
  locationId: string;
  onUpdate: () => void;
  initialTab?: number;
  focusGroupId?: string | null;
}

async function apiPost(intent: string, payload: Record<string, any>, locationId?: string) {
  const supabase = createSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const params = locationId ? new URLSearchParams({ location_id: locationId }) : new URLSearchParams();
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

// ─── Departments Tab ──────────────────────────────────────────────────────────

function DepartmentsTab({
  chartData,
  locationId,
  onUpdate,
}: {
  chartData: OrgChartData;
  locationId: string;
  onUpdate: () => void;
}) {
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [editingDept, setEditingDept] = React.useState<string | null>(null);
  const [editGroups, setEditGroups] = React.useState<OrgGroupWithMembers[]>([]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await apiPost('create_department', {
        name: newName.trim(),
        location_id: locationId,
      }, locationId);
      setNewName('');
      setCreating(false);
      onUpdate();
    } catch (err) {
      console.error('Failed to create department:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiPost('delete_department', { department_id: deleteId }, locationId);
      setDeleteId(null);
      onUpdate();
    } catch (err) {
      console.error('Failed to delete department:', err);
    }
  };

  const startEditGroups = (dept: OrgDepartment) => {
    const currentGroups = chartData.groups.filter(
      (g) => g.department_id === dept.id
    );
    setEditGroups(currentGroups);
    setEditingDept(dept.id);
  };

  const saveGroups = async () => {
    if (!editingDept) return;
    try {
      await apiPost('update_department_groups', {
        department_id: editingDept,
        group_ids: editGroups.map((g) => g.id),
      }, locationId);
      setEditingDept(null);
      onUpdate();
    } catch (err) {
      console.error('Failed to update department groups:', err);
    }
  };

  return (
    <div className={sty.tabContent}>
      {/* Existing departments */}
      {chartData.departments.map((dept) => {
        const deptGroups = chartData.groups.filter(
          (g) => g.department_id === dept.id
        );
        // Member count: employees in assigned groups (inherited)
        const memberEmpIds = new Set<string>();
        deptGroups.forEach((g) => {
          g.members.forEach((m) => memberEmpIds.add(m.employee_id));
        });
        const memberCount = memberEmpIds.size;

        const isEditing = editingDept === dept.id;

        return (
          <div key={dept.id} className={sty.listItem}>
            <div className={sty.listItemHeader}>
              <span className={sty.listItemName}>{dept.name}</span>
              <span className={sty.listItemMeta}>
                {deptGroups.length} group{deptGroups.length !== 1 ? 's' : ''}
                {' \u00b7 '}
                {memberCount} member{memberCount !== 1 ? 's' : ''}
              </span>
              <IconButton
                size="small"
                onClick={() => setDeleteId(dept.id)}
                sx={{ ml: 'auto' }}
              >
                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </div>

            {!isEditing && (
              <div className={sty.listItemBody}>
                {deptGroups.length > 0 ? (
                  <p style={{ fontFamily, fontSize: 12, color: 'var(--ls-color-text-primary)', margin: '0 0 4px' }}>
                    {deptGroups[0].name}
                    {deptGroups.length > 1 && (
                      <span style={{ color: 'var(--ls-color-text-secondary)' }}>
                        {` + ${deptGroups.length - 1} other${deptGroups.length > 2 ? 's' : ''}`}
                      </span>
                    )}
                  </p>
                ) : (
                  <p style={{ fontFamily, fontSize: 12, color: 'var(--ls-color-text-secondary)', margin: '0 0 4px' }}>
                    No groups assigned yet
                  </p>
                )}

                <Button
                  size="small"
                  startIcon={<EditOutlinedIcon sx={{ fontSize: 14 }} />}
                  onClick={() => startEditGroups(dept)}
                  sx={{
                    fontFamily,
                    textTransform: 'none',
                    fontSize: 12,
                    color: 'var(--ls-color-brand)',
                    alignSelf: 'flex-start',
                    mt: 0.5,
                  }}
                >
                  Manage Groups
                </Button>
              </div>
            )}

            {isEditing && (
              <div className={sty.listItemBody}>
                <Autocomplete
                  multiple
                  size="small"
                  options={chartData.groups}
                  getOptionLabel={(opt) => `${opt.name} (${opt.role_name})`}
                  value={editGroups}
                  onChange={(_, val) => setEditGroups(val)}
                  disableCloseOnSelect
                  renderOption={(props, option, { selected }) => (
                    <li {...props} key={option.id}>
                      <Checkbox
                        icon={<CheckBoxOutlineBlankIcon sx={{ fontSize: 18 }} />}
                        checkedIcon={<CheckBoxIcon sx={{ fontSize: 18 }} />}
                        checked={selected}
                        size="small"
                        sx={{ mr: 1, p: 0 }}
                      />
                      <span style={{ fontFamily, fontSize: 13 }}>
                        {option.name}
                        <span style={{ color: 'var(--ls-color-text-secondary)', marginLeft: 4 }}>
                          ({option.role_name})
                        </span>
                      </span>
                    </li>
                  )}
                  renderTags={(value) => {
                    if (value.length === 0) return null;
                    return (
                      <span style={{ fontFamily, fontSize: 12, paddingLeft: 4 }}>
                        {value[0].name}
                        {value.length > 1 && (
                          <span style={{ color: 'var(--ls-color-text-secondary)' }}>
                            {` + ${value.length - 1} other${value.length > 2 ? 's' : ''}`}
                          </span>
                        )}
                      </span>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Groups"
                      placeholder="Search groups..."
                      sx={commonSx}
                    />
                  )}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  fullWidth
                />
                <div className={sty.createActions}>
                  <Button
                    size="small"
                    onClick={() => setEditingDept(null)}
                    sx={{ fontFamily, textTransform: 'none', fontSize: 13 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={saveGroups}
                    sx={{
                      fontFamily,
                      textTransform: 'none',
                      fontSize: 13,
                      boxShadow: 'none',
                    }}
                  >
                    Save Groups
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Create new */}
      {creating ? (
        <div className={sty.createForm}>
          <TextField
            size="small"
            label="Department Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') setCreating(false);
            }}
            sx={commonSx}
            fullWidth
          />
          <div className={sty.createActions}>
            <Button
              size="small"
              onClick={() => setCreating(false)}
              sx={{ fontFamily, textTransform: 'none', fontSize: 13 }}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleCreate}
              disabled={saving || !newName.trim()}
              sx={{
                fontFamily,
                textTransform: 'none',
                fontSize: 13,
                boxShadow: 'none',
              }}
            >
              Create
            </Button>
          </div>
        </div>
      ) : (
        <Button
          startIcon={<AddIcon />}
          onClick={() => setCreating(true)}
          sx={{
            fontFamily,
            textTransform: 'none',
            fontSize: 13,
            color: 'var(--ls-color-brand)',
          }}
        >
          Add Department
        </Button>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle sx={{ fontFamily }}>Delete Department?</DialogTitle>
        <DialogContent sx={{ fontFamily, fontSize: 14 }}>
          This will remove the department. Groups will remain but lose their
          department assignment.
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteId(null)}
            sx={{ fontFamily, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            sx={{ fontFamily, textTransform: 'none', boxShadow: 'none' }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

// ─── Groups Tab ───────────────────────────────────────────────────────────────

function GroupsTab({
  chartData,
  locationId,
  onUpdate,
}: {
  chartData: OrgChartData;
  locationId: string;
  onUpdate: () => void;
}) {
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newRole, setNewRole] = React.useState('');
  const [newDeptId, setNewDeptId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [editingGroup, setEditingGroup] = React.useState<string | null>(null);
  const [editMembers, setEditMembers] = React.useState<OrgChartEmployee[]>([]);

  // Build role hierarchy lookup for filtering supervisor group options
  const roleMap = new Map(chartData.roles.map((r) => [r.role_name, r]));

  const handleGroupReportsTo = async (
    groupId: string,
    supervisor: { type: 'employee' | 'group'; id: string } | null
  ) => {
    try {
      await apiPost('update_group_reports_to', {
        group_id: groupId,
        supervisor_type: supervisor?.type || null,
        supervisor_id: supervisor?.id || null,
      }, locationId);
      onUpdate();
    } catch (err) {
      console.error('Failed to update group reports-to:', err);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newRole) return;
    setSaving(true);
    try {
      const result = await apiPost('create_group', {
        name: newName.trim(),
        role_name: newRole,
        location_id: locationId,
        department_id: newDeptId,
      }, locationId);
      setNewName('');
      setNewRole('');
      setNewDeptId(null);
      setCreating(false);
      onUpdate();
      // Auto-open member editor for newly created group
      if (result?.id) {
        setEditingGroup(result.id);
        setEditMembers([]);
      }
    } catch (err) {
      console.error('Failed to create group:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiPost('delete_group', { group_id: deleteId }, locationId);
      setDeleteId(null);
      onUpdate();
    } catch (err) {
      console.error('Failed to delete group:', err);
    }
  };

  const startEditMembers = (group: OrgGroupWithMembers) => {
    const currentMembers = group.members
      .map((m) => chartData.employees.find((e) => e.id === m.employee_id))
      .filter(Boolean) as OrgChartEmployee[];
    setEditMembers(currentMembers);
    setEditingGroup(group.id);
  };

  const saveMembers = async () => {
    if (!editingGroup) return;
    try {
      await apiPost('update_group_members', {
        group_id: editingGroup,
        employee_ids: editMembers.map((e) => e.id),
      }, locationId);
      setEditingGroup(null);
      onUpdate();
    } catch (err) {
      console.error('Failed to update group members:', err);
    }
  };

  return (
    <div className={sty.tabContent}>
      {chartData.groups.map((group) => {
        const isEditing = editingGroup === group.id;
        const eligibleEmployees = chartData.employees.filter(
          (e) => e.role === group.role_name
        );

        // Resolve current members for display
        const currentMemberEmployees = group.members
          .map((m) => chartData.employees.find((e) => e.id === m.employee_id))
          .filter(Boolean) as OrgChartEmployee[];

        return (
          <div key={group.id} className={sty.listItem}>
            <div className={sty.listItemHeader}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                <span className={sty.listItemName}>{group.name}</span>
                <span className={sty.listItemMeta}>
                  {group.role_name} &middot; {group.members.length} member
                  {group.members.length !== 1 ? 's' : ''}
                </span>
              </div>
              <IconButton
                size="small"
                onClick={() => setDeleteId(group.id)}
              >
                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </div>

            {/* Always show current members + reports to */}
            {!isEditing && (() => {
              // Build supervisor options: employees at higher hierarchy levels + other groups
              const groupRole = roleMap.get(group.role_name);
              const groupLevel = groupRole?.hierarchy_level ?? 999;

              const supervisorOptions: { type: 'employee' | 'group'; id: string; label: string }[] = [
                ...chartData.employees
                  .filter((e) => {
                    const eRole = roleMap.get(e.role);
                    return (eRole?.hierarchy_level ?? 999) < groupLevel;
                  })
                  .map((e) => ({
                    type: 'employee' as const,
                    id: e.id,
                    label: `${e.full_name} (${e.role})`,
                  })),
                ...chartData.groups
                  .filter((g) => {
                    if (g.id === group.id) return false;
                    const gRole = roleMap.get(g.role_name);
                    return (gRole?.hierarchy_level ?? 999) < groupLevel;
                  })
                  .map((g) => ({
                    type: 'group' as const,
                    id: g.id,
                    label: `${g.name} [${g.role_name}]`,
                  })),
              ];

              // Determine current supervisor value
              let currentSupervisor: { type: 'employee' | 'group'; id: string; label: string } | null = null;
              if (group.supervisor_group_id) {
                currentSupervisor = supervisorOptions.find(
                  (o) => o.type === 'group' && o.id === group.supervisor_group_id
                ) || null;
              } else if (currentMemberEmployees.length > 0) {
                // Check if members share a common direct_supervisor_id
                const memberSupervisors = currentMemberEmployees
                  .map((m) => m.direct_supervisor_id)
                  .filter(Boolean);
                if (memberSupervisors.length > 0) {
                  const allSame = memberSupervisors.every((s) => s === memberSupervisors[0]);
                  if (allSame) {
                    currentSupervisor = supervisorOptions.find(
                      (o) => o.type === 'employee' && o.id === memberSupervisors[0]
                    ) || null;
                  }
                }
              }

              return (
                <div className={sty.listItemBody}>
                  {currentMemberEmployees.length > 0 ? (
                    <p style={{ fontFamily, fontSize: 12, color: 'var(--ls-color-text-primary)', margin: '0 0 4px' }}>
                      {currentMemberEmployees[0].full_name}
                      {currentMemberEmployees.length > 1 && (
                        <span style={{ color: 'var(--ls-color-text-secondary)' }}>
                          {` + ${currentMemberEmployees.length - 1} other${currentMemberEmployees.length > 2 ? 's' : ''}`}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p style={{ fontFamily, fontSize: 12, color: 'var(--ls-color-text-secondary)', margin: '0 0 4px' }}>
                      No members assigned yet
                    </p>
                  )}

                  <Autocomplete
                    size="small"
                    options={supervisorOptions}
                    getOptionLabel={(opt) => opt.label}
                    groupBy={(opt) => opt.type === 'employee' ? 'Employees' : 'Groups'}
                    value={currentSupervisor}
                    onChange={(_, val) =>
                      handleGroupReportsTo(
                        group.id,
                        val ? { type: val.type, id: val.id } : null
                      )
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Reports to"
                        sx={commonSx}
                      />
                    )}
                    isOptionEqualToValue={(opt, val) =>
                      opt.type === val.type && opt.id === val.id
                    }
                    fullWidth
                  />

                  <Button
                    size="small"
                    startIcon={<EditOutlinedIcon sx={{ fontSize: 14 }} />}
                    onClick={() => startEditMembers(group)}
                    sx={{
                      fontFamily,
                      textTransform: 'none',
                      fontSize: 12,
                      color: 'var(--ls-color-brand)',
                      alignSelf: 'flex-start',
                      mt: 0.5,
                    }}
                  >
                    Manage Members
                  </Button>
                </div>
              );
            })()}

            {isEditing && (
              <div className={sty.listItemBody}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Button
                    size="small"
                    onClick={() => setEditMembers([...eligibleEmployees])}
                    disabled={editMembers.length === eligibleEmployees.length}
                    sx={{ fontFamily, textTransform: 'none', fontSize: 12, minWidth: 0, padding: '2px 8px' }}
                  >
                    Select All ({eligibleEmployees.length})
                  </Button>
                  {editMembers.length > 0 && (
                    <Button
                      size="small"
                      onClick={() => setEditMembers([])}
                      sx={{ fontFamily, textTransform: 'none', fontSize: 12, minWidth: 0, padding: '2px 8px', color: 'var(--ls-color-text-secondary)' }}
                    >
                      Clear
                    </Button>
                  )}
                  <span style={{ fontFamily, fontSize: 12, color: 'var(--ls-color-text-secondary)', marginLeft: 'auto' }}>
                    {editMembers.length} selected
                  </span>
                </div>
                <Autocomplete
                  multiple
                  size="small"
                  options={eligibleEmployees}
                  getOptionLabel={(opt) => opt.full_name}
                  value={editMembers}
                  onChange={(_, val) => setEditMembers(val)}
                  disableCloseOnSelect
                  renderOption={(props, option, { selected }) => (
                    <li {...props} key={option.id}>
                      <Checkbox
                        icon={<CheckBoxOutlineBlankIcon sx={{ fontSize: 18 }} />}
                        checkedIcon={<CheckBoxIcon sx={{ fontSize: 18 }} />}
                        checked={selected}
                        size="small"
                        sx={{ mr: 1, p: 0 }}
                      />
                      <span style={{ fontFamily, fontSize: 13 }}>{option.full_name}</span>
                    </li>
                  )}
                  renderTags={(value) => {
                    if (value.length === 0) return null;
                    return (
                      <span style={{ fontFamily, fontSize: 12, paddingLeft: 4 }}>
                        {value[0].full_name}
                        {value.length > 1 && (
                          <span style={{ color: 'var(--ls-color-text-secondary)' }}>
                            {` + ${value.length - 1} other${value.length > 2 ? 's' : ''}`}
                          </span>
                        )}
                      </span>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={`Select ${group.role_name}s`}
                      placeholder="Search employees..."
                      sx={commonSx}
                    />
                  )}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  fullWidth
                />
                <div className={sty.createActions}>
                  <Button
                    size="small"
                    onClick={() => setEditingGroup(null)}
                    sx={{ fontFamily, textTransform: 'none', fontSize: 13 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={saveMembers}
                    sx={{
                      fontFamily,
                      textTransform: 'none',
                      fontSize: 13,
                      boxShadow: 'none',
                    }}
                  >
                    Save Members
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {creating ? (
        <div className={sty.createForm}>
          <TextField
            size="small"
            label="Role Group Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            sx={commonSx}
            fullWidth
          />
          <Autocomplete
            size="small"
            options={chartData.roles.map((r) => r.role_name)}
            value={newRole || null}
            onChange={(_, val) => setNewRole(val || '')}
            renderInput={(params) => (
              <TextField {...params} label="Role" sx={commonSx} />
            )}
          />
          <Autocomplete
            size="small"
            options={chartData.departments}
            getOptionLabel={(opt) => opt.name}
            value={
              newDeptId
                ? chartData.departments.find((d) => d.id === newDeptId) || null
                : null
            }
            onChange={(_, val) => setNewDeptId(val?.id || null)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Department (optional)"
                sx={commonSx}
              />
            )}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
          />
          <div className={sty.createActions}>
            <Button
              size="small"
              onClick={() => setCreating(false)}
              sx={{ fontFamily, textTransform: 'none', fontSize: 13 }}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleCreate}
              disabled={saving || !newName.trim() || !newRole}
              sx={{
                fontFamily,
                textTransform: 'none',
                fontSize: 13,
                boxShadow: 'none',
              }}
            >
              Create
            </Button>
          </div>
        </div>
      ) : (
        <Button
          startIcon={<AddIcon />}
          onClick={() => setCreating(true)}
          sx={{
            fontFamily,
            textTransform: 'none',
            fontSize: 13,
            color: 'var(--ls-color-brand)',
          }}
        >
          Add Role Group
        </Button>
      )}

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle sx={{ fontFamily }}>Delete Role Group?</DialogTitle>
        <DialogContent sx={{ fontFamily, fontSize: 14 }}>
          This will remove the role group. Employees will remain but lose their
          group membership and any &quot;reports to&quot; assignments that reference this group.
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteId(null)}
            sx={{ fontFamily, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            sx={{ fontFamily, textTransform: 'none', boxShadow: 'none' }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

// ─── Relationships Tab ────────────────────────────────────────────────────────

function RelationshipsTab({
  chartData,
  locationId,
  onUpdate,
}: {
  chartData: OrgChartData;
  locationId: string;
  onUpdate: () => void;
}) {
  const [filterRole, setFilterRole] = React.useState<string | null>(null);

  const filtered = filterRole
    ? chartData.employees.filter((e) => e.role === filterRole)
    : chartData.employees;

  // Sort by role hierarchy level, then name
  const roleMap = new Map(chartData.roles.map((r) => [r.role_name, r]));
  const hasRoles = chartData.roles.length > 0;
  const sorted = [...filtered].sort((a, b) => {
    const la = roleMap.get(a.role)?.hierarchy_level ?? 999;
    const lb = roleMap.get(b.role)?.hierarchy_level ?? 999;
    if (la !== lb) return la - lb;
    return a.full_name.localeCompare(b.full_name);
  });

  const handleUpdateSupervisor = async (
    empId: string,
    sup: { type: 'employee' | 'group'; id: string } | null
  ) => {
    try {
      await apiPost('update_supervisor', {
        employee_id: empId,
        supervisor_type: sup?.type || null,
        supervisor_id: sup?.id || null,
      }, locationId);
      onUpdate();
    } catch (err) {
      console.error('Failed to update supervisor:', err);
    }
  };

  const handleUpdateDept = async (empId: string, deptId: string | null) => {
    try {
      await apiPost('update_employee_department', {
        employee_id: empId,
        department_id: deptId,
      }, locationId);
      onUpdate();
    } catch (err) {
      console.error('Failed to update department:', err);
    }
  };

  return (
    <div className={sty.tabContent}>
      {/* Role filter */}
      <Autocomplete
        size="small"
        options={chartData.roles.map((r) => r.role_name)}
        value={filterRole}
        onChange={(_, val) => setFilterRole(val)}
        renderInput={(params) => (
          <TextField {...params} label="Filter by Role" sx={commonSx} />
        )}
        sx={{ mb: 2 }}
      />

      {/* Employee list */}
      <div className={sty.relationshipList}>
        {sorted.map((emp) => {
          // Per-employee hierarchy-filtered supervisor options
          const empRole = roleMap.get(emp.role);
          const empLevel = empRole?.hierarchy_level ?? 999;

          const supervisorOptions: { type: 'employee' | 'group'; id: string; label: string }[] = [
            ...chartData.employees
              .filter((e) => {
                if (e.id === emp.id) return false;
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

          // Current supervisor value
          let currentSup: { type: 'employee' | 'group'; id: string } | null =
            null;
          if (emp.direct_supervisor_id) {
            currentSup = { type: 'employee', id: emp.direct_supervisor_id };
          } else if (emp.supervisor_group_id) {
            currentSup = { type: 'group', id: emp.supervisor_group_id };
          }

          const currentSupOption = currentSup
            ? supervisorOptions.find(
                (o) => o.type === currentSup!.type && o.id === currentSup!.id
              )
            : null;

          return (
            <div key={emp.id} className={sty.relItem}>
              <div className={sty.relHeader}>
                <span className={sty.relName}>{emp.full_name}</span>
                <span className={sty.relRole}>{emp.role}</span>
              </div>
              <div className={sty.relFields}>
                <Autocomplete
                  size="small"
                  options={supervisorOptions}
                  getOptionLabel={(opt) => opt.label}
                  value={currentSupOption || null}
                  onChange={(_, val) =>
                    handleUpdateSupervisor(
                      emp.id,
                      val ? { type: val.type, id: val.id } : null
                    )
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Reports to"
                      sx={commonSx}
                    />
                  )}
                  isOptionEqualToValue={(opt, val) =>
                    opt.type === val.type && opt.id === val.id
                  }
                  sx={{ flex: 1 }}
                />
                <Autocomplete
                  size="small"
                  options={chartData.departments}
                  getOptionLabel={(opt) => opt.name}
                  value={
                    emp.department_id
                      ? chartData.departments.find(
                          (d) => d.id === emp.department_id
                        ) || null
                      : null
                  }
                  onChange={(_, val) =>
                    handleUpdateDept(emp.id, val?.id || null)
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Department" sx={commonSx} />
                  )}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  sx={{ flex: 1 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Config Panel ────────────────────────────────────────────────────────

export function ConfigPanel({
  open,
  onClose,
  chartData,
  locationId,
  onUpdate,
  initialTab,
  focusGroupId,
}: ConfigPanelProps) {
  const [tab, setTab] = React.useState(initialTab ?? 0);

  // Sync tab when initialTab changes (e.g. clicking a group opens to Groups tab)
  React.useEffect(() => {
    if (initialTab !== undefined && open) {
      setTab(initialTab);
    }
  }, [initialTab, open]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 440,
          maxWidth: '100vw',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.08)',
        },
      }}
    >
      <div className={sty.panel}>
        <div className={sty.panelHeader}>
          <h2 className={sty.panelTitle}>Configure Org Chart</h2>
          <IconButton onClick={onClose} size="small">
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </div>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            borderBottom: '1px solid var(--ls-color-border)',
            '& .MuiTab-root': {
              fontFamily,
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'none',
              minHeight: 44,
            },
          }}
        >
          <Tab label="Departments" />
          <Tab label="Role Groups" />
          <Tab label="Relationships" />
        </Tabs>

        {tab === 0 && (
          <DepartmentsTab
            chartData={chartData}
            locationId={locationId}
            onUpdate={onUpdate}
          />
        )}
        {tab === 1 && (
          <GroupsTab
            chartData={chartData}
            locationId={locationId}
            onUpdate={onUpdate}
          />
        )}
        {tab === 2 && (
          <RelationshipsTab chartData={chartData} locationId={locationId} onUpdate={onUpdate} />
        )}
      </div>
    </Drawer>
  );
}
