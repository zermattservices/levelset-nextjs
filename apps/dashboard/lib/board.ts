import { createSupabaseClient } from '@/util/supabase/component';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BoardTask {
  id: string;
  title: string;
  description: string | null;
  status: 'backlog' | 'todo' | 'in_progress' | 'done' | 'archived';
  priority: 'critical' | 'high' | 'medium' | 'low';
  position: number;
  due_date: string | null;
  roadmap_feature_id: string | null;
  created_at: string;
  updated_at: string;
  workstreams?: BoardWorkstream[];
  dependencies?: { id: string; title: string; status: string }[];
  dependents?: { id: string; title: string; status: string }[];
  roadmap_vote_count?: number;
  roadmap_comment_count?: number;
  roadmap_category?: string;
}

export interface BoardWorkstream {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  position: number;
  created_at: string;
  updated_at: string;
  task_count?: number;
}

// ─── Status Mappings ────────────────────────────────────────────────────────

// Board status -> Roadmap status
const BOARD_TO_ROADMAP_STATUS: Record<string, string> = {
  backlog: 'idea',
  todo: 'planned',
  in_progress: 'in_progress',
  done: 'completed',
  archived: 'cancelled',
};

// Roadmap status -> Board status
const ROADMAP_TO_BOARD_STATUS: Record<string, string> = {
  submitted: 'backlog',
  idea: 'backlog',
  planned: 'todo',
  in_progress: 'in_progress',
  completed: 'done',
  cancelled: 'archived',
};

// ─── Task Functions ─────────────────────────────────────────────────────────

export async function fetchAllTasks(): Promise<BoardTask[]> {
  const supabase = createSupabaseClient();

  // Fetch all non-archived tasks
  const { data: tasks, error: tasksError } = await supabase
    .from('board_tasks')
    .select('*')
    .neq('status', 'archived')
    .order('position', { ascending: true });

  if (tasksError) {
    console.error('Error fetching board tasks:', tasksError);
    return [];
  }

  if (!tasks || tasks.length === 0) return [];

  const taskIds = tasks.map((t) => t.id);

  // Fetch workstream assignments with workstream details
  const { data: taskWorkstreams, error: twError } = await supabase
    .from('board_task_workstreams')
    .select('task_id, workstream_id, board_workstreams(id, name, description, color, is_active, position, created_at, updated_at)')
    .in('task_id', taskIds);

  if (twError) {
    console.error('Error fetching task workstreams:', twError);
  }

  // Fetch dependencies (task_id depends on depends_on_task_id)
  const { data: dependencies, error: depError } = await supabase
    .from('board_task_dependencies')
    .select('task_id, depends_on_task_id, board_tasks!board_task_dependencies_depends_on_task_id_fkey(id, title, status)')
    .in('task_id', taskIds);

  if (depError) {
    console.error('Error fetching task dependencies:', depError);
  }

  // Fetch dependents (depends_on_task_id = this task, meaning other tasks depend on it)
  const { data: dependents, error: dntError } = await supabase
    .from('board_task_dependencies')
    .select('task_id, depends_on_task_id, board_tasks!board_task_dependencies_task_id_fkey(id, title, status)')
    .in('depends_on_task_id', taskIds);

  if (dntError) {
    console.error('Error fetching task dependents:', dntError);
  }

  // Fetch roadmap data for tasks linked to roadmap features
  const roadmapFeatureIds = tasks
    .map((t) => t.roadmap_feature_id)
    .filter(Boolean) as string[];

  let roadmapMap = new Map<string, { vote_count: number; comment_count: number; category: string }>();

  if (roadmapFeatureIds.length > 0) {
    const { data: roadmapData, error: rmError } = await supabase
      .from('roadmap_features')
      .select('id, vote_count, comment_count, category')
      .in('id', roadmapFeatureIds);

    if (rmError) {
      console.error('Error fetching roadmap data:', rmError);
    } else if (roadmapData) {
      roadmapMap = new Map(roadmapData.map((r) => [r.id, r]));
    }
  }

  // Build lookup maps for workstreams per task
  const workstreamsByTask = new Map<string, BoardWorkstream[]>();
  for (const tw of taskWorkstreams || []) {
    const ws = tw.board_workstreams as any;
    if (!ws) continue;
    const existing = workstreamsByTask.get(tw.task_id) || [];
    existing.push(ws);
    workstreamsByTask.set(tw.task_id, existing);
  }

  // Build lookup maps for dependencies per task
  const dependenciesByTask = new Map<string, { id: string; title: string; status: string }[]>();
  for (const dep of dependencies || []) {
    const depTask = dep.board_tasks as any;
    if (!depTask) continue;
    const existing = dependenciesByTask.get(dep.task_id) || [];
    existing.push({ id: depTask.id, title: depTask.title, status: depTask.status });
    dependenciesByTask.set(dep.task_id, existing);
  }

  // Build lookup maps for dependents per task
  const dependentsByTask = new Map<string, { id: string; title: string; status: string }[]>();
  for (const dnt of dependents || []) {
    const dntTask = dnt.board_tasks as any;
    if (!dntTask) continue;
    const existing = dependentsByTask.get(dnt.depends_on_task_id) || [];
    existing.push({ id: dntTask.id, title: dntTask.title, status: dntTask.status });
    dependentsByTask.set(dnt.depends_on_task_id, existing);
  }

  // Assemble tasks with enriched data
  return tasks.map((task) => {
    const roadmap = task.roadmap_feature_id ? roadmapMap.get(task.roadmap_feature_id) : null;

    return {
      ...task,
      workstreams: workstreamsByTask.get(task.id) || [],
      dependencies: dependenciesByTask.get(task.id) || [],
      dependents: dependentsByTask.get(task.id) || [],
      roadmap_vote_count: roadmap?.vote_count,
      roadmap_comment_count: roadmap?.comment_count,
      roadmap_category: roadmap?.category,
    };
  });
}

export async function createTask(task: Partial<BoardTask>): Promise<BoardTask | null> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('board_tasks')
    .insert({
      title: task.title || 'Untitled Task',
      description: task.description || null,
      status: task.status || 'backlog',
      priority: task.priority || 'medium',
      position: task.position ?? 0,
      due_date: task.due_date || null,
      roadmap_feature_id: task.roadmap_feature_id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating board task:', error);
    return null;
  }

  return data;
}

export async function updateTask(id: string, updates: Partial<BoardTask>): Promise<BoardTask | null> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('board_tasks')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating board task:', error);
    return null;
  }

  return data;
}

export async function deleteTask(id: string): Promise<boolean> {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from('board_tasks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting board task:', error);
    return false;
  }

  return true;
}

export async function moveTask(
  id: string,
  newStatus: string,
  newPosition: number
): Promise<BoardTask | null> {
  const supabase = createSupabaseClient();

  // Update the board task's status and position
  const { data: task, error } = await supabase
    .from('board_tasks')
    .update({
      status: newStatus,
      position: newPosition,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error moving board task:', error);
    return null;
  }

  // If the task is linked to a roadmap feature, sync the roadmap status
  if (task.roadmap_feature_id && BOARD_TO_ROADMAP_STATUS[newStatus]) {
    const { error: rmError } = await supabase
      .from('roadmap_features')
      .update({
        status: BOARD_TO_ROADMAP_STATUS[newStatus],
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.roadmap_feature_id);

    if (rmError) {
      console.error('Error syncing roadmap feature status:', rmError);
    }
  }

  return task;
}

// ─── Workstream Functions ───────────────────────────────────────────────────

export async function fetchWorkstreams(): Promise<BoardWorkstream[]> {
  const supabase = createSupabaseClient();

  // Fetch all workstreams ordered by position
  const { data: workstreams, error: wsError } = await supabase
    .from('board_workstreams')
    .select('*')
    .order('position', { ascending: true });

  if (wsError) {
    console.error('Error fetching workstreams:', wsError);
    return [];
  }

  if (!workstreams || workstreams.length === 0) return [];

  // Fetch task counts per workstream
  const { data: counts, error: countError } = await supabase
    .from('board_task_workstreams')
    .select('workstream_id');

  if (countError) {
    console.error('Error fetching workstream task counts:', countError);
  }

  // Build count map
  const countMap = new Map<string, number>();
  for (const row of counts || []) {
    countMap.set(row.workstream_id, (countMap.get(row.workstream_id) || 0) + 1);
  }

  return workstreams.map((ws) => ({
    ...ws,
    task_count: countMap.get(ws.id) || 0,
  }));
}

export async function createWorkstream(ws: Partial<BoardWorkstream>): Promise<BoardWorkstream | null> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('board_workstreams')
    .insert({
      name: ws.name || 'Untitled Workstream',
      description: ws.description || null,
      color: ws.color || '#10b981',
      is_active: ws.is_active ?? true,
      position: ws.position ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating workstream:', error);
    return null;
  }

  return data;
}

export async function updateWorkstream(
  id: string,
  updates: Partial<BoardWorkstream>
): Promise<BoardWorkstream | null> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('board_workstreams')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating workstream:', error);
    return null;
  }

  return data;
}

export async function deleteWorkstream(id: string): Promise<boolean> {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from('board_workstreams')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting workstream:', error);
    return false;
  }

  return true;
}

// ─── Task-Workstream Assignment ─────────────────────────────────────────────

export async function setTaskWorkstreams(
  taskId: string,
  workstreamIds: string[]
): Promise<boolean> {
  const supabase = createSupabaseClient();

  // Delete all existing workstream assignments for this task
  const { error: deleteError } = await supabase
    .from('board_task_workstreams')
    .delete()
    .eq('task_id', taskId);

  if (deleteError) {
    console.error('Error clearing task workstreams:', deleteError);
    return false;
  }

  // Insert new assignments
  if (workstreamIds.length > 0) {
    const rows = workstreamIds.map((wsId) => ({
      task_id: taskId,
      workstream_id: wsId,
    }));

    const { error: insertError } = await supabase
      .from('board_task_workstreams')
      .insert(rows);

    if (insertError) {
      console.error('Error setting task workstreams:', insertError);
      return false;
    }
  }

  return true;
}

// ─── Task Dependencies ──────────────────────────────────────────────────────

export async function addTaskDependency(
  taskId: string,
  dependsOnTaskId: string
): Promise<boolean> {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from('board_task_dependencies')
    .insert({
      task_id: taskId,
      depends_on_task_id: dependsOnTaskId,
    });

  if (error) {
    console.error('Error adding task dependency:', error);
    return false;
  }

  return true;
}

export async function removeTaskDependency(
  taskId: string,
  dependsOnTaskId: string
): Promise<boolean> {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from('board_task_dependencies')
    .delete()
    .eq('task_id', taskId)
    .eq('depends_on_task_id', dependsOnTaskId);

  if (error) {
    console.error('Error removing task dependency:', error);
    return false;
  }

  return true;
}

// ─── Roadmap Sync ───────────────────────────────────────────────────────────

export async function syncRoadmapFeatures(): Promise<number> {
  const supabase = createSupabaseClient();

  // Get all roadmap_feature_ids that already have board tasks
  const { data: existingTasks, error: existingError } = await supabase
    .from('board_tasks')
    .select('roadmap_feature_id')
    .not('roadmap_feature_id', 'is', null);

  if (existingError) {
    console.error('Error fetching existing board tasks:', existingError);
    return 0;
  }

  const existingFeatureIds = new Set(
    (existingTasks || []).map((t) => t.roadmap_feature_id).filter(Boolean)
  );

  // Fetch all roadmap features
  const { data: features, error: featuresError } = await supabase
    .from('roadmap_features')
    .select('id, title, description, status, priority')
    .order('created_at', { ascending: true });

  if (featuresError) {
    console.error('Error fetching roadmap features:', featuresError);
    return 0;
  }

  // Filter to only features without a corresponding board task
  const unsynced = (features || []).filter((f) => !existingFeatureIds.has(f.id));

  if (unsynced.length === 0) return 0;

  // Create board tasks for unsynced features
  const newTasks = unsynced.map((feature, index) => ({
    title: feature.title,
    description: feature.description,
    status: ROADMAP_TO_BOARD_STATUS[feature.status] || 'backlog',
    priority: feature.priority || 'medium',
    position: index,
    roadmap_feature_id: feature.id,
  }));

  const { error: insertError } = await supabase
    .from('board_tasks')
    .insert(newTasks);

  if (insertError) {
    console.error('Error syncing roadmap features to board:', insertError);
    return 0;
  }

  return unsynced.length;
}
