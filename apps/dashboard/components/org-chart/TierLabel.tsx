import * as React from 'react';
import { getRoleColor } from '@/lib/role-utils';
import type { OrgChartRole } from '@/lib/org-chart-types';
import sty from './TierLabel.module.css';

interface TierLabelData {
  role: OrgChartRole;
}

function TierLabelInner({ data }: { data: TierLabelData }) {
  const { role } = data;
  const roleColor = getRoleColor(role.color);

  return (
    <div className={sty.label}>
      <span className={sty.level} style={{ color: roleColor.text }}>
        {role.hierarchy_level}
      </span>
      <span className={sty.roleName} style={{ color: roleColor.text }}>
        {role.role_name}
      </span>
    </div>
  );
}

export const TierLabel = React.memo(TierLabelInner);
