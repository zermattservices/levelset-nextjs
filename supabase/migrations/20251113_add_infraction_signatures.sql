ALTER TABLE public.infractions
ADD COLUMN IF NOT EXISTS leader_signature TEXT,
ADD COLUMN IF NOT EXISTS team_member_signature TEXT;

COMMENT ON COLUMN public.infractions.leader_signature IS 'Name or mark of the leader completing the infraction form.';
COMMENT ON COLUMN public.infractions.team_member_signature IS 'Acknowledgement from the team member when present.';

