-- Fix infractions replica identity for filtered realtime subscriptions.
-- The DisciplineTable subscribes with filter: location_id=eq.X which requires
-- FULL replica identity to evaluate the filter on UPDATE/DELETE events.
ALTER TABLE infractions REPLICA IDENTITY FULL;
