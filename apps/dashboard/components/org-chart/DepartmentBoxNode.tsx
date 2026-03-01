import * as React from 'react';
import type { OrgDepartment } from '@/lib/org-chart-types';
import sty from './DepartmentBoxNode.module.css';

interface DepartmentBoxData {
  department: OrgDepartment;
  color: { bg: string; text: string };
}

function DepartmentBoxNodeInner({ data }: { data: DepartmentBoxData }) {
  const { department, color } = data;

  return (
    <div
      className={sty.box}
      style={{
        borderColor: color.text,
        borderWidth: '1.5px',
        borderStyle: 'dashed',
      }}
    >
      <div className={sty.bgFill} style={{ backgroundColor: color.bg }} />
      <div className={sty.label}>
        <span className={sty.deptName} style={{ color: color.text }}>
          {department.name}
        </span>
      </div>
    </div>
  );
}

export const DepartmentBoxNode = React.memo(DepartmentBoxNodeInner);
