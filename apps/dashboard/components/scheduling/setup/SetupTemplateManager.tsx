import * as React from 'react';
import sty from './SetupTemplateManager.module.css';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import { TemplateSlotGrid } from './TemplateSlotGrid';
import { TemplatePositionGrid } from './TemplatePositionGrid';
import type { SetupTemplate, SetupTemplateSchedule, SetupTemplateSlot, Position } from '@/lib/scheduling.types';

interface SetupTemplateManagerProps {
  open: boolean;
  onClose: () => void;
  templates: SetupTemplate[];
  positions: Position[];
  onSave: (template: any) => Promise<void>;
  onDelete: (templateId: string) => Promise<void>;
  onRefetch: () => void;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_VALUES = [1, 2, 3, 4, 5, 6, 0]; // Mon=1..Sat=6, Sun=0

interface EditingTemplate {
  id?: string;
  name: string;
  zone: 'FOH' | 'BOH';
  priority: number;
  schedules: {
    day_of_week: number[];
    start_time: string;
    end_time: string;
  }[];
  slots: {
    position_id: string;
    time_slot: string;
    slot_count: number;
    is_required: boolean;
  }[];
  customBlocks: string[];
}

function makeBlankTemplate(): EditingTemplate {
  return {
    name: 'New Template',
    zone: 'FOH',
    priority: 0,
    schedules: [{
      day_of_week: [1, 2, 3, 4, 5],
      start_time: '06:00',
      end_time: '22:00',
    }],
    slots: [],
    customBlocks: [],
  };
}

/** Normalize DB time "HH:MM:SS" to grid-compatible "HH:MM". */
function normalizeTime(t: string): string {
  return t.substring(0, 5);
}

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTimeStr(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatTime12Short(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'p' : 'a';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  if (m === 0) return `${hour12}${period}`;
  return `${hour12}:${String(m).padStart(2, '0')}${period}`;
}

/** Derive block boundaries from the current editing slots. */
function deriveBlocksFromSlots(
  slots: { position_id: string; time_slot: string; slot_count: number }[],
  startTime: string,
  endTime: string,
): string[] {
  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);
  if (startMin >= endMin || slots.length === 0) return [];

  const timeMap = new Map<string, Map<string, number>>();
  for (const s of slots) {
    if (!timeMap.has(s.time_slot)) timeMap.set(s.time_slot, new Map());
    timeMap.get(s.time_slot)!.set(s.position_id, s.slot_count);
  }

  const blocks: string[] = [];
  let prevSnapshot = '';

  for (let min = startMin; min < endMin; min += 30) {
    const timeKey = minutesToTimeStr(min);
    const posMap = timeMap.get(timeKey);
    const snapshot = posMap
      ? Array.from(posMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([pid, count]) => `${pid}:${count}`)
          .join('|')
      : '';

    if (min === startMin || snapshot !== prevSnapshot) {
      blocks.push(timeKey);
    }
    prevSnapshot = snapshot;
  }

  return blocks;
}

function templateToEditing(t: SetupTemplate): EditingTemplate {
  return {
    id: t.id,
    name: t.name,
    zone: t.zone,
    priority: t.priority,
    schedules: (t.schedules ?? []).map(s => ({
      day_of_week: [...s.day_of_week],
      start_time: normalizeTime(s.start_time),
      end_time: normalizeTime(s.end_time),
    })),
    slots: (t.slots ?? []).map(s => ({
      position_id: s.position_id,
      time_slot: normalizeTime(s.time_slot),
      slot_count: s.slot_count,
      is_required: s.is_required,
    })),
    customBlocks: (t.blocks ?? [])
      .filter(b => b.is_custom)
      .map(b => normalizeTime(b.block_time)),
  };
}

export function SetupTemplateManager({
  open,
  onClose,
  templates,
  positions,
  onSave,
  onDelete,
  onRefetch,
}: SetupTemplateManagerProps) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<EditingTemplate | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [slotTab, setSlotTab] = React.useState<'positions' | 'slots'>('positions');
  const [newBlockTime, setNewBlockTime] = React.useState('');

  // Select first template on open
  React.useEffect(() => {
    if (open && templates.length > 0 && !selectedId) {
      setSelectedId(templates[0].id);
      setEditing(templateToEditing(templates[0]));
    }
  }, [open, templates]);

  // When selectedId changes, update editing
  const handleSelect = (t: SetupTemplate) => {
    setSelectedId(t.id);
    setEditing(templateToEditing(t));
    setSlotTab('positions');
  };

  const handleNew = () => {
    setSelectedId(null);
    setEditing(makeBlankTemplate());
    setSlotTab('positions');
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await onSave({
        ...(editing.id ? { id: editing.id, intent: 'update' } : { intent: 'create' }),
        name: editing.name,
        zone: editing.zone,
        priority: editing.priority,
        schedules: editing.schedules,
        slots: editing.slots,
        customBlocks: editing.customBlocks,
      });
      onRefetch();
    } catch (err) {
      console.error('Error saving template:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing?.id) return;
    if (!window.confirm(`Delete template "${editing.name}"? This cannot be undone.`)) return;
    try {
      await onDelete(editing.id);
      setSelectedId(null);
      setEditing(null);
      onRefetch();
    } catch (err) {
      console.error('Error deleting template:', err);
    }
  };

  const toggleDay = (dayValue: number) => {
    if (!editing || editing.schedules.length === 0) return;
    setEditing(prev => {
      if (!prev) return prev;
      const sched = { ...prev.schedules[0] };
      if (sched.day_of_week.includes(dayValue)) {
        sched.day_of_week = sched.day_of_week.filter(d => d !== dayValue);
      } else {
        sched.day_of_week = [...sched.day_of_week, dayValue].sort((a, b) => a - b);
      }
      return { ...prev, schedules: [sched, ...prev.schedules.slice(1)] };
    });
  };

  // Filter positions by the template's zone
  const zonePositions = React.useMemo(() => {
    if (!editing) return [];
    return positions.filter(p =>
      p.zone === editing.zone &&
      p.is_active &&
      p.position_type !== 'scheduling_only' &&
      p.scheduling_enabled !== false
    );
  }, [positions, editing?.zone]);

  // Compute enabledCells set from current slots (for Tab 2 disabled state)
  const enabledCells = React.useMemo(() => {
    if (!editing) return new Set<string>();
    const set = new Set<string>();
    for (const s of editing.slots) {
      set.add(`${s.position_id}:${s.time_slot}`);
    }
    return set;
  }, [editing?.slots]);

  // Derive blocks from the current editing state
  const derivedBlocks = React.useMemo(() => {
    if (!editing || editing.schedules.length === 0) return [];
    return deriveBlocksFromSlots(
      editing.slots,
      editing.schedules[0].start_time,
      editing.schedules[0].end_time,
    );
  }, [editing?.slots, editing?.schedules]);

  // Merge derived + custom blocks for display
  const allBlocks = React.useMemo(() => {
    const derivedSet = new Set(derivedBlocks);
    const allTimes = new Set([...derivedBlocks, ...(editing?.customBlocks ?? [])]);
    const sorted = Array.from(allTimes).sort(
      (a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b),
    );
    return sorted.map(time => ({
      time,
      isCustomOnly: !derivedSet.has(time),
    }));
  }, [derivedBlocks, editing?.customBlocks]);

  const handleAddCustomBlock = () => {
    if (!editing || !newBlockTime) return;
    const normalized = newBlockTime.substring(0, 5);
    const schedStart = editing.schedules[0]?.start_time ?? '06:00';
    const schedEnd = editing.schedules[0]?.end_time ?? '22:00';
    const blockMin = parseTimeToMinutes(normalized);
    if (blockMin < parseTimeToMinutes(schedStart) || blockMin >= parseTimeToMinutes(schedEnd)) return;
    if (editing.customBlocks.includes(normalized)) return;
    setEditing(prev => prev ? {
      ...prev,
      customBlocks: [...prev.customBlocks, normalized],
    } : prev);
    setNewBlockTime('');
  };

  const handleRemoveCustomBlock = (time: string) => {
    setEditing(prev => prev ? {
      ...prev,
      customBlocks: prev.customBlocks.filter(t => t !== time),
    } : prev);
  };

  if (!open) return null;

  return (
    <div className={sty.overlay} onClick={onClose}>
      <div className={sty.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={sty.header}>
          <h2 className={sty.headerTitle}>Manage Setup Templates</h2>
          <button className={sty.closeBtn} onClick={onClose}>
            <CloseIcon sx={{ fontSize: 20 }} />
          </button>
        </div>

        <div className={sty.body}>
          {/* Sidebar */}
          <div className={sty.sidebar}>
            <div className={sty.templateList}>
              {templates.map(t => (
                <button
                  key={t.id}
                  className={`${sty.templateItem} ${selectedId === t.id ? sty.templateItemActive : ''}`}
                  onClick={() => handleSelect(t)}
                >
                  <span className={sty.templateName}>{t.name}</span>
                  <span className={sty.templateZone}>{t.zone}</span>
                </button>
              ))}
            </div>
            <button className={sty.newTemplateBtn} onClick={handleNew}>
              <AddIcon sx={{ fontSize: 16 }} />
              <span>New Template</span>
            </button>
          </div>

          {/* Main editor */}
          <div className={sty.editor}>
            {!editing ? (
              <div className={sty.editorEmpty}>
                Select a template or create a new one
              </div>
            ) : (
              <>
                {/* Name + Zone + Priority row */}
                <div className={sty.editorRow}>
                  <div className={sty.fieldGroup}>
                    <label className={sty.fieldLabel}>Template Name</label>
                    <input
                      className={sty.textInput}
                      value={editing.name}
                      onChange={e => setEditing(prev => prev ? { ...prev, name: e.target.value } : prev)}
                    />
                  </div>
                  <div className={sty.fieldGroup}>
                    <label className={sty.fieldLabel}>Zone</label>
                    <select
                      className={sty.selectInput}
                      value={editing.zone}
                      onChange={e => setEditing(prev => prev ? { ...prev, zone: e.target.value as 'FOH' | 'BOH' } : prev)}
                    >
                      <option value="FOH">FOH</option>
                      <option value="BOH">BOH</option>
                    </select>
                  </div>
                  <div className={sty.fieldGroup}>
                    <label className={sty.fieldLabel}>Priority</label>
                    <input
                      className={sty.numberInput}
                      type="number"
                      min={0}
                      value={editing.priority}
                      onChange={e => setEditing(prev => prev ? { ...prev, priority: parseInt(e.target.value) || 0 } : prev)}
                    />
                  </div>
                </div>

                {/* Schedule */}
                <div className={sty.scheduleSection}>
                  <label className={sty.fieldLabel}>Schedule</label>
                  <div className={sty.dayButtons}>
                    {DAY_LABELS.map((label, i) => {
                      const val = DAY_VALUES[i];
                      const isActive = editing.schedules[0]?.day_of_week.includes(val);
                      return (
                        <button
                          key={`${val}-${i}`}
                          className={`${sty.dayBtn} ${isActive ? sty.dayBtnActive : ''}`}
                          onClick={() => toggleDay(val)}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <div className={sty.timeRange}>
                    <input
                      type="time"
                      className={sty.timeInput}
                      value={editing.schedules[0]?.start_time ?? '06:00'}
                      onChange={e => setEditing(prev => {
                        if (!prev) return prev;
                        const sched = { ...prev.schedules[0], start_time: e.target.value };
                        return { ...prev, schedules: [sched, ...prev.schedules.slice(1)] };
                      })}
                    />
                    <span className={sty.timeSeparator}>to</span>
                    <input
                      type="time"
                      className={sty.timeInput}
                      value={editing.schedules[0]?.end_time ?? '22:00'}
                      onChange={e => setEditing(prev => {
                        if (!prev) return prev;
                        const sched = { ...prev.schedules[0], end_time: e.target.value };
                        return { ...prev, schedules: [sched, ...prev.schedules.slice(1)] };
                      })}
                    />
                  </div>
                </div>

                {/* Blocks */}
                <div className={sty.blocksSection}>
                  <label className={sty.fieldLabel}>Setup Blocks</label>
                  <div className={sty.blocksRow}>
                    {allBlocks.length === 0 ? (
                      <span className={sty.blocksEmpty}>No blocks yet. Add positions to generate blocks.</span>
                    ) : (
                      allBlocks.map(b => (
                        <span key={b.time} className={`${sty.blockChip} ${b.isCustomOnly ? sty.blockChipCustom : ''}`}>
                          {formatTime12Short(b.time)}
                          {b.isCustomOnly && (
                            <button
                              className={sty.blockChipRemove}
                              onClick={() => handleRemoveCustomBlock(b.time)}
                            >
                              &times;
                            </button>
                          )}
                        </span>
                      ))
                    )}
                    <div className={sty.addBlockInline}>
                      <input
                        type="time"
                        className={sty.addBlockInput}
                        value={newBlockTime}
                        onChange={e => setNewBlockTime(e.target.value)}
                      />
                      <button
                        className={sty.addBlockBtn}
                        onClick={handleAddCustomBlock}
                        disabled={!newBlockTime}
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Position Slots — Two tabs */}
                <div className={sty.slotGridSection}>
                  <div className={sty.slotTabBar}>
                    <button
                      className={`${sty.slotTabBtn} ${slotTab === 'positions' ? sty.slotTabBtnActive : ''}`}
                      onClick={() => setSlotTab('positions')}
                    >
                      Positions
                    </button>
                    <button
                      className={`${sty.slotTabBtn} ${slotTab === 'slots' ? sty.slotTabBtnActive : ''}`}
                      onClick={() => setSlotTab('slots')}
                    >
                      Slots
                    </button>
                  </div>

                  {slotTab === 'positions' ? (
                    <TemplatePositionGrid
                      positions={zonePositions}
                      slots={editing.slots}
                      startTime={editing.schedules[0]?.start_time ?? '06:00'}
                      endTime={editing.schedules[0]?.end_time ?? '22:00'}
                      onChange={newSlots => setEditing(prev => prev ? { ...prev, slots: newSlots } : prev)}
                    />
                  ) : (
                    <TemplateSlotGrid
                      positions={zonePositions}
                      slots={editing.slots}
                      startTime={editing.schedules[0]?.start_time ?? '06:00'}
                      endTime={editing.schedules[0]?.end_time ?? '22:00'}
                      onChange={newSlots => setEditing(prev => prev ? { ...prev, slots: newSlots } : prev)}
                      enabledCells={enabledCells}
                      onSwitchToPositionsTab={() => setSlotTab('positions')}
                    />
                  )}
                </div>

                {/* Footer actions */}
                <div className={sty.editorFooter}>
                  {editing.id && (
                    <button className={sty.deleteBtn} onClick={handleDelete}>
                      Delete Template
                    </button>
                  )}
                  <div className={sty.footerSpacer} />
                  <button className={sty.cancelBtn} onClick={onClose}>
                    Cancel
                  </button>
                  <button className={sty.saveBtn} onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Template'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
