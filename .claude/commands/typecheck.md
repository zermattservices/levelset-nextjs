Run a full typecheck across the monorepo.

1. Run `pnpm typecheck` from the repo root
2. If there are errors, analyze them and suggest fixes
3. Focus on errors in files that have been recently modified (check git diff)
4. Ignore pre-existing TypeScript errors in `apps/mobile/` (known issues in login.tsx and _layout.tsx with route type mismatch)
