# Loading Optimization Implementation Guide

## Overview
This document describes the loading optimizations implemented in the Levelset application, including skeleton loaders, centered loading spinner, and MUI Drawer components.

## Completed Implementations

### 1. Loading Components Created

#### CenteredLoadingSpinner
- **Path**: `components/CodeComponents/CenteredLoadingSpinner.tsx`
- **Purpose**: Replaces the LoadingBoundary Lottie animation with a clean, centered spinner
- **Features**: 
  - Centered CircularProgress from MUI
  - Semi-transparent background overlay
  - Brand color (#31664a)
  - Registered as Plasmic code component

#### Skeleton Components
All skeleton loaders are located in `components/CodeComponents/Skeletons/`:

- **TableSkeleton**: Generic table skeleton with configurable rows/columns
- **EmployeeTableSkeleton**: Specific skeleton for RosterTable with proper styling
- **DisciplineTableSkeleton**: Matches DisciplineTable structure
- **CardSkeleton**: For metric cards with multiple variants
- **ScoreboardSkeleton**: For scoreboard tables with header and data rows

### 2. Data Components Updated

#### RosterTable
- ✅ Loading state now shows `EmployeeTableSkeleton` instead of spinner
- ✅ Optimized data fetching with `useCallback`
- ✅ Added cache headers for better performance
- **Path**: `components/CodeComponents/RosterTable.tsx`

#### DisciplineTable
- ✅ Loading state now shows `DisciplineTableSkeleton`
- **Path**: `components/CodeComponents/DisciplineTable.tsx`

#### DisciplineActionsTable
- ✅ Loading state now shows inline skeleton with proper structure
- **Path**: `components/CodeComponents/DisciplineActionsTable.tsx`

#### ScoreboardTable
- ✅ Loading state now shows `ScoreboardSkeleton`
- **Path**: `components/CodeComponents/ScoreboardTable.tsx`

#### Scoreboard
- ✅ Loading state now shows `ScoreboardSkeleton`
- **Path**: `components/CodeComponents/Scoreboard.tsx`

### 3. MUI Drawer Components Created

#### MuiDrawerV2
- **Path**: `components/CodeComponents/MuiDrawerV2.tsx`
- **Purpose**: Replaces Ant Design Drawer with MUI Drawer
- **Features**:
  - All original DrawerV2 props maintained
  - Better integration with MUI theme
  - Improved performance
  - Full Plasmic compatibility

#### Drawer Subcomponents
All located in `components/CodeComponents/DrawerComponents/`:

- **DrawerHeader**: Title and subtitle support
- **DrawerContent**: Scrollable content area
- **DrawerFooter**: Configurable button alignment
- **SlideoutListItem**: Reusable list item for drawer content

### 4. Performance Optimizations

#### SupabaseUserSession
- ✅ Memoized `userData` object to prevent unnecessary re-renders
- **Path**: `components/CodeComponents/SupabaseUserSession.tsx`

#### RosterTable
- ✅ Memoized `fetchEmployees` function
- ✅ Added cache headers to fetch requests

#### API Endpoints
- ✅ Added `Cache-Control` headers to `/api/employees`
- Cache duration: 60 seconds with stale-while-revalidate for 120 seconds

### 5. Plasmic Registration
All new components registered in `plasmic-init.ts`:
- ✅ CenteredLoadingSpinner
- ✅ All Skeleton components
- ✅ MuiDrawerV2
- ✅ All Drawer subcomponents

## Required Changes in Plasmic Studio

### LoadingBoundary Replacement

The following Plasmic components need to be updated in Plasmic Studio to replace LoadingBoundary with CenteredLoadingSpinner:

#### 1. PageLayout (PlasmicPageLayout.tsx)
**Location**: Lines 170-184
**Current**: LoadingBoundary with Lottie icon
**Replace with**: CenteredLoadingSpinner code component

**Steps**:
1. Open PageLayout in Plasmic Studio
2. Find the LoadingBoundary component
3. Delete the LoadingBoundary
4. Insert CenteredLoadingSpinner code component
5. Configure props: size=48, color="#31664a"

#### 2. Admin Page (PlasmicAdmin.tsx)  
**Note**: The Admin page uses LoadingBoundary in the discipline content tab

**Steps**:
1. Open Admin page in Plasmic Studio
2. Navigate to the Discipline Content tab
3. Replace LoadingBoundary with CenteredLoadingSpinner or remove it entirely (RosterTable has its own loading state)

#### 3. Discipline Page (PlasmicDiscipline.tsx)
**Location**: Lines 652-1206 (LoadingBoundary with Lottie animation)

**Steps**:
1. Open Discipline page in Plasmic Studio
2. Find the LoadingBoundary at the page level
3. Replace with CenteredLoadingSpinner
4. The tables (DisciplineTable, DisciplineActionsTable) have their own skeleton loaders

### Using MuiDrawerV2

The new MuiDrawerV2 component is available in Plasmic as "Drawer V2 (MUI)". To use it:

1. Replace existing DrawerV2 instances with MuiDrawerV2
2. All props are compatible - no code changes needed
3. Use nested components:
   - DrawerHeader for title/subtitle
   - DrawerContent for main content
   - DrawerFooter for buttons
   - SlideoutListItem for list items

## Testing Checklist

- [ ] Homepage loads with proper skeleton states
- [ ] Admin page shows EmployeeTableSkeleton while loading
- [ ] Discipline page shows appropriate skeletons for both tables
- [ ] Positional Excellence pages show ScoreboardSkeleton
- [ ] Loading spinner appears centered with background mask
- [ ] All skeletons are removed when data finishes loading
- [ ] No "Loading..." text remains at top after page loads
- [ ] MuiDrawerV2 works in all instances (admin, discipline)
- [ ] All drawer subcomponents render properly
- [ ] Cache headers improve perceived performance

## Performance Impact

### Before Optimization
- Empty white screen during initial load
- "Loading..." indicator remained visible after load
- No visual feedback during data fetching
- Multiple unnecessary re-renders

### After Optimization
- Skeleton loaders show immediately
- Clear visual feedback of data structure
- Loading indicator removed after data loads
- Memoization reduces re-renders
- Cache headers reduce redundant API calls
- Better perceived performance

## Code Structure

```
components/
├── CodeComponents/
│   ├── CenteredLoadingSpinner.tsx (NEW)
│   ├── MuiDrawerV2.tsx (NEW)
│   ├── RosterTable.tsx (UPDATED)
│   ├── DisciplineTable.tsx (UPDATED)
│   ├── DisciplineActionsTable.tsx (UPDATED)
│   ├── ScoreboardTable.tsx (UPDATED)
│   ├── Scoreboard.tsx (UPDATED)
│   ├── SupabaseUserSession.tsx (UPDATED)
│   ├── Skeletons/ (NEW)
│   │   ├── TableSkeleton.tsx
│   │   ├── EmployeeTableSkeleton.tsx
│   │   ├── DisciplineTableSkeleton.tsx
│   │   ├── CardSkeleton.tsx
│   │   └── ScoreboardSkeleton.tsx
│   └── DrawerComponents/ (NEW)
│       ├── DrawerHeader.tsx
│       ├── DrawerContent.tsx
│       ├── DrawerFooter.tsx
│       └── SlideoutListItem.tsx
├── plasmic/ (Generated by Plasmic - Update in Studio)
│   └── levelset_v_2/
│       ├── PlasmicPageLayout.tsx
│       ├── PlasmicAdmin.tsx
│       └── PlasmicDiscipline.tsx
└── pages/
    └── api/
        └── employees.ts (UPDATED)
```

## Future Improvements

1. **React Query Integration**: Consider adding React Query for more advanced caching
2. **Database Indexes**: Add indexes on frequently queried columns (org_id, location_id, active)
3. **Pagination**: Implement pagination for large employee lists
4. **Optimistic Updates**: Already implemented in RosterTable, consider for other tables
5. **Error Boundaries**: Add React error boundaries for better error handling
6. **Loading States**: Add partial loading states (e.g., refresh without full skeleton)

## Maintenance Notes

- Skeleton components match the exact structure of their data components
- All loading states are now consistent across the application
- MUI Drawer provides better theming and performance than Ant Design
- Cache durations can be adjusted in API endpoints based on data volatility
- Memoization should be used carefully to avoid stale closures

## Support

For questions or issues with the loading optimization:
1. Check component props in plasmic-init.ts
2. Verify skeleton components match data table structure
3. Ensure Plasmic Studio has latest component registrations
4. Test loading states in development mode

