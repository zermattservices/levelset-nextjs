# PWA Translation Implementation Plan

## Recommended Solution: Simplified Hybrid Approach

**Strategy:** i18next for UI strings + translation columns in existing tables for dynamic content

This is the **simplest, most reliable** solution that handles both UI strings and dynamic Supabase content.

---

## Architecture Overview

### 1. UI Strings → i18next
- All buttons, labels, form text, error messages
- Stored in JSON files: `locales/en/` and `locales/es/`
- Version-controlled, easy to maintain

### 2. Dynamic Content → Database Columns
- Position names: Add `position_es` to `position_big5_labels`
- Infraction actions: Add `action_es` to `infractions_rubric`
- Big 5 labels: Add `label_1_es`, `label_2_es`, etc. to `position_big5_labels`
- Employee roles: Static enum, can be in i18next

**Why this approach?**
- ✅ No joins needed - direct column access
- ✅ Simple queries: `SELECT position, position_es FROM ...`
- ✅ Easy to add more languages later (just add more columns)
- ✅ Reliable - no complex translation table management
- ✅ Fast - no additional queries

---

## Implementation Steps

### Step 1: Database Migration

Create migration to add Spanish translation columns:

```sql
-- Add Spanish translations to position_big5_labels
ALTER TABLE position_big5_labels
  ADD COLUMN IF NOT EXISTS position_es TEXT,
  ADD COLUMN IF NOT EXISTS label_1_es TEXT,
  ADD COLUMN IF NOT EXISTS label_2_es TEXT,
  ADD COLUMN IF NOT EXISTS label_3_es TEXT,
  ADD COLUMN IF NOT EXISTS label_4_es TEXT,
  ADD COLUMN IF NOT EXISTS label_5_es TEXT;

-- Add Spanish translations to infractions_rubric
ALTER TABLE infractions_rubric
  ADD COLUMN IF NOT EXISTS action_es TEXT;

-- Add comments for documentation
COMMENT ON COLUMN position_big5_labels.position_es IS 'Spanish translation of position name';
COMMENT ON COLUMN position_big5_labels.label_1_es IS 'Spanish translation of first Big 5 label';
COMMENT ON COLUMN infractions_rubric.action_es IS 'Spanish translation of infraction action';
```

### Step 2: Install i18next

```bash
npm install i18next react-i18next
```

### Step 3: Create Translation Files

**Structure:**
```
locales/
  en/
    common.json      # Shared UI strings
    forms.json       # Form-specific strings
    errors.json      # Error messages
  es/
    common.json
    forms.json
    errors.json
```

**Example `locales/en/forms.json`:**
```json
{
  "infraction": {
    "title": "Discipline Infraction",
    "leader": "Leader name",
    "employee": "Team member",
    "infraction": "Infraction",
    "points": "Points",
    "acknowledged": "Team Member has been made aware of this infraction",
    "teamSignature": "Team member signature",
    "leaderSignature": "Leader signature",
    "date": "Infraction Date"
  },
  "ratings": {
    "title": "Positional Ratings",
    "position": "Position",
    "employee": "Team member"
  }
}
```

**Example `locales/es/forms.json`:**
```json
{
  "infraction": {
    "title": "Infracción Disciplinaria",
    "leader": "Nombre del líder",
    "employee": "Miembro del equipo",
    "infraction": "Infracción",
    "points": "Puntos",
    "acknowledged": "El miembro del equipo ha sido informado de esta infracción",
    "teamSignature": "Firma del miembro del equipo",
    "leaderSignature": "Firma del líder",
    "date": "Fecha de la infracción"
  },
  "ratings": {
    "title": "Calificaciones Posicionales",
    "position": "Posición",
    "employee": "Miembro del equipo"
  }
}
```

### Step 4: Set Up i18next Configuration

Create `lib/i18n.ts`:

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import commonEn from '../locales/en/common.json';
import commonEs from '../locales/es/common.json';
import formsEn from '../locales/en/forms.json';
import formsEs from '../locales/es/forms.json';
import errorsEn from '../locales/en/errors.json';
import errorsEs from '../locales/es/errors.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: commonEn,
        forms: formsEn,
        errors: errorsEn,
      },
      es: {
        common: commonEs,
        forms: formsEs,
        errors: errorsEs,
      },
    },
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    defaultNS: 'common',
  });

export default i18n;
```

### Step 5: Create Translation Hook for Database Content

Create `hooks/useTranslatedContent.ts`:

```typescript
import { useMobilePortal } from '@/components/mobile/MobilePortalContext';

export function useTranslatedContent() {
  // Get language from context (we'll add this to MobilePortalContext)
  const { language = 'en' } = useMobilePortal();
  
  return {
    translate: <T extends { [key: string]: any }>(
      item: T,
      field: keyof T,
      fallback?: string
    ): string => {
      if (language === 'en') {
        return item[field] || fallback || '';
      }
      
      // For Spanish, try _es field, fallback to English
      const esField = `${String(field)}_es` as keyof T;
      return (item[esField] as string) || item[field] || fallback || '';
    },
    language,
  };
}
```

### Step 6: Update Mobile Portal Context

Add language to context:

```typescript
export interface MobilePortalContextValue {
  locationId: string;
  locationName: string | null;
  locationNumber: string | null;
  token: string;
  language: 'en' | 'es'; // Add this
}
```

### Step 7: Update API Endpoints

Modify `/api/mobile/[token]/infraction-data.ts` to return both languages:

```typescript
const infractions = (rubricData ?? []).map((item) => ({
  id: item.id,
  action: item.action,        // English
  action_es: item.action_es,  // Spanish
  points: item.points ?? 0,
}));
```

Modify `/api/mobile/[token]/position-labels.ts` similarly.

### Step 8: Update Components

**Example: DisciplineInfractionForm.tsx**

```typescript
import { useTranslation } from 'react-i18next';
import { useTranslatedContent } from '@/hooks/useTranslatedContent';

export function DisciplineInfractionForm({ controls }: DisciplineInfractionFormProps) {
  const { t } = useTranslation('forms');
  const { translate } = useTranslatedContent();
  
  // Use i18next for UI strings
  <TextField label={t('infraction.leader')} />
  
  // Use translation hook for database content
  <option value={option.id}>
    {translate(option, 'action', option.action)}
  </option>
}
```

---

## Benefits of This Approach

1. **Simple**: No complex joins or translation tables
2. **Reliable**: Direct column access, no query complexity
3. **Fast**: Single query returns both languages
4. **Maintainable**: UI strings in code, dynamic content in database
5. **Scalable**: Can add more languages by adding more columns
6. **Isolated**: Only affects PWA, not rest of webapp

---

## Migration Checklist

- [ ] Create database migration for translation columns
- [ ] Install i18next dependencies
- [ ] Create translation file structure
- [ ] Set up i18next configuration
- [ ] Create `useTranslatedContent` hook
- [ ] Add language to MobilePortalContext
- [ ] Update API endpoints to return translation columns
- [ ] Update `DisciplineInfractionForm` component
- [ ] Update `PositionalRatingsForm` component
- [ ] Update all other PWA components
- [ ] Test language switching
- [ ] Add language preference persistence (localStorage)

---

## Estimated Time

- Database migration: 30 minutes
- i18next setup: 2 hours
- Component updates: 4-6 hours
- Testing: 2 hours
- **Total: 8-10 hours**

---

## Future Enhancements

If you need more languages later:
1. Add more columns: `position_fr`, `action_fr`, etc.
2. Update translation hook to support multiple languages
3. Add language to dropdown

If you need location-specific translations:
1. Add location_id to translation columns (or separate table)
2. Update queries to filter by location

