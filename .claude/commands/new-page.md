Create a new dashboard page named "$ARGUMENTS".

Follow the exact pattern used by existing pages:

1. Create the thin page wrapper at `apps/dashboard/pages/<kebab-name>.tsx`:
   - Import React, the page component, and AppProviders
   - Export a default function that wraps the component in AppProviders
   - No logic in this file

2. Create the page component at `apps/dashboard/components/pages/<PascalName>.tsx`:
   - This is where all logic and JSX goes
   - Import styles from the co-located CSS module
   - Use `useColors()` or design token CSS variables for colors

3. Create the CSS module at `apps/dashboard/components/pages/<PascalName>.module.css`:
   - Use CSS variables from design tokens (e.g., `var(--ls-color-brand-base)`)
   - Never hardcode hex color values

4. Add translation keys to both `apps/dashboard/locales/en/common.json` and `apps/dashboard/locales/es/common.json`

Reference existing pages like `roster.tsx` / `components/pages/Roster.tsx` for the exact pattern.
