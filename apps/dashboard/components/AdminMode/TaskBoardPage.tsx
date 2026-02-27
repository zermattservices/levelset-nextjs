/**
 * TaskBoardPage
 * Admin kanban board for managing internal tasks with drag-and-drop.
 */

import * as React from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  TextField,
  InputAdornment,
  Chip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  Skeleton,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import LockIcon from '@mui/icons-material/Lock';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { BoardTask, BoardWorkstream } from '@/lib/board';
import {
  fetchAllTasks,
  createTask,
  updateTask,
  deleteTask,
  moveTask,
  fetchWorkstreams,
  createWorkstream,
  updateWorkstream,
  deleteWorkstream,
  setTaskWorkstreams,
  syncRoadmapFeatures,
} from '@/lib/board';
import { PRIORITY_CONFIG, formatDate } from '@/lib/roadmap';
import { TaskDetailPanel } from './TaskDetailPanel';
import styles from './TaskBoardPage.module.css';

// ─── Constants ──────────────────────────────────────────────────────────────

const BOARD_COLUMNS = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
] as const;

const COLUMN_IDS = new Set(BOARD_COLUMNS.map((c) => c.id as string));

const WORKSTREAM_COLORS = [
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#84cc16',
  '#6366f1',
];

// ─── Sortable Task Card ─────────────────────────────────────────────────────

interface TaskCardProps {
  task: BoardTask;
  onClick: () => void;
  isOverlay?: boolean;
}

function TaskCard({ task, onClick, isOverlay }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  const style: React.CSSProperties = isOverlay
    ? {}
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  const isOverdue =
    task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  const isBlocked =
    task.dependencies &&
    task.dependencies.length > 0 &&
    task.dependencies.some((dep) => dep.status !== 'done');

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger click when drag was happening
    if (isDragging) return;
    onClick();
  };

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      className={`${isOverlay ? styles.cardOverlay : styles.card} ${isDragging ? styles.cardDragging : ''}`}
      onClick={handleClick}
      {...(isOverlay ? {} : { ...listeners, ...attributes })}
    >
      <div
        className={styles.cardPriorityBorder}
        style={{ backgroundColor: priorityConfig.textColor }}
      />
      <p className={styles.cardTitle}>{task.title}</p>
      <div className={styles.cardMeta}>
        {task.workstreams &&
          task.workstreams.map((ws) => (
            <span
              key={ws.id}
              className={styles.workstreamDot}
              style={{ backgroundColor: ws.color }}
              title={ws.name}
            />
          ))}
        {task.due_date && (
          <span
            className={`${styles.dueDateBadge} ${isOverdue ? styles.dueDateOverdue : ''}`}
          >
            <CalendarTodayIcon sx={{ fontSize: 11 }} />
            {new Date(task.due_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )}
        {isBlocked && <span className={styles.blockedBadge}>Blocked</span>}
        {task.roadmap_feature_id && (
          <span className={styles.roadmapBadge}>
            Feature
            {task.roadmap_vote_count != null && task.roadmap_vote_count > 0 && (
              <>
                {' '}
                <ThumbUpAltOutlinedIcon sx={{ fontSize: 10 }} />{' '}
                {task.roadmap_vote_count}
              </>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Droppable Column ───────────────────────────────────────────────────────

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: BoardTask[];
  onTaskClick: (task: BoardTask) => void;
}

function KanbanColumn({ id, title, tasks, onTaskClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className={`${styles.column} ${isOver ? styles.columnDropTarget : ''}`}>
      <div className={styles.columnHeader}>
        <span>{title}</span>
        <span className={styles.columnCount}>{tasks.length}</span>
      </div>
      <div ref={setNodeRef} className={styles.columnBody}>
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 ? (
            <div className={styles.emptyColumn}>No tasks</div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function TaskBoardPage() {
  // Core state
  const [tasks, setTasks] = React.useState<BoardTask[]>([]);
  const [workstreams, setWorkstreams] = React.useState<BoardWorkstream[]>([]);
  const [selectedWorkstreamId, setSelectedWorkstreamId] = React.useState<
    string | null
  >(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedTask, setSelectedTask] = React.useState<BoardTask | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isCreateMode, setIsCreateMode] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'error';
  }>({ open: false, message: '', severity: 'info' });
  const [activeId, setActiveId] = React.useState<string | null>(null);

  // Workstream dialog state
  const [wsDialogOpen, setWsDialogOpen] = React.useState(false);
  const [editingWorkstream, setEditingWorkstream] =
    React.useState<BoardWorkstream | null>(null);
  const [wsName, setWsName] = React.useState('');
  const [wsDescription, setWsDescription] = React.useState('');
  const [wsColor, setWsColor] = React.useState(WORKSTREAM_COLORS[0]);
  const [wsLoading, setWsLoading] = React.useState(false);

  // ─── DnD Sensor ─────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // ─── Data Loading ───────────────────────────────────────────────────────

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [tasksData, workstreamsData] = await Promise.all([
          fetchAllTasks(),
          fetchWorkstreams(),
        ]);
        setTasks(tasksData);
        setWorkstreams(workstreamsData);

        // Sync roadmap features in the background
        const syncCount = await syncRoadmapFeatures();
        if (syncCount > 0) {
          // Refetch tasks to pick up the newly synced ones
          const refreshed = await fetchAllTasks();
          setTasks(refreshed);
          setSnackbar({
            open: true,
            message: `Synced ${syncCount} roadmap feature${syncCount > 1 ? 's' : ''}`,
            severity: 'info',
          });
        }
      } catch (error) {
        console.error('Error loading board data:', error);
        setSnackbar({
          open: true,
          message: 'Failed to load board data',
          severity: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // ─── Filtering ──────────────────────────────────────────────────────────

  const filteredTasks = React.useMemo(() => {
    return tasks.filter((task) => {
      // Workstream filter
      if (selectedWorkstreamId) {
        const hasWorkstream = task.workstreams?.some(
          (ws) => ws.id === selectedWorkstreamId
        );
        if (!hasWorkstream) return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!task.title.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [tasks, selectedWorkstreamId, searchQuery]);

  const columnTasks = React.useMemo(() => {
    const grouped: Record<string, BoardTask[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      done: [],
    };
    for (const task of filteredTasks) {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    }
    return grouped;
  }, [filteredTasks]);

  // ─── Drag and Drop ─────────────────────────────────────────────────────

  const activeTask = React.useMemo(() => {
    if (!activeId) return null;
    return tasks.find((t) => t.id === activeId) || null;
  }, [activeId, tasks]);

  const handleDragStart = React.useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = React.useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;

      const taskId = active.id as string;
      const overId = over.id as string;

      // Determine the target column
      let targetColumn: string | null = null;
      if (COLUMN_IDS.has(overId)) {
        targetColumn = overId;
      } else {
        // Over another card - find that card's column
        const overTask = tasks.find((t) => t.id === overId);
        if (overTask) {
          targetColumn = overTask.status;
        }
      }

      if (!targetColumn) return;

      const currentTask = tasks.find((t) => t.id === taskId);
      if (!currentTask) return;

      // If same column and same position, do nothing
      if (currentTask.status === targetColumn) return;

      // Optimistic update
      const previousTasks = [...tasks];
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: targetColumn as BoardTask['status'] }
            : t
        )
      );

      // API call
      const result = await moveTask(taskId, targetColumn, 0);
      if (!result) {
        // Revert on failure
        setTasks(previousTasks);
        setSnackbar({
          open: true,
          message: 'Failed to move task',
          severity: 'error',
        });
      }
    },
    [tasks]
  );

  // ─── Task Actions ───────────────────────────────────────────────────────

  const handleTaskClick = React.useCallback((task: BoardTask) => {
    setSelectedTask(task);
    setIsCreateMode(false);
    setIsDetailOpen(true);
  }, []);

  const handleAddTask = React.useCallback(() => {
    setSelectedTask(null);
    setIsCreateMode(true);
    setIsDetailOpen(true);
  }, []);

  const handleDetailClose = React.useCallback(() => {
    setIsDetailOpen(false);
    setSelectedTask(null);
    setIsCreateMode(false);
  }, []);

  const handleTaskSaved = React.useCallback(
    async (savedTask: BoardTask) => {
      // Refetch all tasks to get fully enriched data (workstreams, dependencies, etc.)
      const refreshed = await fetchAllTasks();
      setTasks(refreshed);

      // Update the selected task if it's still open
      const updated = refreshed.find((t) => t.id === savedTask.id);
      if (updated && isDetailOpen) {
        setSelectedTask(updated);
      }

      setIsCreateMode(false);
      setSnackbar({
        open: true,
        message: isCreateMode ? 'Task created' : 'Task updated',
        severity: 'success',
      });
    },
    [isCreateMode, isDetailOpen]
  );

  const handleTaskDeleted = React.useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setIsDetailOpen(false);
    setSelectedTask(null);
    setSnackbar({
      open: true,
      message: 'Task deleted',
      severity: 'success',
    });
  }, []);

  // ─── Workstream Actions ─────────────────────────────────────────────────

  const openWsDialog = React.useCallback(
    (ws: BoardWorkstream | null = null) => {
      setEditingWorkstream(ws);
      setWsName(ws?.name || '');
      setWsDescription(ws?.description || '');
      setWsColor(ws?.color || WORKSTREAM_COLORS[0]);
      setWsDialogOpen(true);
    },
    []
  );

  const handleWsSave = React.useCallback(async () => {
    if (!wsName.trim()) return;
    setWsLoading(true);
    try {
      if (editingWorkstream) {
        await updateWorkstream(editingWorkstream.id, {
          name: wsName.trim(),
          description: wsDescription.trim() || null,
          color: wsColor,
        });
      } else {
        await createWorkstream({
          name: wsName.trim(),
          description: wsDescription.trim() || null,
          color: wsColor,
          position: workstreams.length,
        });
      }
      const refreshed = await fetchWorkstreams();
      setWorkstreams(refreshed);
      setWsDialogOpen(false);
      setSnackbar({
        open: true,
        message: editingWorkstream ? 'Workstream updated' : 'Workstream created',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error saving workstream:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save workstream',
        severity: 'error',
      });
    } finally {
      setWsLoading(false);
    }
  }, [editingWorkstream, wsName, wsDescription, wsColor, workstreams.length]);

  const handleWsDelete = React.useCallback(async () => {
    if (!editingWorkstream) return;
    setWsLoading(true);
    try {
      await deleteWorkstream(editingWorkstream.id);
      const refreshed = await fetchWorkstreams();
      setWorkstreams(refreshed);
      if (selectedWorkstreamId === editingWorkstream.id) {
        setSelectedWorkstreamId(null);
      }
      setWsDialogOpen(false);
      setSnackbar({
        open: true,
        message: 'Workstream deleted',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error deleting workstream:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete workstream',
        severity: 'error',
      });
    } finally {
      setWsLoading(false);
    }
  }, [editingWorkstream, selectedWorkstreamId]);

  // ─── Render ─────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className={styles.boardRoot}>
        <div className={styles.boardHeader}>
          <Skeleton variant="text" width={120} height={32} />
          <div style={{ flex: 1 }} />
          <Skeleton variant="rectangular" width={200} height={36} sx={{ borderRadius: '8px' }} />
        </div>
        <div className={styles.columnsContainer}>
          {BOARD_COLUMNS.map((col) => (
            <div key={col.id} className={styles.column}>
              <div className={styles.columnHeader}>
                <Skeleton variant="text" width={80} />
              </div>
              <div className={styles.columnBody}>
                {[1, 2, 3].map((i) => (
                  <Skeleton
                    key={i}
                    variant="rectangular"
                    height={80}
                    sx={{ borderRadius: '8px', mb: 1 }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.boardRoot}>
      {/* Board Header */}
      <div className={styles.boardHeader}>
        <h2 className={styles.boardTitle}>Task Board</h2>
        <div className={styles.filterChips}>
          <Chip
            label="All"
            size="small"
            variant={selectedWorkstreamId === null ? 'filled' : 'outlined'}
            onClick={() => setSelectedWorkstreamId(null)}
            sx={{
              fontFamily: '"Satoshi", sans-serif',
              fontSize: 13,
              fontWeight: selectedWorkstreamId === null ? 600 : 400,
              backgroundColor:
                selectedWorkstreamId === null ? 'var(--ls-color-brand-base)' : undefined,
              color: selectedWorkstreamId === null ? '#fff' : undefined,
              '&:hover': {
                backgroundColor:
                  selectedWorkstreamId === null
                    ? 'var(--ls-color-brand-hover)'
                    : undefined,
              },
            }}
          />
          {workstreams
            .filter((ws) => ws.is_active)
            .map((ws) => (
              <Chip
                key={ws.id}
                label={ws.name}
                size="small"
                variant={selectedWorkstreamId === ws.id ? 'filled' : 'outlined'}
                onClick={() =>
                  setSelectedWorkstreamId(
                    selectedWorkstreamId === ws.id ? null : ws.id
                  )
                }
                onDelete={() => openWsDialog(ws)}
                deleteIcon={
                  <EditOutlinedIcon sx={{ fontSize: '14px !important' }} />
                }
                icon={
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: ws.color,
                      flexShrink: 0,
                    }}
                  />
                }
                sx={{
                  fontFamily: '"Satoshi", sans-serif',
                  fontSize: 13,
                  fontWeight: selectedWorkstreamId === ws.id ? 600 : 400,
                  backgroundColor:
                    selectedWorkstreamId === ws.id ? ws.color : undefined,
                  color: selectedWorkstreamId === ws.id ? '#fff' : undefined,
                  borderColor: ws.color,
                  '& .MuiChip-icon': { marginLeft: '6px', marginRight: '-2px' },
                  '& .MuiChip-deleteIcon': {
                    color:
                      selectedWorkstreamId === ws.id
                        ? 'rgba(255,255,255,0.7)'
                        : '#999',
                    '&:hover': { color: selectedWorkstreamId === ws.id ? '#fff' : '#333' },
                  },
                }}
              />
            ))}
          <Chip
            label="+ Workstream"
            size="small"
            variant="outlined"
            onClick={() => openWsDialog(null)}
            sx={{
              fontFamily: '"Satoshi", sans-serif',
              fontSize: 13,
              borderStyle: 'dashed',
              color: '#999',
              '&:hover': { borderColor: '#666', color: '#666' },
            }}
          />
        </div>
        <TextField
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          className={styles.searchField}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: '#999' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            width: 200,
            '& .MuiOutlinedInput-root': {
              fontFamily: '"Satoshi", sans-serif',
              fontSize: 13,
              borderRadius: '8px',
            },
          }}
        />
        <button className={styles.addButton} onClick={handleAddTask}>
          <AddIcon sx={{ fontSize: 18 }} />
          Add Task
        </button>
      </div>

      {/* Kanban Columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={styles.columnsContainer}>
          {BOARD_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              title={col.title}
              tasks={columnTasks[col.id] || []}
              onTaskClick={handleTaskClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} onClick={() => {}} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Detail Panel */}
      <TaskDetailPanel
        task={isCreateMode ? null : selectedTask}
        open={isDetailOpen}
        onClose={handleDetailClose}
        onSave={handleTaskSaved}
        onDelete={handleTaskDeleted}
        workstreams={workstreams}
        allTasks={tasks}
      />

      {/* Workstream Dialog */}
      <Dialog
        open={wsDialogOpen}
        onClose={() => setWsDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle
          sx={{ fontFamily: '"Mont", sans-serif', fontWeight: 600, fontSize: 18 }}
        >
          {editingWorkstream ? 'Edit Workstream' : 'New Workstream'}
        </DialogTitle>
        <DialogContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
            <TextField
              label="Name"
              value={wsName}
              onChange={(e) => setWsName(e.target.value)}
              size="small"
              fullWidth
              sx={{
                '& .MuiInputBase-root': {
                  fontFamily: '"Satoshi", sans-serif',
                },
              }}
            />
            <TextField
              label="Description"
              value={wsDescription}
              onChange={(e) => setWsDescription(e.target.value)}
              size="small"
              fullWidth
              multiline
              rows={2}
              sx={{
                '& .MuiInputBase-root': {
                  fontFamily: '"Satoshi", sans-serif',
                },
              }}
            />
            <div>
              <p
                style={{
                  fontFamily: '"Satoshi", sans-serif',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#666',
                  margin: '0 0 8px',
                }}
              >
                Color
              </p>
              <div className={styles.colorSwatches}>
                {WORKSTREAM_COLORS.map((color) => (
                  <div
                    key={color}
                    className={`${styles.colorSwatch} ${wsColor === color ? styles.colorSwatchSelected : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setWsColor(color)}
                  />
                ))}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: editingWorkstream ? 'space-between' : 'flex-end',
                gap: 8,
                marginTop: 8,
              }}
            >
              {editingWorkstream && (
                <button
                  className={styles.wsDeleteButton}
                  onClick={handleWsDelete}
                  disabled={wsLoading}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                  Delete
                </button>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className={styles.wsCancelButton}
                  onClick={() => setWsDialogOpen(false)}
                  disabled={wsLoading}
                >
                  Cancel
                </button>
                <button
                  className={styles.wsSaveButton}
                  onClick={handleWsSave}
                  disabled={wsLoading || !wsName.trim()}
                >
                  {wsLoading
                    ? 'Saving...'
                    : editingWorkstream
                      ? 'Save'
                      : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ fontFamily: '"Satoshi", sans-serif' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
