import * as React from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Popover from '@mui/material/Popover';
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import BusinessIcon from '@mui/icons-material/Business';
import CircularProgress from '@mui/material/CircularProgress';
import sty from './RolesTab.module.css';
import { createSupabaseClient } from '@/util/supabase/component';
import { DEFAULT_ROLE_COLORS, ROLE_COLOR_KEYS, getUniqueRoleColor, type RoleColorKey } from '@/lib/role-utils';
import { usePermissions, P } from '@/lib/providers/PermissionsProvider';

const fontFamily = '"Satoshi", sans-serif';

const OrgLevelTag = styled(Chip)(() => ({
  fontFamily,
  fontSize: 11,
  fontWeight: 500,
  height: 22,
  backgroundColor: '#f0fdf4',
  color: '#166534',
  border: '1px solid #bbf7d0',
  '& .MuiChip-icon': {
    fontSize: 14,
    color: '#166534',
  },
}));

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
}));

interface Role {
  id: string;
  org_id: string;
  role_name: string;
  hierarchy_level: number;
  is_leader: boolean;
  is_trainer: boolean;
  color: RoleColorKey;
  employee_count?: number;
  isNew?: boolean;
}

interface RolesTabProps {
  orgId: string | null;
  disabled?: boolean;
}

export function RolesTab({ orgId, disabled = false }: RolesTabProps) {
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [colorPickerAnchor, setColorPickerAnchor] = React.useState<HTMLElement | null>(null);
  const [colorPickerRoleId, setColorPickerRoleId] = React.useState<string | null>(null);
  const [locationCount, setLocationCount] = React.useState<number>(0);

  const supabase = React.useMemo(() => createSupabaseClient(), []);
  const { has } = usePermissions();
  
  // Permission checks
  const canManageRoles = has(P.ROLES_MANAGE) && !disabled;
  const isDisabled = disabled || !canManageRoles;

  // Fetch location count for the organization
  React.useEffect(() => {
    async function fetchLocationCount() {
      if (!orgId) return;
      
      const { count } = await supabase
        .from('locations')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId);
      
      setLocationCount(count || 0);
    }
    
    fetchLocationCount();
  }, [orgId, supabase]);

  // Fetch roles and employee counts
  React.useEffect(() => {
    async function fetchRoles() {
      if (!orgId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch roles
        const { data: rolesData, error: rolesError } = await supabase
          .from('org_roles')
          .select('*')
          .eq('org_id', orgId)
          .order('hierarchy_level', { ascending: true });

        if (rolesError) throw rolesError;

        // Fetch employee counts per role (with full_name for deduplication)
        const { data: employeeCounts, error: countError } = await supabase
          .from('employees')
          .select('role, full_name')
          .eq('org_id', orgId)
          .eq('active', true);

        if (countError) throw countError;

        // Count unique employees per role (deduplicate by full_name)
        const countMap = new Map<string, Set<string>>();
        (employeeCounts || []).forEach((emp: { role: string | null; full_name: string | null }) => {
          if (emp.role && emp.full_name) {
            if (!countMap.has(emp.role)) {
              countMap.set(emp.role, new Set());
            }
            countMap.get(emp.role)!.add(emp.full_name);
          }
        });

        // Convert Set sizes to counts
        const roleCounts = new Map<string, number>();
        countMap.forEach((names, role) => roleCounts.set(role, names.size));

        // Merge employee counts into roles
        const rolesWithCounts = (rolesData || []).map(role => ({
          ...role,
          employee_count: roleCounts.get(role.role_name) || 0,
        }));

        setRoles(rolesWithCounts);
      } catch (err) {
        console.error('Error fetching roles:', err);
        setError('Failed to load roles');
      } finally {
        setLoading(false);
      }
    }

    fetchRoles();
  }, [orgId, supabase]);

  const handleRoleNameChange = async (roleId: string, newName: string) => {
    // Update local state
    setRoles(prev => prev.map(r => 
      r.id === roleId ? { ...r, role_name: newName } : r
    ));
  };

  const handleRoleNameBlur = async (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role || role.isNew) return;

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('org_roles')
        .update({ role_name: role.role_name, updated_at: new Date().toISOString() })
        .eq('id', roleId);

      if (updateError) throw updateError;
    } catch (err) {
      console.error('Error updating role name:', err);
      setError('Failed to update role name');
    } finally {
      setSaving(false);
    }
  };

  const handleColorChange = async (roleId: string, newColor: RoleColorKey) => {
    // Update local state
    setRoles(prev => prev.map(r => 
      r.id === roleId ? { ...r, color: newColor } : r
    ));

    // Close color picker
    setColorPickerAnchor(null);
    setColorPickerRoleId(null);

    // Save to database
    const role = roles.find(r => r.id === roleId);
    if (!role || role.isNew) return;

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('org_roles')
        .update({ color: newColor, updated_at: new Date().toISOString() })
        .eq('id', roleId);

      if (updateError) throw updateError;
    } catch (err) {
      console.error('Error updating role color:', err);
      setError('Failed to update role color');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRole = async () => {
    if (!orgId) return;

    const maxLevel = Math.max(...roles.map(r => r.hierarchy_level), -1);
    const usedColors = roles.map(r => r.color);
    const newRole: Role = {
      id: `temp-${Date.now()}`,
      org_id: orgId,
      role_name: 'New Role',
      hierarchy_level: maxLevel + 1,
      is_leader: false,
      is_trainer: false,
      color: getUniqueRoleColor(usedColors),
      employee_count: 0,
      isNew: true,
    };

    setRoles(prev => [...prev, newRole]);

    // Save to database
    setSaving(true);
    try {
      const { data, error: insertError } = await supabase
        .from('org_roles')
        .insert({
          org_id: orgId,
          role_name: newRole.role_name,
          hierarchy_level: newRole.hierarchy_level,
          is_leader: newRole.is_leader,
          is_trainer: newRole.is_trainer,
          color: newRole.color,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Update with real ID
      setRoles(prev => prev.map(r => 
        r.id === newRole.id ? { ...data, employee_count: 0 } : r
      ));
    } catch (err) {
      console.error('Error adding role:', err);
      setError('Failed to add role');
      // Remove the temporary role
      setRoles(prev => prev.filter(r => r.id !== newRole.id));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;

    // Don't allow deleting Operator (level 0)
    if (role.hierarchy_level === 0) {
      setError('Cannot delete the Operator role');
      return;
    }

    // Confirm if role has employees
    if (role.employee_count && role.employee_count > 0) {
      const confirmed = window.confirm(
        `This role has ${role.employee_count} employee(s). Are you sure you want to delete it?`
      );
      if (!confirmed) return;
    }

    // Remove from local state
    setRoles(prev => prev.filter(r => r.id !== roleId));

    // Delete from database
    if (!role.isNew) {
      setSaving(true);
      try {
        const { error: deleteError } = await supabase
          .from('org_roles')
          .delete()
          .eq('id', roleId);

        if (deleteError) throw deleteError;

        // Reorder remaining roles
        await reorderRoles(roles.filter(r => r.id !== roleId));
      } catch (err) {
        console.error('Error deleting role:', err);
        setError('Failed to delete role');
        // Re-fetch roles to restore state
        setLoading(true);
      } finally {
        setSaving(false);
      }
    }
  };

  const reorderRoles = async (newRoles: Role[]) => {
    // Update hierarchy levels based on position
    const updates = newRoles.map((role, index) => ({
      id: role.id,
      hierarchy_level: index,
    }));

    try {
      for (const update of updates) {
        if (!update.id.startsWith('temp-')) {
          await supabase
            .from('org_roles')
            .update({ hierarchy_level: update.hierarchy_level, updated_at: new Date().toISOString() })
            .eq('id', update.id);
        }
      }
    } catch (err) {
      console.error('Error reordering roles:', err);
      setError('Failed to reorder roles');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    // Don't allow dragging Operator (level 0)
    if (roles[index].hierarchy_level === 0) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || index === 0) return; // Can't drop at position 0 (Operator)
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || dropIndex === 0) return;

    const newRoles = [...roles];
    const [draggedRole] = newRoles.splice(draggedIndex, 1);
    
    // Ensure we don't insert at position 0
    const targetIndex = Math.max(1, dropIndex);
    newRoles.splice(targetIndex, 0, draggedRole);

    // Update hierarchy levels
    const reorderedRoles = newRoles.map((role, index) => ({
      ...role,
      hierarchy_level: index,
    }));

    setRoles(reorderedRoles);
    setDraggedIndex(null);

    // Save to database
    setSaving(true);
    await reorderRoles(reorderedRoles);
    setSaving(false);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const openColorPicker = (event: React.MouseEvent<HTMLElement>, roleId: string) => {
    setColorPickerAnchor(event.currentTarget);
    setColorPickerRoleId(roleId);
  };

  const closeColorPicker = () => {
    setColorPickerAnchor(null);
    setColorPickerRoleId(null);
  };

  if (loading) {
    return (
      <div className={sty.loadingContainer}>
        <CircularProgress size={32} sx={{ color: '#31664a' }} />
      </div>
    );
  }

  return (
    <div className={sty.container}>
      <div className={sty.intro}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 className={sty.introTitle}>Roles</h3>
          {locationCount > 1 && (
            <OrgLevelTag
              icon={<BusinessIcon />}
              label="Applies to all locations"
              size="small"
            />
          )}
        </div>
        <p className={sty.introDescription}>
          Define the roles in your organization. Drag to reorder the hierarchy (except Operator, which is always at the top).
          Click on a color to change it.
        </p>
      </div>

      {error && <div className={sty.errorMessage}>{error}</div>}

      <div className={sty.scrollContainer}>
        {/* Header */}
        <div className={sty.rolesHeader}>
          <div className={sty.headerDrag}></div>
          <div className={sty.headerLevel}>Level</div>
          <div className={sty.headerName}>Role Name</div>
          <div className={sty.headerColor}>Color</div>
          <div className={sty.headerCount}>Employees</div>
          <div className={sty.headerActions}></div>
        </div>

        {/* Role rows */}
        {roles.map((role, index) => {
          const isOperator = role.hierarchy_level === 0;
          const colorStyle = DEFAULT_ROLE_COLORS[role.color] || DEFAULT_ROLE_COLORS.blue;

          return (
            <div
              key={role.id}
              className={`${sty.roleRow} ${draggedIndex === index ? sty.dragging : ''}`}
              draggable={!isOperator && !disabled}
              onDragStart={() => !disabled && handleDragStart(index)}
              onDragOver={(e) => !disabled && handleDragOver(e, index)}
              onDrop={(e) => !disabled && handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className={sty.dragHandle}>
                {!isOperator && !disabled && (
                  <DragIndicatorIcon sx={{ color: '#9ca3af', cursor: 'grab' }} />
                )}
              </div>
              
              <div className={sty.levelCell}>
                <span className={sty.levelBadge}>{role.hierarchy_level}</span>
              </div>
              
              <div className={sty.nameCell}>
                <StyledTextField
                  value={role.role_name}
                  onChange={(e) => handleRoleNameChange(role.id, e.target.value)}
                  onBlur={() => handleRoleNameBlur(role.id)}
                  size="small"
                  fullWidth
                  disabled={isOperator || disabled}
                  placeholder="Role name"
                />
              </div>
              
              <div className={sty.colorCell}>
                <button
                  className={sty.colorSwatch}
                  style={{ backgroundColor: colorStyle.bg, borderColor: colorStyle.text }}
                  onClick={(e) => !disabled && openColorPicker(e, role.id)}
                  title={disabled ? role.color : "Click to change color"}
                  aria-label={`Color: ${role.color}`}
                  disabled={disabled}
                />
              </div>
              
              <div className={sty.countCell}>
                <span 
                  className={sty.countBadge}
                  style={{ backgroundColor: colorStyle.bg, color: colorStyle.text }}
                >
                  {role.employee_count || 0}
                </span>
              </div>
              
              <div className={sty.actionsCell}>
                {!isOperator && !disabled && (
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteRole(role.id)}
                    className={sty.deleteButton}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </div>
            </div>
          );
        })}

        {/* Add role button */}
        {!disabled && (
          <div className={sty.addRoleRow}>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddRole}
              disabled={saving}
              sx={{
                fontFamily,
                textTransform: 'none',
                color: '#31664a',
                '&:hover': {
                  backgroundColor: 'rgba(49, 102, 74, 0.08)',
                },
              }}
            >
              Add Role
            </Button>
          </div>
        )}
      </div>

      {/* Color Picker Popover */}
      <Popover
        open={Boolean(colorPickerAnchor)}
        anchorEl={colorPickerAnchor}
        onClose={closeColorPicker}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <Box sx={{ p: 1.5, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1 }}>
          {ROLE_COLOR_KEYS.map((colorKey) => {
            const colorStyle = DEFAULT_ROLE_COLORS[colorKey];
            const currentRole = roles.find(r => r.id === colorPickerRoleId);
            const isSelected = currentRole?.color === colorKey;
            return (
              <button
                key={colorKey}
                className={sty.colorPickerSwatch}
                style={{ 
                  backgroundColor: colorStyle.bg, 
                  borderColor: isSelected ? colorStyle.text : 'transparent',
                }}
                onClick={() => colorPickerRoleId && handleColorChange(colorPickerRoleId, colorKey)}
                title={colorKey}
                aria-label={`Select ${colorKey} color`}
              />
            );
          })}
        </Box>
      </Popover>

      {saving && (
        <div className={sty.savingIndicator}>
          <CircularProgress size={16} sx={{ color: '#31664a' }} />
          <span>Saving...</span>
        </div>
      )}
    </div>
  );
}

export default RolesTab;
