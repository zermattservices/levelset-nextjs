# Disciplinary Action Recommendations - Implementation Plan

## Overview
This plan outlines the implementation of a feature that prompts users about employees who need disciplinary action based on their point totals in the DisciplineTable, according to thresholds defined in `disc_actions_rubric`.

## Current State Analysis

### Existing Components
1. **DisciplineTable** (`components/CodeComponents/DisciplineTable.tsx`)
   - Displays employees with their current point totals
   - Already fetches `disc_actions_rubric` data for badge styling
   - Uses `v_employee_infraction_rollup` view or manual calculation for points

2. **DisciplineActionsTable** (`components/CodeComponents/DisciplineActionsTable.tsx`)
   - Displays the rubric of disciplinary actions with point thresholds
   - Shows actions from `disc_actions_rubric` table

3. **disc_actions_rubric** table structure:
   - `id`: string
   - `action`: string (e.g., "Documented Warning", "Write Up 1")
   - `points_threshold`: number (threshold for triggering this action)
   - `org_id`: string
   - `location_id`: string

### Data Flow
- Employee points are calculated from `infractions` table
- Points accumulate over time (no automatic expiration mentioned)
- Thresholds are defined per org/location in `disc_actions_rubric`

## Implementation Plan

### Phase 1: Recommendation Logic & Data Structure

#### 1.1 Create Recommendation Calculation Function
**File**: `lib/discipline-recommendations.ts` (new file)

**Functionality**:
- Calculate recommended actions for each employee
- Compare employee `current_points` against `disc_actions_rubric` thresholds
- Return the highest threshold that has been crossed (or all thresholds crossed, depending on UX decision)
- Consider only active employees

**Key Logic**:
```typescript
interface RecommendedAction {
  employee_id: string;
  employee_name: string;
  current_points: number;
  recommended_action: string; // from disc_actions_rubric.action
  action_id: string; // from disc_actions_rubric.id
  points_threshold: number;
  threshold_exceeded_by: number; // current_points - points_threshold
  has_existing_action: boolean; // check if action already recorded in disc_actions table
}
```

**Questions to Resolve**:
- ❓ Should we recommend the highest threshold crossed, or all thresholds that have been crossed?
- ❓ Should we check if a disciplinary action has already been taken for this threshold? (i.e., if employee has 30 points and "Write Up 1" threshold is 30, but they already have a "Write Up 1" action recorded, should we still recommend it?)
- ❓ Should recommendations expire after a certain time period?

#### 1.2 Database Considerations
**Option A: Calculate On-the-Fly (Recommended)**
- No database changes needed
- Calculate recommendations dynamically when page loads
- Pros: Always accurate, no stale data
- Cons: Slight performance overhead

**Option B: Store Recommendations**
- Create `recommended_actions` table
- Track when recommendations were created
- Mark as dismissed/acknowledged
- Pros: Can track acknowledgment, better performance
- Cons: Need to keep in sync with points changes

**Recommendation**: Start with Option A, can migrate to Option B if needed

### Phase 2: UI Component - Recommendation Alert/List

#### 2.1 Create RecommendedActions Component
**File**: `components/CodeComponents/RecommendedActions.tsx` (new file)

**Features**:
- Display list of employees needing disciplinary action
- Show employee name, current points, and recommended action
- Visual prominence (alert banner, notification section, or modal)
- Quick action buttons (e.g., "View Employee", "Record Action")

**UI Options**:
1. **Alert Banner** (Top of discipline page)
   - Non-intrusive, always visible
   - Shows count of recommendations
   - Expandable to see full list

2. **Notification Section** (Above DisciplineTable)
   - Dedicated section for recommendations
   - Shows full list with action buttons
   - Can be collapsed/expanded

3. **Modal/Dialog** (On page load)
   - Forces attention
   - Can be dismissed
   - Good for critical recommendations

4. **Inline Badges** (In DisciplineTable rows)
   - Visual indicators on affected rows
   - Less prominent but always visible

**Recommendation**: Combination of #2 (Notification Section) + #4 (Inline Badges)

**Questions to Resolve**:
- ❓ What should the visual design look like? (alert colors, icons, layout)
- ❓ Should recommendations be dismissible/acknowledgeable?
- ❓ Should we show a count badge or always show full list?

#### 2.2 Integration Points
- Add `RecommendedActions` component to `pages/discipline.tsx` or `PlasmicDiscipline.tsx`
- Position above or below `DisciplineTable`
- Pass `orgId` and `locationId` props

### Phase 3: RecommendedActions Component Implementation

#### 3.1 Component Structure
```typescript
interface RecommendedActionsProps {
  orgId: string;
  locationId: string;
  onViewEmployee?: (employeeId: string) => void;
  onRecordAction?: (employeeId: string, actionId: string) => void;
  className?: string;
}
```

#### 3.2 Data Fetching
- Fetch discipline data (same as DisciplineTable)
- Fetch `disc_actions_rubric` for thresholds
- Fetch `disc_actions` to check if actions already taken
- Calculate recommendations in real-time

#### 3.3 Filtering Logic
- Only show employees with points >= any threshold
- Optionally filter out employees who already have the recommended action recorded
- Sort by points (highest first) or by threshold severity

### Phase 4: Enhanced DisciplineTable Integration

#### 4.1 Add Visual Indicators
- Add badge/icon to rows where recommendations exist
- Highlight rows with recommendations
- Tooltip showing recommended action

#### 4.2 Click Actions
- When clicking recommended row, show recommended action in drawer
- Quick action button to record the recommended action

### Phase 5: Testing & Edge Cases

#### 5.1 Edge Cases to Handle
- Employee with 0 points (no recommendations)
- Employee with points but no thresholds configured
- Multiple thresholds crossed (show highest or all?)
- Employee already has action recorded for threshold
- Thresholds changed after employee crossed them
- Empty state (no recommendations)

#### 5.2 Performance Considerations
- Efficient queries (use views if available)
- Memoization of calculations
- Debounce if real-time updates are enabled

## Questions for Stakeholder Review

### Critical Questions:
1. **Recommendation Display**:
   - Should we show the highest threshold crossed, or all thresholds that have been crossed?
   - Should we only show recommendations for thresholds that haven't been acted upon yet?

2. **UI/UX Preference**:
   - How prominent should recommendations be? (Alert banner, notification section, modal, or inline badges)
   - Should recommendations be dismissible/acknowledgeable?
   - Should we show a count badge or always show the full list?

3. **Action Tracking**:
   - Should we check if a disciplinary action has already been recorded for a threshold before recommending it?
   - If an employee has 30 points and "Write Up 1" (threshold 30) was already recorded, should we still recommend "Write Up 2" (threshold 50) if they haven't reached it yet?

4. **Data Persistence**:
   - Should recommendations be calculated on-the-fly or stored in the database?
   - Should we track which recommendations have been viewed/dismissed?

5. **Filtering**:
   - Should we filter recommendations by any criteria? (e.g., only active employees, only recent infractions, etc.)

6. **Integration**:
   - Should clicking a recommendation open the employee's discipline drawer with the recommended action pre-selected?
   - Should there be a quick "Record Action" button that creates the disciplinary action record?

## Implementation Steps (After Questions Resolved)

1. ✅ Create `lib/discipline-recommendations.ts` with calculation logic
2. ✅ Create `components/CodeComponents/RecommendedActions.tsx` component
3. ✅ Add RecommendedActions to discipline page
4. ✅ Enhance DisciplineTable with recommendation indicators
5. ✅ Add click handlers for quick actions
6. ✅ Test with various scenarios
7. ✅ Handle edge cases and empty states
8. ✅ Add loading states and error handling

## Files to Create/Modify

### New Files:
- `lib/discipline-recommendations.ts` - Recommendation calculation logic
- `components/CodeComponents/RecommendedActions.tsx` - UI component
- `components/CodeComponents/Skeletons/RecommendedActionsSkeleton.tsx` - Loading skeleton (if needed)

### Files to Modify:
- `pages/discipline.tsx` or `components/plasmic/levelset_v_2/PlasmicDiscipline.tsx` - Add RecommendedActions component
- `components/CodeComponents/DisciplineTable.tsx` - Add recommendation indicators/badges
- `lib/supabase.types.ts` - Add RecommendedAction interface (if needed)

## Next Steps

1. **Review this plan** and answer the questions above
2. **Confirm UI/UX preferences** for recommendation display
3. **Clarify business rules** for when recommendations should appear
4. **Begin implementation** once requirements are finalized
