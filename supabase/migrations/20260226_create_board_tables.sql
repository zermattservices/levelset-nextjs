-- Create board management tables for admin task kanban

-- Main tasks table
CREATE TABLE IF NOT EXISTS public.board_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'backlog'
    CHECK (status IN ('backlog', 'todo', 'in_progress', 'done', 'archived')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  position INTEGER NOT NULL DEFAULT 0,
  due_date DATE,
  roadmap_feature_id UUID UNIQUE REFERENCES public.roadmap_features(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workstreams (groupings like "The Approach", "PEA v2 Launch")
CREATE TABLE IF NOT EXISTS public.board_workstreams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#10b981',
  is_active BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Junction: tasks can belong to multiple workstreams
CREATE TABLE IF NOT EXISTS public.board_task_workstreams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.board_tasks(id) ON DELETE CASCADE,
  workstream_id UUID NOT NULL REFERENCES public.board_workstreams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, workstream_id)
);

-- Task dependencies: task_id depends on depends_on_task_id
CREATE TABLE IF NOT EXISTS public.board_task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.board_tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES public.board_tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, depends_on_task_id),
  CHECK(task_id != depends_on_task_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_board_tasks_status ON public.board_tasks(status);
CREATE INDEX IF NOT EXISTS idx_board_tasks_roadmap_feature_id ON public.board_tasks(roadmap_feature_id);
CREATE INDEX IF NOT EXISTS idx_board_task_workstreams_task_id ON public.board_task_workstreams(task_id);
CREATE INDEX IF NOT EXISTS idx_board_task_workstreams_workstream_id ON public.board_task_workstreams(workstream_id);
CREATE INDEX IF NOT EXISTS idx_board_task_dependencies_task_id ON public.board_task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_board_task_dependencies_depends_on ON public.board_task_dependencies(depends_on_task_id);
