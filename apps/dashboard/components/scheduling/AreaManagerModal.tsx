import * as React from 'react';
import sty from './AreaManagerModal.module.css';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckIcon from '@mui/icons-material/Check';
import type { Position } from '@/lib/scheduling.types';

const DEFAULT_COLORS = [
  '#dc6843', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#22c55e', '#ec4899', '#06b6d4', 'var(--ls-color-muted)',
];

interface AreaManagerModalProps {
  open: boolean;
  onClose: () => void;
  areas: Position[];
  onCreate: (name: string, color?: string) => Promise<void>;
  onUpdate: (id: string, params: Partial<{ name: string; color: string; display_order: number; is_active: boolean }>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function AreaManagerModal({
  open, onClose, areas, onCreate, onUpdate, onDelete,
}: AreaManagerModalProps) {
  const [newName, setNewName] = React.useState('');
  const [newColor, setNewColor] = React.useState(DEFAULT_COLORS[0]);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editColor, setEditColor] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onCreate(newName.trim(), newColor);
      setNewName('');
      setNewColor(DEFAULT_COLORS[(areas.length + 1) % DEFAULT_COLORS.length]);
    } catch (err: any) {
      setError(err.message || 'Failed to create area.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (area: Position) => {
    setEditingId(area.id);
    setEditName(area.name);
    setEditColor((area as any).color ?? '#6b7280');
  };

  const handleUpdate = async () => {
    if (!editingId || !editName.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onUpdate(editingId, { name: editName.trim(), color: editColor });
      setEditingId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update area.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Deactivate "${name}"? It will be hidden from new shifts.`)) return;
    setSaving(true);
    setError('');
    try {
      await onDelete(id);
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate area.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: '12px' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <span className={sty.modalTitle}>Manage Shift Areas</span>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 3 }}>
        {/* Existing areas */}
        <div className={sty.areaList}>
          {areas.map((area) => (
            <div key={area.id} className={sty.areaItem}>
              {editingId === area.id ? (
                <div className={sty.editRow}>
                  <span className={sty.colorDot} style={{ backgroundColor: editColor }} />
                  <input
                    className={sty.editInput}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                  />
                  <div className={sty.colorPicker}>
                    {DEFAULT_COLORS.map((c) => (
                      <button
                        key={c}
                        className={`${sty.colorOption} ${c === editColor ? sty.colorSelected : ''}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setEditColor(c)}
                      />
                    ))}
                  </div>
                  <IconButton size="small" onClick={handleUpdate} disabled={saving}>
                    <CheckIcon fontSize="small" sx={{ color: '#31664a' }} />
                  </IconButton>
                  <IconButton size="small" onClick={() => setEditingId(null)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </div>
              ) : (
                <div className={sty.viewRow}>
                  <span className={sty.colorDot} style={{ backgroundColor: (area as any).color ?? '#6b7280' }} />
                  <span className={sty.areaName}>{area.name}</span>
                  <div className={sty.areaActions}>
                    <IconButton size="small" onClick={() => startEdit(area)}>
                      <EditOutlinedIcon sx={{ fontSize: 16, color: 'var(--ls-color-muted)' }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(area.id, area.name)}>
                      <DeleteOutlineIcon sx={{ fontSize: 16, color: '#dc2626' }} />
                    </IconButton>
                  </div>
                </div>
              )}
            </div>
          ))}

          {areas.length === 0 && (
            <p className={sty.emptyText}>No shift areas yet. Create one below.</p>
          )}
        </div>

        {/* Add new area */}
        <div className={sty.addSection}>
          <div className={sty.addRow}>
            <span className={sty.colorDot} style={{ backgroundColor: newColor }} />
            <input
              className={sty.addInput}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New area name..."
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button
              className={sty.addBtn}
              onClick={handleCreate}
              disabled={saving || !newName.trim()}
            >
              Add
            </button>
          </div>
          <div className={sty.colorPicker}>
            {DEFAULT_COLORS.map((c) => (
              <button
                key={c}
                className={`${sty.colorOption} ${c === newColor ? sty.colorSelected : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setNewColor(c)}
              />
            ))}
          </div>
        </div>

        {error && <div className={sty.error}>{error}</div>}
      </DialogContent>
    </Dialog>
  );
}
