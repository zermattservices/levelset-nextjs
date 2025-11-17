# PWA Translation Options

This document outlines different approaches for implementing multi-language support in the Levelset Mobile PWA, along with complexity assessments.

## Current State

- Language dropdown has been added to the top-right corner of the mobile portal
- Currently supports English (en) and Spanish (es) selection
- No translation functionality is implemented yet

## Translation Options

### Option 1: Simple String Replacement (Low Complexity)

**Approach:** Create translation files with key-value pairs for all UI strings.

**Implementation:**
- Create `locales/en.json` and `locales/es.json` files
- Use a simple translation hook: `useTranslation()` that returns `t(key)`
- Replace hardcoded strings with translation keys

**Example:**
```typescript
// locales/en.json
{
  "forms.infraction.title": "Discipline Infraction",
  "forms.infraction.leader": "Leader name",
  "forms.infraction.employee": "Team member"
}

// Usage
const { t } = useTranslation();
<Typography>{t('forms.infraction.title')}</Typography>
```

**Complexity:** ⭐ Low
- **Time Estimate:** 2-4 hours
- **Maintenance:** Easy - just add new keys to both files
- **Limitations:** 
  - Static content only
  - No dynamic content translation (employee names, infraction types, etc.)
  - No pluralization support

**Best For:** UI labels, buttons, form field labels, helper text

---

### Option 2: i18next with React Integration (Medium Complexity)

**Approach:** Use the industry-standard `i18next` library with React integration.

**Implementation:**
- Install `i18next` and `react-i18next`
- Create translation namespaces (e.g., `common`, `forms`, `errors`)
- Use `useTranslation()` hook throughout components
- Support for interpolation, pluralization, and context

**Example:**
```typescript
// locales/en/forms.json
{
  "infraction": {
    "title": "Discipline Infraction",
    "leader": "Leader name",
    "points": "{{count}} point",
    "points_plural": "{{count}} points"
  }
}

// Usage
const { t } = useTranslation('forms');
<Typography>{t('infraction.title')}</Typography>
<Typography>{t('infraction.points', { count: 5 })}</Typography>
```

**Complexity:** ⭐⭐ Medium
- **Time Estimate:** 4-8 hours
- **Maintenance:** Moderate - structured namespaces help organization
- **Advantages:**
  - Industry standard, well-documented
  - Supports pluralization, interpolation, context
  - Can lazy-load translation files
  - Supports date/number formatting per locale
- **Limitations:**
  - Still doesn't translate dynamic database content
  - Requires refactoring all string literals

**Best For:** Full UI translation with pluralization and formatting needs

---

### Option 3: Database-Driven Translation (High Complexity)

**Approach:** Store translations in Supabase database tables, allowing dynamic content translation.

**Implementation:**
- Create `translations` table with columns: `key`, `locale`, `value`, `context`
- Create `position_translations` table for position names
- Create `infraction_translations` table for infraction types
- Fetch translations based on selected language
- Cache translations in React context or localStorage

**Database Schema:**
```sql
CREATE TABLE translations (
  id UUID PRIMARY KEY,
  key TEXT NOT NULL,
  locale TEXT NOT NULL, -- 'en' or 'es'
  value TEXT NOT NULL,
  context TEXT, -- 'ui', 'form', 'error', etc.
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE position_translations (
  id UUID PRIMARY KEY,
  position_id UUID REFERENCES position_labels(id),
  locale TEXT NOT NULL,
  translated_name TEXT NOT NULL
);

CREATE TABLE infraction_translations (
  id UUID PRIMARY KEY,
  infraction_id UUID REFERENCES infractions_rubric(id),
  locale TEXT NOT NULL,
  translated_action TEXT NOT NULL
);
```

**Complexity:** ⭐⭐⭐ High
- **Time Estimate:** 16-24 hours
- **Maintenance:** Complex - requires database management
- **Advantages:**
  - Can translate dynamic content (position names, infraction types)
  - Non-technical users can update translations via admin UI
  - Supports unlimited languages
  - Can have location-specific translations
- **Challenges:**
  - Requires API changes to fetch translations
  - More complex caching strategy
  - Need to handle missing translations gracefully
  - Performance considerations (querying translations)

**Best For:** Full translation including dynamic database content

---

### Option 4: Hybrid Approach (Medium-High Complexity)

**Approach:** Combine Option 2 (i18next) for UI strings with Option 3 (database) for dynamic content.

**Implementation:**
- Use `i18next` for all static UI strings (buttons, labels, messages)
- Use database translations for:
  - Position names
  - Infraction types/actions
  - Employee roles
  - Any other database-driven content

**Complexity:** ⭐⭐⭐ Medium-High
- **Time Estimate:** 12-20 hours
- **Maintenance:** Moderate - split between code and database
- **Advantages:**
  - Best of both worlds
  - UI strings are version-controlled
  - Dynamic content is database-managed
  - Can update translations without code deployment
- **Challenges:**
  - Two translation systems to maintain
  - Need to coordinate between code and database

**Best For:** Production-ready solution with full translation coverage

---

## Recommendation

For the initial implementation, I recommend **Option 2 (i18next)** because:

1. **Balanced complexity:** Not too simple (lacks features) or too complex (database overhead)
2. **Industry standard:** Well-documented, widely used, easy for future developers
3. **Sufficient for MVP:** Covers all UI strings, which is the primary translation need
4. **Upgrade path:** Can later add database translations for dynamic content (Option 4)

**Migration Path:**
1. Start with Option 2 for UI strings
2. If position/infraction translation is needed later, add database tables
3. Integrate both systems (Option 4) when needed

---

## Implementation Checklist (Option 2 - i18next)

- [ ] Install dependencies: `npm install i18next react-i18next`
- [ ] Create translation files structure:
  - `locales/en/common.json`
  - `locales/en/forms.json`
  - `locales/en/errors.json`
  - `locales/es/common.json`
  - `locales/es/forms.json`
  - `locales/es/errors.json`
- [ ] Set up i18next configuration
- [ ] Create `useTranslation` hook wrapper
- [ ] Replace strings in `DisciplineInfractionForm.tsx`
- [ ] Replace strings in `PositionalRatingsForm.tsx`
- [ ] Replace strings in `pages/mobile/[token].tsx`
- [ ] Replace strings in `FormDrawer.tsx`
- [ ] Replace strings in `PasswordModal.tsx`
- [ ] Test language switching
- [ ] Add language preference to localStorage (persist selection)

---

## Questions to Consider

1. **Do we need to translate position names?** (e.g., "Host" → "Anfitrión")
   - If yes: Consider Option 3 or 4
   - If no: Option 2 is sufficient

2. **Do we need to translate infraction types?** (e.g., "Tardy" → "Retraso")
   - If yes: Consider Option 3 or 4
   - If no: Option 2 is sufficient

3. **Who will maintain translations?**
   - Developers: Option 2 is fine
   - Non-technical staff: Option 3 or 4 allows admin UI

4. **Do we need location-specific translations?**
   - If yes: Option 3 or 4 required
   - If no: Option 2 is sufficient

