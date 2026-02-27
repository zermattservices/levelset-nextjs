import * as React from 'react';
import { TextField } from '@mui/material';
import { ROLE_COLOR_KEYS, DEFAULT_ROLE_COLORS } from '@/lib/role-utils';
import styles from './OrgStructureStep.module.css';

interface RoleLevel {
  name: string;
  level: number;
  isLeader: boolean;
  color: string;
}

interface OrgStructureStepProps {
  orgId: string;
  initialData: { roles: RoleLevel[] } | null;
  onComplete: (data: { roles: RoleLevel[] }) => void;
  onBack?: () => void;
}

const MUI_INPUT_SX = {
  '& .MuiOutlinedInput-root': {
    fontFamily: '"Satoshi", system-ui, sans-serif',
    fontSize: '14px',
    borderRadius: '8px',
  },
  '& .MuiInputLabel-root': {
    fontFamily: '"Satoshi", system-ui, sans-serif',
    fontSize: '14px',
  },
};

const MAX_LEVELS = 8;

function getDefaultRoles(): RoleLevel[] {
  return [
    { name: 'Operator', level: 0, isLeader: true, color: ROLE_COLOR_KEYS[0] },
    { name: '', level: 1, isLeader: true, color: ROLE_COLOR_KEYS[1] },
    { name: '', level: 2, isLeader: true, color: ROLE_COLOR_KEYS[2] },
    { name: '', level: 3, isLeader: false, color: ROLE_COLOR_KEYS[3] },
  ];
}

/**
 * SVG connector drawing fork lines between parent and child levels.
 * Uses viewBox 0-100 for x (percentage-based) with non-scaling-stroke
 * so lines are always 1.5px regardless of actual width.
 */
function TreeConnector({ level }: { level: number }) {
  const numParents = Math.pow(2, level - 1);
  const numChildren = Math.pow(2, level);
  const parentW = 100 / numParents;
  const childW = 100 / numChildren;
  const stroke = '#d4d4d8';

  return (
    <svg
      viewBox="0 0 100 24"
      preserveAspectRatio="none"
      className={styles.connectorSvg}
      style={{ height: 24 }}
    >
      {Array.from({ length: numParents }).map((_, p) => {
        const px = parentW * p + parentW / 2;
        const lx = childW * (p * 2) + childW / 2;
        const rx = childW * (p * 2 + 1) + childW / 2;

        return (
          <g key={p}>
            <line x1={px} y1={0} x2={px} y2={12} stroke={stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            <line x1={lx} y1={12} x2={rx} y2={12} stroke={stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            <line x1={lx} y1={12} x2={lx} y2={24} stroke={stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            <line x1={rx} y1={12} x2={rx} y2={24} stroke={stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          </g>
        );
      })}
    </svg>
  );
}

export function OrgStructureStep({ orgId, initialData, onComplete, onBack }: OrgStructureStepProps) {
  const [roles, setRoles] = React.useState<RoleLevel[]>(
    initialData?.roles || getDefaultRoles()
  );
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const updateRole = (index: number, name: string) => {
    setRoles(prev => prev.map((r, i) => i === index ? { ...r, name } : r));
  };

  const addLevel = () => {
    if (roles.length >= MAX_LEVELS) return;
    const nextLevel = roles.length;
    const nextColor = ROLE_COLOR_KEYS[nextLevel % ROLE_COLOR_KEYS.length];
    setRoles(prev => [
      ...prev,
      { name: '', level: nextLevel, isLeader: false, color: nextColor },
    ]);
  };

  const removeLevel = (index: number) => {
    if (index === 0 || roles.length <= 2) return;
    setRoles(prev => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((r, i) => ({ ...r, level: i }));
    });
  };

  const handleSubmit = () => {
    setError(null);
    for (let i = 1; i < roles.length; i++) {
      if (!roles[i].name.trim()) {
        setError(`Please enter a name for level ${i}`);
        return;
      }
    }
    const names = roles.map(r => r.name.trim().toLowerCase());
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      setError('Each role must have a unique name');
      return;
    }
    setIsSubmitting(true);
    onComplete({ roles: roles.map(r => ({ ...r, name: r.name.trim() })) });
  };

  const getColor = (colorKey: string) => {
    return DEFAULT_ROLE_COLORS[colorKey as keyof typeof DEFAULT_ROLE_COLORS] || DEFAULT_ROLE_COLORS.blue;
  };

  return (
    <div>
      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>Organization Structure</h3>
        <p className={styles.sectionDescription}>
          Define your leadership hierarchy. The Operator is always at the top.
          Add levels below for your leadership team (e.g., Director, Manager, Team Lead, Team Member).
        </p>

        <div className={styles.layoutGrid}>
          {roles.map((role, index) => {
            const color = getColor(role.color);
            const hasName = role.name.trim().length > 0;
            const boxCount = Math.min(Math.pow(2, index), 16);
            const label = index === 0 ? 'Operator' : `Level ${index}`;
            // Grid rows: level 0 = row 1, connector = row 2, level 1 = row 3, etc.
            const gridRow = index * 2 + 1;

            return (
              <React.Fragment key={index}>
                {/* Left: input field */}
                <div className={styles.inputCell} style={{ gridRow, gridColumn: 1 }}>
                  <div className={styles.levelIndicator} style={{ backgroundColor: color.text }}>
                    {index}
                  </div>
                  <div className={styles.roleInputWrapper}>
                    <TextField
                      placeholder={index === 0 ? undefined : 'Role name'}
                      value={role.name}
                      onChange={index === 0 ? undefined : (e) => updateRole(index, e.target.value)}
                      size="small"
                      fullWidth
                      disabled={index === 0}
                      sx={{
                        ...MUI_INPUT_SX,
                        ...(index === 0 ? {
                          '& .MuiOutlinedInput-root.Mui-disabled': {
                            backgroundColor: 'var(--ls-color-muted-soft)',
                          },
                          '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'var(--ls-color-muted-border)',
                          },
                          '& .MuiInputBase-input.Mui-disabled': {
                            WebkitTextFillColor: 'var(--ls-color-neutral-soft-foreground)',
                            fontWeight: 600,
                          },
                        } : {}),
                      }}
                    />
                  </div>
                  {roles.length > 2 && (
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={index > 0 ? () => removeLevel(index) : undefined}
                      title={index > 0 ? 'Remove level' : undefined}
                      style={index === 0 ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}
                      tabIndex={index === 0 ? -1 : undefined}
                    >
                      &#10005;
                    </button>
                  )}
                </div>

                {/* Right: connector lines (between levels) */}
                {index > 0 && (
                  <div className={styles.connectorCell} style={{ gridRow: gridRow - 1, gridColumn: 2 }}>
                    <TreeConnector level={index} />
                  </div>
                )}

                {/* Right: chart level row */}
                <div
                  className={styles.chartCell}
                  style={{ gridRow, gridColumn: 2, backgroundColor: color.bg }}
                >
                  {Array.from({ length: boxCount }).map((_, i) => (
                    <div
                      key={i}
                      className={`${styles.chartBox} ${index === 0 ? styles.chartBoxOperator : ''} ${!hasName && index > 0 ? styles.chartBoxEmpty : ''}`}
                      style={{ borderColor: color.text, color: color.text }}
                    >
                      {boxCount <= 8 ? label : ''}
                    </div>
                  ))}
                </div>
              </React.Fragment>
            );
          })}

          {/* Add a level button — in the chart column */}
          {roles.length < MAX_LEVELS && (
            <div
              className={styles.addBtnCell}
              style={{ gridRow: roles.length * 2 + 1, gridColumn: 2 }}
            >
              <button type="button" className={styles.addLevelBtn} onClick={addLevel}>
                + Add a level
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.navRow}>
        {onBack && (
          <button type="button" className={styles.stepBackBtn} onClick={onBack}>
            &#8592; Back
          </button>
        )}
        <button
          type="button"
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
