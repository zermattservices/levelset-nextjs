import * as React from 'react';
import { Handle, Position } from '@xyflow/react';
import { getRoleColor } from '@/lib/role-utils';
import type { OrgChartEmployee, OrgChartRole, OrgGroupWithMembers } from '@/lib/org-chart-types';
import sty from './GroupBoxNode.module.css';

interface GroupBoxData {
  group: OrgGroupWithMembers;
  members: OrgChartEmployee[];
  role: OrgChartRole | undefined;
  onSelectEmployee: (id: string) => void;
  onClickGroup?: (groupId: string) => void;
}

function GroupBoxNodeInner({ data }: { data: GroupBoxData }) {
  const { group, members, role, onSelectEmployee, onClickGroup } = data;
  const roleColor = getRoleColor(role?.color);

  const handleBoxClick = React.useCallback(() => {
    if (onClickGroup) onClickGroup(group.id);
  }, [onClickGroup, group.id]);

  return (
    <div className={sty.box} onClick={handleBoxClick}>
      <div className={sty.bgFill} style={{ backgroundColor: roleColor.bg }} />

      <Handle type="target" position={Position.Top} id="target" className={sty.handle} />

      <div className={sty.header}>
        <span className={sty.groupName}>{group.name}</span>
        <span className={sty.memberCount}>{members.length}</span>
      </div>

      <div className={sty.members}>
        {members.map((emp) => {
          const initials =
            `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase();

          return (
            <button
              key={emp.id}
              className={sty.memberCard}
              onClick={(e) => {
                e.stopPropagation();
                onSelectEmployee(emp.id);
              }}
              style={{ borderLeftColor: roleColor.text }}
            >
              <div
                className={sty.cardAvatar}
                style={{
                  backgroundColor: roleColor.bg,
                  color: roleColor.text,
                }}
              >
                {initials}
              </div>
              <div className={sty.cardInfo}>
                <span className={sty.cardName}>{emp.full_name}</span>
                {emp.title && (
                  <span className={sty.cardTitle}>{emp.title}</span>
                )}
                <span
                  className={sty.cardRoleBadge}
                  style={{ backgroundColor: roleColor.bg, color: roleColor.text }}
                >
                  {emp.role}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <Handle type="source" position={Position.Bottom} id="source" className={sty.handle} />
    </div>
  );
}

export const GroupBoxNode = React.memo(GroupBoxNodeInner);
