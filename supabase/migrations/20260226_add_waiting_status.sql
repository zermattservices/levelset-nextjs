-- Add 'waiting' as a valid board_tasks status between 'todo' and 'in_progress'
ALTER TABLE public.board_tasks DROP CONSTRAINT IF EXISTS board_tasks_status_check;
ALTER TABLE public.board_tasks ADD CONSTRAINT board_tasks_status_check
  CHECK (status IN ('backlog', 'todo', 'waiting', 'in_progress', 'done', 'archived'));
