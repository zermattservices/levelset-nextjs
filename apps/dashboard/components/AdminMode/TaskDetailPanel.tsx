/**
 * TaskDetailPanel
 * Side drawer for viewing/editing/creating board tasks.
 */

import * as React from 'react';
import {
  Drawer,
  TextField,
  Select,
  MenuItem,
  Autocomplete,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LockIcon from '@mui/icons-material/Lock';
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import type { BoardTask, BoardWorkstream } from '@/lib/board';
import {
  createTask,
  updateTask,
  deleteTask,
  setTaskWorkstreams,
  addTaskDependency,
  removeTaskDependency,
  fetchAllTasks,
} from '@/lib/board';
import { PRIORITY_CONFIG, formatDate } from '@/lib/roadmap';
import styles from './TaskDetailPanel.module.css';

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'To Do' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
] as const;

const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
] as const;

const STATUS_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  backlog: { bg: '#f3f4f6', text: '#6b7280' },
  todo: { bg: '#fef3c7', text: '#92400e' },
  waiting: { bg: '#fed7aa', text: '#9a3412' },
  in_progress: { bg: '#dbeafe', text: '#1e40af' },
  done: { bg: '#d1fae5', text: '#065f46' },
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface TaskDetailPanelProps {
  task: BoardTask | null; // null = create mode
  open: boolean;
  onClose: () => void;
  onSave: (task: BoardTask) => void;
  onDelete: (taskId: string) => void;
  workstreams: BoardWorkstream[];
  allTasks: BoardTask[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TaskDetailPanel({
  task,
  open,
  onClose,
  onSave,
  onDelete,
  workstreams,
  allTasks,
}: TaskDetailPanelProps) {
  const isCreateMode = task === null;

  // Form state
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState<string>('backlog');
  const [priority, setPriority] = React.useState<string>('medium');
  const [dueDate, setDueDate] = React.useState('');
  const [selectedWorkstreamIds, setSelectedWorkstreamIds] = React.useState<string[]>([]);
  const [dependencyIds, setDependencyIds] = React.useState<string[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Initialize form from task prop
  React.useEffect(() => {
    if (!open) return;

    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.due_date || '');
      setSelectedWorkstreamIds(task.workstreams?.map((ws) => ws.id) || []);
      setDependencyIds(task.dependencies?.map((dep) => dep.id) || []);
    } else {
      // Create mode defaults
      setTitle('');
      setDescription('');
      setStatus('backlog');
      setPriority('medium');
      setDueDate('');
      setSelectedWorkstreamIds([]);
      setDependencyIds([]);
    }
  }, [task, open]);

  // Compute blocked state
  const isBlocked = React.useMemo(() => {
    if (isCreateMode) return false;
    return dependencyIds.some((depId) => {
      const depTask = allTasks.find((t) => t.id === depId);
      return depTask && depTask.status !== 'done';
    });
  }, [isCreateMode, dependencyIds, allTasks]);

  // Dependents (tasks that depend on this task) - read-only
  const dependents = React.useMemo(() => {
    if (!task) return [];
    return task.dependents || [];
  }, [task]);

  // Available tasks for dependency picker (exclude self and already-added)
  const availableDependencies = React.useMemo(() => {
    const excludeIds = new Set(dependencyIds);
    if (task) excludeIds.add(task.id);
    return allTasks.filter((t) => !excludeIds.has(t.id));
  }, [allTasks, dependencyIds, task]);

  // Workstream objects for the selected IDs
  const selectedWorkstreams = React.useMemo(() => {
    return workstreams.filter((ws) => selectedWorkstreamIds.includes(ws.id));
  }, [workstreams, selectedWorkstreamIds]);

  // Dependency task objects
  const dependencyTasks = React.useMemo(() => {
    return dependencyIds
      .map((id) => allTasks.find((t) => t.id === id))
      .filter(Boolean) as BoardTask[];
  }, [dependencyIds, allTasks]);

  // ─── Save Handler ───────────────────────────────────────────────────────

  const handleSave = React.useCallback(async () => {
    if (!title.trim()) return;
    setIsSaving(true);

    try {
      if (isCreateMode) {
        // Create new task
        const created = await createTask({
          title: title.trim(),
          description: description.trim() || null,
          status: status as BoardTask['status'],
          priority: priority as BoardTask['priority'],
          due_date: dueDate || null,
        });
        if (!created) {
          setIsSaving(false);
          return;
        }

        // Set workstreams
        if (selectedWorkstreamIds.length > 0) {
          await setTaskWorkstreams(created.id, selectedWorkstreamIds);
        }

        // Set dependencies
        for (const depId of dependencyIds) {
          await addTaskDependency(created.id, depId);
        }

        // Refetch the full task to get enriched data
        const refreshed = await fetchAllTasks();
        const fullTask = refreshed.find((t) => t.id === created.id);
        onSave(fullTask || created);
      } else {
        // Update existing task
        const updated = await updateTask(task!.id, {
          title: title.trim(),
          description: description.trim() || null,
          status: status as BoardTask['status'],
          priority: priority as BoardTask['priority'],
          due_date: dueDate || null,
        });
        if (!updated) {
          setIsSaving(false);
          return;
        }

        // Update workstreams
        await setTaskWorkstreams(task!.id, selectedWorkstreamIds);

        // Handle dependency changes
        const oldDepIds = task!.dependencies?.map((d) => d.id) || [];
        const oldDeps = new Set(oldDepIds);
        const newDeps = new Set(dependencyIds);

        // Add new dependencies
        for (const depId of dependencyIds) {
          if (!oldDeps.has(depId)) {
            await addTaskDependency(task!.id, depId);
          }
        }

        // Remove old dependencies
        for (const depId of oldDepIds) {
          if (!newDeps.has(depId)) {
            await removeTaskDependency(task!.id, depId);
          }
        }

        // Refetch to get enriched data
        const refreshed = await fetchAllTasks();
        const fullTask = refreshed.find((t) => t.id === task!.id);
        onSave(fullTask || updated);
      }
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setIsSaving(false);
    }
  }, [
    title,
    description,
    status,
    priority,
    dueDate,
    selectedWorkstreamIds,
    dependencyIds,
    isCreateMode,
    task,
    onSave,
  ]);

  // ─── Delete Handler ─────────────────────────────────────────────────────

  const handleDeleteConfirm = React.useCallback(async () => {
    if (!task) return;
    setIsDeleting(true);
    try {
      const success = await deleteTask(task.id);
      if (success) {
        setDeleteDialogOpen(false);
        onDelete(task.id);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [task, onDelete]);

  // ─── Dependency Helpers ─────────────────────────────────────────────────

  const handleAddDependency = React.useCallback(
    (_event: React.SyntheticEvent, value: BoardTask | null) => {
      if (!value) return;
      setDependencyIds((prev) => [...prev, value.id]);
    },
    []
  );

  const handleRemoveDependency = React.useCallback((depId: string) => {
    setDependencyIds((prev) => prev.filter((id) => id !== depId));
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: 480,
            maxWidth: '100vw',
          },
        }}
      >
        <div className={styles.panelContent}>
          {/* Header */}
          <div className={styles.panelHeader}>
            <TextField
              className={styles.titleInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title..."
              variant="standard"
              multiline
              maxRows={3}
              InputProps={{
                disableUnderline: true,
                sx: {
                  fontFamily: '"Mont", sans-serif',
                  fontSize: 20,
                  fontWeight: 600,
                  color: '#0d1b14',
                  lineHeight: 1.3,
                },
              }}
            />
            <IconButton onClick={onClose} size="small">
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </div>

          {/* Body */}
          <div className={styles.panelBody}>
            {/* Blocked Banner */}
            {isBlocked && (
              <div className={styles.blockedBanner}>
                <LockIcon sx={{ fontSize: 16, color: '#92400e' }} />
                This task is blocked by unfinished dependencies
              </div>
            )}

            {/* Status & Priority */}
            <div className={styles.fieldRow}>
              <div>
                <p className={styles.sectionLabel}>Status</p>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  size="small"
                  fullWidth
                  sx={{
                    fontFamily: '"Satoshi", sans-serif',
                    fontSize: 13,
                    borderRadius: '8px',
                  }}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value} sx={{ fontFamily: '"Satoshi", sans-serif', fontSize: 13 }}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </div>
              <div>
                <p className={styles.sectionLabel}>Priority</p>
                <Select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  size="small"
                  fullWidth
                  sx={{
                    fontFamily: '"Satoshi", sans-serif',
                    fontSize: 13,
                    borderRadius: '8px',
                  }}
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value} sx={{ fontFamily: '"Satoshi", sans-serif', fontSize: 13 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: PRIORITY_CONFIG[opt.value as keyof typeof PRIORITY_CONFIG]?.textColor || '#999',
                          marginRight: 8,
                        }}
                      />
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <p className={styles.sectionLabel}>Due Date</p>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={styles.dateInput}
              />
            </div>

            {/* Workstreams */}
            <div>
              <p className={styles.sectionLabel}>Workstreams</p>
              <Autocomplete
                multiple
                options={workstreams.filter((ws) => ws.is_active)}
                getOptionLabel={(option) => option.name}
                value={selectedWorkstreams}
                onChange={(_event, newValue) => {
                  setSelectedWorkstreamIds(newValue.map((ws) => ws.id));
                }}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderTags={(value, getTagProps) =>
                  value.map((ws, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={ws.id}
                      label={
                        <span className={styles.workstreamChip}>
                          <span
                            className={styles.workstreamDot}
                            style={{ backgroundColor: ws.color }}
                          />
                          {ws.name}
                        </span>
                      }
                      size="small"
                      sx={{
                        fontFamily: '"Satoshi", sans-serif',
                        fontSize: 12,
                        borderRadius: '6px',
                      }}
                    />
                  ))
                }
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: option.color,
                        marginRight: 8,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontFamily: '"Satoshi", sans-serif', fontSize: 13 }}>
                      {option.name}
                    </span>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={selectedWorkstreamIds.length === 0 ? 'Select workstreams...' : ''}
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontFamily: '"Satoshi", sans-serif',
                        fontSize: 13,
                        borderRadius: '8px',
                      },
                    }}
                  />
                )}
                size="small"
              />
            </div>

            {/* Description */}
            <div>
              <p className={styles.sectionLabel}>Description</p>
              <TextField
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                multiline
                rows={4}
                fullWidth
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontFamily: '"Satoshi", sans-serif',
                    fontSize: 13,
                    borderRadius: '8px',
                  },
                }}
              />
            </div>

            {/* Dependencies: Blocked By */}
            <div>
              <p className={styles.sectionLabel}>Blocked By</p>
              {dependencyTasks.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  {dependencyTasks.map((dep) => {
                    const badgeColors = STATUS_BADGE_COLORS[dep.status] || STATUS_BADGE_COLORS.backlog;
                    return (
                      <div key={dep.id} className={styles.depItem}>
                        <span
                          className={styles.depStatus}
                          style={{
                            backgroundColor: badgeColors.bg,
                            color: badgeColors.text,
                          }}
                        >
                          {STATUS_OPTIONS.find((s) => s.value === dep.status)?.label || dep.status}
                        </span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {dep.title}
                        </span>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveDependency(dep.id)}
                          sx={{ padding: '2px' }}
                        >
                          <CloseIcon sx={{ fontSize: 14, color: '#999' }} />
                        </IconButton>
                      </div>
                    );
                  })}
                </div>
              )}
              <Autocomplete
                options={availableDependencies}
                getOptionLabel={(option) => option.title}
                value={null}
                onChange={handleAddDependency}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <span style={{ fontFamily: '"Satoshi", sans-serif', fontSize: 13 }}>
                      {option.title}
                    </span>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Add dependency..."
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontFamily: '"Satoshi", sans-serif',
                        fontSize: 13,
                        borderRadius: '8px',
                      },
                    }}
                  />
                )}
                size="small"
                clearOnBlur
                blurOnSelect
              />
            </div>

            {/* Dependents: Blocks */}
            {dependents.length > 0 && (
              <div>
                <p className={styles.sectionLabel}>Blocks</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {dependents.map((dep) => {
                    const badgeColors = STATUS_BADGE_COLORS[dep.status] || STATUS_BADGE_COLORS.backlog;
                    return (
                      <div key={dep.id} className={styles.depItem}>
                        <span
                          className={styles.depStatus}
                          style={{
                            backgroundColor: badgeColors.bg,
                            color: badgeColors.text,
                          }}
                        >
                          {STATUS_OPTIONS.find((s) => s.value === dep.status)?.label || dep.status}
                        </span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {dep.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Linked Feature */}
            {task?.roadmap_feature_id && (
              <div>
                <p className={styles.sectionLabel}>Linked Feature</p>
                <div className={styles.roadmapLink}>
                  <span style={{ fontWeight: 600 }}>Roadmap Feature</span>
                  {task.roadmap_vote_count != null && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <ThumbUpAltOutlinedIcon sx={{ fontSize: 12 }} />
                      {task.roadmap_vote_count}
                    </span>
                  )}
                  {task.roadmap_comment_count != null && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <ChatBubbleOutlineIcon sx={{ fontSize: 12 }} />
                      {task.roadmap_comment_count}
                    </span>
                  )}
                  {task.roadmap_category && (
                    <Chip
                      label={task.roadmap_category}
                      size="small"
                      sx={{
                        fontFamily: '"Satoshi", sans-serif',
                        fontSize: 10,
                        height: 18,
                        borderRadius: '4px',
                      }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Metadata */}
            {task && (
              <div className={styles.metadata}>
                <p style={{ margin: '0 0 4px' }}>
                  Created {formatDate(task.created_at)}
                </p>
                <p style={{ margin: 0 }}>
                  Updated {formatDate(task.updated_at)}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={styles.panelFooter}>
            <div>
              {!isCreateMode && task && (
                <button
                  className={styles.deleteButton}
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                  Delete
                </button>
              )}
            </div>
            <button
              className={styles.saveButton}
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
            >
              {isSaving
                ? 'Saving...'
                : isCreateMode
                  ? 'Create Task'
                  : 'Save Changes'}
            </button>
          </div>
        </div>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle
          sx={{ fontFamily: '"Mont", sans-serif', fontWeight: 600, fontSize: 18 }}
        >
          Delete Task
        </DialogTitle>
        <DialogContent>
          <p
            style={{
              fontFamily: '"Satoshi", sans-serif',
              fontSize: 14,
              margin: '0 0 8px',
            }}
          >
            Are you sure you want to delete this task?
          </p>
          <p
            style={{
              fontFamily: '"Satoshi", sans-serif',
              fontSize: 14,
              fontWeight: 600,
              margin: '0 0 16px',
            }}
          >
            {task?.title}
          </p>
          <p
            style={{
              fontFamily: '"Satoshi", sans-serif',
              fontSize: 13,
              color: '#dc2626',
              margin: '0 0 16px',
            }}
          >
            This action cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              className={styles.cancelButton}
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              className={styles.confirmDeleteButton}
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
