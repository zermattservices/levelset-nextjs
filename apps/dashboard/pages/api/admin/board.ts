import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { NextApiRequest, NextApiResponse } from 'next';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient();
  const { intent } = req.body;

  try {
    // ── sync-roadmap ──────────────────────────────────────────────────
    if (intent === 'sync-roadmap') {
      // Get all roadmap_feature_ids that already have board tasks
      const { data: existingTasks, error: existingError } = await supabase
        .from('board_tasks')
        .select('roadmap_feature_id')
        .not('roadmap_feature_id', 'is', null);

      if (existingError) {
        console.error('[admin/board] Error fetching existing board tasks:', existingError);
        return res.status(500).json({ error: 'Failed to fetch existing board tasks' });
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
        console.error('[admin/board] Error fetching roadmap features:', featuresError);
        return res.status(500).json({ error: 'Failed to fetch roadmap features' });
      }

      // Filter to only features without a corresponding board task
      const unsynced = (features || []).filter((f) => !existingFeatureIds.has(f.id));

      if (unsynced.length === 0) {
        return res.status(200).json({ synced: 0 });
      }

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
        console.error('[admin/board] Error inserting synced tasks:', insertError);
        return res.status(500).json({ error: 'Failed to create board tasks from roadmap' });
      }

      return res.status(200).json({ synced: unsynced.length });
    }

    // ── bulk-reorder ──────────────────────────────────────────────────
    if (intent === 'bulk-reorder') {
      const { status, taskIds } = req.body;

      if (!status || !Array.isArray(taskIds)) {
        return res.status(400).json({ error: 'Missing required fields: status, taskIds' });
      }

      // Update position for each task in the given order
      for (let i = 0; i < taskIds.length; i++) {
        const { error } = await supabase
          .from('board_tasks')
          .update({ position: i, updated_at: new Date().toISOString() })
          .eq('id', taskIds[i])
          .eq('status', status);

        if (error) {
          console.error(`[admin/board] Error reordering task ${taskIds[i]}:`, error);
          return res.status(500).json({ error: `Failed to reorder task ${taskIds[i]}` });
        }
      }

      return res.status(200).json({ success: true });
    }

    // ── move-task ─────────────────────────────────────────────────────
    if (intent === 'move-task') {
      const { taskId, newStatus, newPosition } = req.body;

      if (!taskId || !newStatus || newPosition === undefined) {
        return res.status(400).json({ error: 'Missing required fields: taskId, newStatus, newPosition' });
      }

      // Update the board task
      const { data: task, error: moveError } = await supabase
        .from('board_tasks')
        .update({
          status: newStatus,
          position: newPosition,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();

      if (moveError) {
        console.error('[admin/board] Error moving task:', moveError);
        return res.status(500).json({ error: 'Failed to move task' });
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
          console.error('[admin/board] Error syncing roadmap status:', rmError);
          // Non-fatal: the board task was already moved successfully
        }
      }

      return res.status(200).json(task);
    }

    return res.status(400).json({ error: `Unknown intent: ${intent}` });
  } catch (error: any) {
    console.error('[admin/board] Unexpected error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred', details: error?.message || 'Unknown error' });
  }
}
