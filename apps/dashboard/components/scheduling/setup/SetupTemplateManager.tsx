import * as React from 'react';
import sty from './SetupTemplateManager.module.css';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import { TemplateSlotGrid } from './TemplateSlotGrid';
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
  };
}

function templateToEditing(t: SetupTemplate): EditingTemplate {
  return {
    id: t.id,
    name: t.name,
    zone: t.zone,
    priority: t.priority,
    schedules: (t.schedules ?? []).map(s => ({
      day_of_week: [...s.day_of_week],
      start_time: s.start_time,
      end_time: s.end_time,
    })),
    slots: (t.slots ?? []).map(s => ({
      position_id: s.position_id,
      time_slot: s.time_slot,
      slot_count: s.slot_count,
      is_required: s.is_required,
    })),
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
  };

  const handleNew = () => {
    setSelectedId(null);
    setEditing(makeBlankTemplate());
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

                {/* Slot Grid */}
                <div className={sty.slotGridSection}>
                  <label className={sty.fieldLabel}>Position Slots</label>
                  <TemplateSlotGrid
                    positions={zonePositions}
                    slots={editing.slots}
                    startTime={editing.schedules[0]?.start_time ?? '06:00'}
                    endTime={editing.schedules[0]?.end_time ?? '22:00'}
                    onChange={newSlots => setEditing(prev => prev ? { ...prev, slots: newSlots } : prev)}
                  />
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
