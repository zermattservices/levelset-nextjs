Create a new Supabase migration file for: $ARGUMENTS

1. Generate the filename using today's date in YYYYMMDD format and the description in snake_case:
   `supabase/migrations/YYYYMMDD_<description>.sql`

2. Include a header comment explaining the purpose

3. For new tables:
   - Always include `id uuid default gen_random_uuid() primary key`
   - Always include `org_id uuid not null references orgs(id)`
   - Always include `created_at timestamptz default now()`
   - Consider whether `location_id` and `updated_at` are needed
   - Enable RLS: `alter table <name> enable row level security;`
   - Add a service-role-only RLS policy

4. Check recent migrations in `supabase/migrations/` to avoid conflicts with existing columns

5. After creating the file, remind to run `pnpm db:gen-types` if the migration adds new tables or columns
