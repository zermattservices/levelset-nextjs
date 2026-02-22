/**
 * ToolCallSummary — collapsible row showing tool execution status.
 * Shows spinner while running, checkmark when done, with expandable details.
 */

import * as React from 'react';
import { useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CircularProgress from '@mui/material/CircularProgress';
import styles from './ToolCallSummary.module.css';

interface ToolCallInfo {
  id: string;
  name: string;
  label: string;
  status: 'calling' | 'done';
}

interface ToolCallSummaryProps {
  toolCalls: ToolCallInfo[];
}

const TOOL_ICONS: Record<string, React.ElementType> = {
  lookup_employee: SearchIcon,
  list_employees: PeopleOutlineIcon,
  get_employee_ratings: StarOutlineIcon,
  get_employee_infractions: WarningAmberIcon,
  get_employee_profile: PersonOutlineIcon,
  get_team_overview: GroupsOutlinedIcon,
  get_discipline_summary: DescriptionOutlinedIcon,
  get_position_rankings: BarChartOutlinedIcon,
};

function getToolIcon(toolName: string): React.ElementType {
  return TOOL_ICONS[toolName] || BuildOutlinedIcon;
}

function buildSummaryText(toolCalls: ToolCallInfo[]): string {
  if (toolCalls.length === 0) return '';
  if (toolCalls.length === 1) return toolCalls[0].label;

  const groups: Record<string, number> = {};
  for (const tc of toolCalls) {
    groups[tc.name] = (groups[tc.name] || 0) + 1;
  }

  const parts: string[] = [];
  for (const [name, count] of Object.entries(groups)) {
    const label = toolCalls.find((tc) => tc.name === name)?.label || name;
    if (count > 1) {
      parts.push(`${label} (${count}x)`);
    } else {
      parts.push(label);
    }
  }
  return parts.join(', ');
}

export function ToolCallSummary({ toolCalls }: ToolCallSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const allDone = toolCalls.every((tc) => tc.status === 'done');
  const isWorking = !allDone;

  return (
    <div className={styles.container}>
      <button
        className={styles.summaryRow}
        onClick={() => !isWorking && setExpanded(!expanded)}
        disabled={isWorking}
        type="button"
      >
        {isWorking ? (
          <CircularProgress size={14} thickness={5} sx={{ color: 'var(--ls-color-brand)' }} />
        ) : (
          <CheckCircleOutlineIcon
            style={{ fontSize: 16, color: 'var(--ls-color-success)' }}
          />
        )}

        <span className={styles.summaryText}>
          {isWorking ? 'Working...' : buildSummaryText(toolCalls)}
        </span>

        {!isWorking && (
          <span className={styles.count}>{toolCalls.length}</span>
        )}

        {!isWorking &&
          (expanded ? (
            <ExpandLessIcon style={{ fontSize: 16, color: 'var(--ls-color-text-secondary)' }} />
          ) : (
            <ExpandMoreIcon style={{ fontSize: 16, color: 'var(--ls-color-text-secondary)' }} />
          ))}
      </button>

      {expanded && (
        <div className={styles.details}>
          {toolCalls.map((tc) => {
            const Icon = getToolIcon(tc.name);
            return (
              <div key={tc.id} className={styles.detailRow}>
                <Icon
                  style={{
                    fontSize: 14,
                    color: 'var(--ls-color-text-secondary)',
                  }}
                />
                <span className={styles.detailLabel}>{tc.label}</span>
                {tc.status === 'done' && (
                  <CheckCircleOutlineIcon
                    style={{ fontSize: 14, color: 'var(--ls-color-success)' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
