# Drawer Tab Container Implementation Guide

## Overview
The `DrawerTabContainer` component is a comprehensive, self-contained drawer content component that displays employee information across 4 tabs: Pathway, Positional Excellence, Evaluations, and Discipline.

## Component Created
**Path**: `components/CodeComponents/DrawerTabContainer.tsx`

## Features

### 4-Tab Interface
1. **Pathway** - Coming soon placeholder
2. **Positional Excellence** - Coming soon placeholder
3. **Evaluations** - Coming soon placeholder
4. **Discipline** - Fully implemented with:
   - Current period summary metrics (90-day window)
   - List of infractions with details
   - List of disciplinary actions taken
   - Empty state cards
   - "Record an Action" button

### Discipline Tab Details

#### Metrics Section
- **Infractions Count**: Total number of infractions in last 90 days
- **Discipline Points**: Sum of all infraction points in last 90 days

#### Infractions List
Each infraction displays:
- Infraction type/description
- Date of infraction
- Leader who documented it
- Acknowledgement status ("Notified", "Notified not present", etc.)
- Points (color-coded: red for positive, green for negative)

#### Disciplinary Actions List
Each action displays:
- Action taken (e.g., "Documented Warning")
- Date of action
- Leader who took the action

## Usage in Plasmic Studio

### Step 1: Setup the Drawer
```
1. Add MuiDrawerV2 component to your page
2. Set up state: $state.drawerOpen (boolean)
3. Set up state: $state.selectedEmployee (object)
4. Configure MuiDrawerV2 props:
   - open: $state.drawerOpen
   - onOpenChange: (open) => $state.drawerOpen = open
   - placement: "right"
   - size: "large" (or width: "620")
   - title: Create a title slot with employee name and role:
     • Add a vertical stack in the title slot
     • First element: Text showing $state.selectedEmployee.full_name
       - Font: Satoshi, 18px, weight 600, color #414651
     • Second element: Text showing $state.selectedEmployee.role
       - Font: Satoshi, 14px, weight 400, color #535862
```

### Step 2: Add DrawerTabContainer
```
1. Inside the MuiDrawerV2 children slot, add DrawerTabContainer
2. Configure props:
   - employee: $state.selectedEmployee
   - initialTab: "discipline"
   - orgId: Your org ID (or from $ctx.auth.org_id)
   - locationId: Your location ID (or from $ctx.auth.location_id)
   - onRecordAction: Open your "Record Action" modal

Note: The employee name and role are NOT in the DrawerTabContainer - 
they go in the drawer's title slot (see Step 1)
```

### Step 3: Connect DisciplineTable
```
1. Add onRowClick handler to DisciplineTable:
   onRowClick: (employee) => {
     $state.selectedEmployee = employee;
     $state.drawerOpen = true;
   }
```

## Database Schema Requirements

The component queries these tables:

### infractions table
**Required fields**:
- `id` (string)
- `employee_id` (string) - FK to employees
- `points` (number)
- `infraction_date` (timestamp)
- `org_id` (string)
- `location_id` (string)

**Optional fields** (from Plasmic data source):
- `infraction` (string) - Type/description
- `description` (string) - Additional details
- `leader_id` (string) - FK to employees (who documented)
- `leader_name` (string) - Can come from JOIN
- `acknowledgement` (string) - Status

### disc_actions table
**Required fields**:
- `id` (string)
- `employee_id` (string) - FK to employees
- `action` (string) - Action type
- `action_date` (timestamp)
- `org_id` (string)
- `location_id` (string)

**Optional fields**:
- `action_id` (string) - FK to disc_actions_rubric
- `leader_id` (string) - FK to employees (who took action)
- `leader_name` (string) - Can come from JOIN
- `notes` (string)

## Current Implementation

The component currently queries infractions and disc_actions using basic SELECT queries. If your database has foreign keys set up for leader information, you can enhance the queries with JOINs.

### To Add JOINs (if schema supports it):

In `DrawerTabContainer.tsx`, lines 124-163, you can update the queries to:

```typescript
// Infractions with leader JOIN
const { data: infractionsData, error: infractionsError } = await supabase
  .from('infractions')
  .select(`
    *,
    leader:employees!infractions_leader_id_fkey(full_name)
  `)
  .eq('employee_id', employee.id)
  // ... rest of query

// Transform to add leader_name
const transformedInfractions = infractionsData.map((inf: any) => ({
  ...inf,
  leader_name: inf.leader?.full_name
}));

// Disciplinary actions with leader and rubric JOIN
const { data: actionsData, error: actionsError } = await supabase
  .from('disc_actions')
  .select(`
    *,
    leader:employees!disc_actions_leader_id_fkey(full_name),
    action_details:disc_actions_rubric!disc_actions_action_id_fkey(action)
  `)
  .eq('employee_id', employee.id)
  // ... rest of query

// Transform to add leader_name and action description
const transformedActions = actionsData.map((act: any) => ({
  ...act,
  leader_name: act.leader?.full_name,
  action: act.action_details?.action || act.action
}));
```

## Integration Example

### Complete Setup in Plasmic:

```
Page Structure:
└─ DisciplineTable
   ├─ onRowClick: (employee) => {
   │     $state.selectedEmployee = employee
   │     $state.drawerOpen = true
   │  }
   
└─ MuiDrawerV2
   ├─ open: $state.drawerOpen
   ├─ onOpenChange: (open) => $state.drawerOpen = open
   ├─ placement: "right"
   ├─ size: "large"
   │
   └─ children:
       └─ DrawerTabContainer
           ├─ employee: $state.selectedEmployee
           ├─ initialTab: "discipline"
           ├─ orgId: "your-org-id"
           ├─ locationId: "your-location-id"
           └─ onRecordAction: () => $state.recordActionModalOpen = true
```

## Styling

The component matches Plasmic design system exactly:

**Fonts**:
- Primary font: Satoshi (all text except large point numbers)
- Point numbers: Inter, sans-serif (24px, weight 600)

**Colors** (from Plasmic tokens):
- Main text: #414651 (rgba(65, 70, 81, 1))
- Secondary text: #535862 (rgba(83, 88, 98, 1))
- Positive points (green): #178459 (rgba(23, 132, 89, 1))
- Negative points (red): #d23230 (--token-kv72MHA99lrw)
- Border: #e9eaeb (--token-bGw1ZBUIaR08)
- Brand green (buttons, tabs): #31664a

**Components Match**:
- List items: Exact match to SlideoutListItem2 component
- Metric cards: Exact match to Discipline page metric cards
- All spacing, borders, shadows match Plasmic design

## Empty States

When there's no data to display, the component shows:
- "No infractions in the last 90 days" card
- "No disciplinary actions in the last 90 days" card

These match the style shown in your screenshots.

## Performance

- Data fetching is triggered only when employee changes
- Queries are filtered to last 90 days for performance
- Loading state shows skeleton loaders
- Memoized calculations for total points

## Next Steps

1. **Verify Database Schema**:
   - Check if `infractions` table has `leader_id` field
   - Check if `disc_actions` table exists and has correct structure
   - Check if foreign keys are set up for JOINs

2. **Test in Plasmic Studio**:
   - Add DrawerTabContainer to a page
   - Connect it to $state.selectedEmployee
   - Test with real employee data

3. **Enhance Queries** (if schema supports it):
   - Add JOINs for leader names
   - Add JOIN for action descriptions from disc_actions_rubric

4. **Add Record Action Modal**:
   - Connect onRecordAction to your modal
   - Implement form to record new actions
   - Refresh data after recording

## Troubleshooting

### Data not loading?
- Check browser console for errors
- Verify orgId and locationId are being passed correctly
- Verify employee object has an id field

### Leader names not showing?
- Check if leader_id field exists in infractions/disc_actions tables
- Update queries to include JOINs if foreign keys exist
- Or populate leader_name directly in the database

### Points calculation wrong?
- Verify points field is numeric in database
- Check that infraction_date filtering is working
- Verify last 90 days calculation

## Support

If you need to customize:
- **Tab order**: Modify the Tabs component order in the render
- **Metrics**: Adjust the calculation in useMemo
- **Styling**: Update the MUI sx props
- **Data fetching**: Modify the fetchEmployeeData callback
- **Empty states**: Update the conditional rendering text

The component is fully self-contained and handles its own data fetching, loading states, and error handling.

