-- Fix replica identity for discipline action tables so filtered realtime subscriptions work.
-- DisciplineActionsTable subscribes with filter: location_id=eq.X
ALTER TABLE disc_actions_rubric REPLICA IDENTITY FULL;
ALTER TABLE disc_actions REPLICA IDENTITY FULL;
