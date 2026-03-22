-- Enable realtime on the ratings table so the dashboard receives live updates
-- when new ratings are submitted (e.g. from the mobile app)
ALTER PUBLICATION supabase_realtime ADD TABLE ratings;

-- Set replica identity to FULL so filtered realtime subscriptions work correctly.
-- With DEFAULT identity, Supabase can only evaluate filters on INSERT events.
-- FULL ensures UPDATE and DELETE events also include all columns for filter evaluation.
ALTER TABLE ratings REPLICA IDENTITY FULL;
