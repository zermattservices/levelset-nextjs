import * as React from 'react';
import { Handle, Position } from '@xyflow/react';
import { getRoleColor } from '@/lib/role-utils';
import type { OrgChartEmployee, OrgChartRole } from '@/lib/org-chart-types';
import sty from './EmployeeCardNode.module.css';

interface EmployeeCardData {
  employee: OrgChartEmployee;
  role: OrgChartRole | undefined;
}

function EmployeeCardNodeInner({ data }: { data: EmployeeCardData }) {
  const { employee, role } = data;
  const roleColor = getRoleColor(role?.color);
  const initials =
    `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();

  return (
    <div
      className={sty.card}
      style={{ borderLeftColor: roleColor.text }}
    >
      <Handle type="target" position={Position.Top} id="target" className={sty.handle} />

      <div
        className={sty.avatar}
        style={{ backgroundColor: roleColor.bg, color: roleColor.text }}
      >
        {initials}
      </div>

      <div className={sty.info}>
        <span className={sty.name}>{employee.full_name}</span>
        {employee.title && (
          <span className={sty.title}>{employee.title}</span>
        )}
        <span
          className={sty.roleBadge}
          style={{ backgroundColor: roleColor.bg, color: roleColor.text }}
        >
          {employee.role}
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} id="source" className={sty.handle} />
    </div>
  );
}

export const EmployeeCardNode = React.memo(EmployeeCardNodeInner);
