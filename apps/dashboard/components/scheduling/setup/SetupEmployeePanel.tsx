import * as React from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import sty from './SetupEmployeePanel.module.css';
import SearchIcon from '@mui/icons-material/Search';
import type { Shift, SetupAssignment } from '@/lib/scheduling.types';

interface AvailableEmployee {
  id: string;
  full_name: string;
  role: string;
  is_foh: boolean;
  is_boh: boolean;
  shift: Shift;
  currentAssignment: SetupAssignment | null;
}

interface SetupEmployeePanelProps {
  employees: AvailableEmployee[];
}

function formatTime12(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'p' : 'a';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  if (m === 0) return `${hour12}${period}`;
  return `${hour12}:${String(m).padStart(2, '0')}${period}`;
}

export function SetupEmployeePanel({ employees }: SetupEmployeePanelProps) {
  const [search, setSearch] = React.useState('');

  // Make the entire panel a droppable target for unassigning
  const { setNodeRef: setPanelRef, isOver } = useDroppable({
    id: 'employee-panel',
    data: { type: 'panel' },
  });

  const filtered = React.useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(e => e.full_name.toLowerCase().includes(q));
  }, [employees, search]);

  const unassigned = filtered.filter(e => !e.currentAssignment);
  const assigned = filtered.filter(e => e.currentAssignment);

  return (
    <div ref={setPanelRef} className={`${sty.panel} ${isOver ? sty.panelOver : ''}`}>
      <div className={sty.header}>
        <span className={sty.headerTitle}>Employees</span>
        <span className={sty.headerCount}>{employees.length}</span>
      </div>

      <div className={sty.searchContainer}>
        <SearchIcon sx={{ fontSize: 16, color: 'var(--ls-color-muted)' }} />
        <input
          className={sty.searchInput}
          placeholder="Search employees..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className={sty.employeeList}>
        {unassigned.length > 0 && (
          <div className={sty.section}>
            <span className={sty.sectionLabel}>Unassigned ({unassigned.length})</span>
            {unassigned.map(emp => (
              <DraggableEmployeeCard key={emp.id} employee={emp} />
            ))}
          </div>
        )}

        {assigned.length > 0 && (
          <div className={sty.section}>
            <span className={sty.sectionLabel}>Assigned ({assigned.length})</span>
            {assigned.map(emp => (
              <DraggableEmployeeCard key={emp.id} employee={emp} />
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className={sty.emptyState}>
            {search ? 'No matching employees' : 'No employees scheduled'}
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableEmployeeCard({ employee }: { employee: AvailableEmployee }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `employee-${employee.id}`,
    data: {
      type: 'employee',
      employeeId: employee.id,
      shiftId: employee.shift.id,
    },
  });

  const shiftTime = `${formatTime12(employee.shift.start_time)} – ${formatTime12(employee.shift.end_time)}`;
  const assignedTo = employee.currentAssignment?.position?.name;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`${sty.employeeCard} ${isDragging ? sty.employeeCardDragging : ''} ${employee.currentAssignment ? sty.employeeCardAssigned : ''}`}
    >
      <div className={sty.employeeInfo}>
        <span className={sty.employeeName}>{employee.full_name}</span>
        <span className={sty.employeeShift}>{shiftTime}</span>
      </div>
      {assignedTo && (
        <span className={sty.assignedBadge}>→ {assignedTo}</span>
      )}
    </div>
  );
}
