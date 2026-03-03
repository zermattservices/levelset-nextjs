# Home Page "Today" Card Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the mobile home page's quick action cards (Submit Rating, Submit Infraction, Manage Team) with a "Today" card showing the employee's setup assignments, shifts, or scheduling status for the current day.

**Architecture:** New API endpoint `/api/native/forms/my-today` fetches today's setup_assignments, shifts, and time_off_requests for the authenticated employee, then merges them server-side into a flat list of display entries. The mobile home screen renders these entries in a GlassCard with dynamic height (up to 50% viewport). A footer row "Today's Setup" navigates to a stub screen.

**Tech Stack:** Next.js API route (dashboard), React Native + Expo Router (mobile), Supabase (database), GlassCard component, existing auth/permission middleware.

---

### Task 1: Create the API endpoint — `/api/native/forms/my-today`

**Files:**
- Create: `apps/dashboard/pages/api/native/forms/my-today.ts`

**Step 1: Create the API route file**

```typescript
/**
 * Native Form API: My Today
 * GET /api/native/forms/my-today?location_id=<id>&employee_id=<id>
 *
 * Returns the employee's schedule status for today:
 * - setup_assignments (position assignments within shifts)
 * - shifts (if no setup_assignments cover them)
 * - time_off_requests (if approved and overlapping today)
 *
 * Response shape:
 * {
 *   status: 'working' | 'not_scheduled' | 'time_off',
 *   entries?: Array<{ type: 'position' | 'shift', label: string, start_time: string, end_time: string }>,
 *   timeOffNote?: string
 * }
 */

import type { NextApiResponse } from 'next';
import { withPermissionAndContext, AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateLocationAccess } from '@/lib/native-auth';

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
}

export default withPermissionAndContext(
  P.SCHED_VIEW,
  async (req: AuthenticatedRequest, res: NextApiResponse, context) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const locationId = req.query.location_id as string;
    const employeeId = req.query.employee_id as string;

    if (!locationId || !employeeId) {
      return res.status(400).json({ error: 'location_id and employee_id are required' });
    }

    try {
      const location = await validateLocationAccess(context.userId, context.orgId, locationId);
      if (!location) {
        return res.status(403).json({ error: 'Location access denied' });
      }

      const supabase = createServerSupabaseClient();
      const today = getTodayDate();
      const weekStart = getWeekStart(new Date());

      // 1. Check for approved time off overlapping today
      const { data: timeOff } = await supabase
        .from('time_off_requests')
        .select('id, note, start_datetime, end_datetime')
        .eq('employee_id', employeeId)
        .eq('org_id', context.orgId)
        .eq('status', 'approved')
        .lte('start_datetime', `${today}T23:59:59`)
        .gte('end_datetime', `${today}T00:00:00`)
        .limit(1);

      if (timeOff && timeOff.length > 0) {
        res.setHeader('Cache-Control', 'private, s-maxage=300, stale-while-revalidate=600');
        return res.status(200).json({
          status: 'time_off',
          timeOffNote: timeOff[0].note || null,
        });
      }

      // 2. Get the published schedule for this week at this location
      const { data: schedules } = await supabase
        .from('schedules')
        .select('id')
        .eq('location_id', locationId)
        .eq('status', 'published')
        .eq('week_start', weekStart);

      const scheduleIds = (schedules || []).map((s: any) => s.id);

      if (scheduleIds.length === 0) {
        res.setHeader('Cache-Control', 'private, s-maxage=300, stale-while-revalidate=600');
        return res.status(200).json({ status: 'not_scheduled' });
      }

      // 3. Fetch today's shifts assigned to this employee
      const { data: shifts } = await supabase
        .from('shifts')
        .select(`
          id, start_time, end_time, break_minutes,
          position:org_positions(id, name),
          assignment:shift_assignments!inner(id, employee_id)
        `)
        .in('schedule_id', scheduleIds)
        .eq('shift_date', today)
        .eq('shift_assignments.employee_id', employeeId)
        .order('start_time');

      if (!shifts || shifts.length === 0) {
        res.setHeader('Cache-Control', 'private, s-maxage=300, stale-while-revalidate=600');
        return res.status(200).json({ status: 'not_scheduled' });
      }

      // 4. Fetch setup_assignments for this employee today
      const { data: setupAssignments } = await supabase
        .from('setup_assignments')
        .select(`
          id, start_time, end_time,
          position:org_positions(id, name)
        `)
        .eq('employee_id', employeeId)
        .eq('org_id', context.orgId)
        .eq('assignment_date', today)
        .order('start_time');

      // 5. Build the entries list
      const entries: Array<{ type: 'position' | 'shift'; label: string; start_time: string; end_time: string }> = [];

      if (setupAssignments && setupAssignments.length > 0) {
        // Add all position assignments
        for (const sa of setupAssignments) {
          entries.push({
            type: 'position',
            label: (sa.position as any)?.name || 'Position',
            start_time: sa.start_time,
            end_time: sa.end_time,
          });
        }

        // For each shift, check if there are time gaps not covered by setup_assignments
        // and add shift entries for those gaps
        for (const shift of shifts) {
          const shiftStart = shift.start_time;
          const shiftEnd = shift.end_time;

          // Find setup assignments that overlap this shift (by checking shift_id would be ideal,
          // but we can approximate by time overlap since assignments are date+time scoped)
          const overlapping = setupAssignments.filter((sa: any) =>
            sa.start_time < shiftEnd && sa.end_time > shiftStart
          );

          if (overlapping.length === 0) {
            // No position assignments for this shift — show the whole shift
            entries.push({
              type: 'shift',
              label: (shift.position as any)?.name || 'Shift',
              start_time: shiftStart,
              end_time: shiftEnd,
            });
          } else {
            // Check for gaps before, between, and after assignments
            const sortedOL = [...overlapping].sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));

            // Gap before first assignment
            if (sortedOL[0].start_time > shiftStart) {
              entries.push({
                type: 'shift',
                label: (shift.position as any)?.name || 'Shift',
                start_time: shiftStart,
                end_time: sortedOL[0].start_time,
              });
            }

            // Gaps between assignments
            for (let i = 0; i < sortedOL.length - 1; i++) {
              if (sortedOL[i].end_time < sortedOL[i + 1].start_time) {
                entries.push({
                  type: 'shift',
                  label: (shift.position as any)?.name || 'Shift',
                  start_time: sortedOL[i].end_time,
                  end_time: sortedOL[i + 1].start_time,
                });
              }
            }

            // Gap after last assignment
            const lastOL = sortedOL[sortedOL.length - 1];
            if (lastOL.end_time < shiftEnd) {
              entries.push({
                type: 'shift',
                label: (shift.position as any)?.name || 'Shift',
                start_time: lastOL.end_time,
                end_time: shiftEnd,
              });
            }
          }
        }

        // Sort all entries by start_time
        entries.sort((a, b) => a.start_time.localeCompare(b.start_time));
      } else {
        // No setup assignments — just show shifts
        for (const shift of shifts) {
          entries.push({
            type: 'shift',
            label: (shift.position as any)?.name || 'Shift',
            start_time: shift.start_time,
            end_time: shift.end_time,
          });
        }
      }

      res.setHeader('Cache-Control', 'private, s-maxage=120, stale-while-revalidate=300');
      return res.status(200).json({ status: 'working', entries });
    } catch (error) {
      console.error('my-today API error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);
```

**Step 2: Verify the endpoint compiles**

Run: `pnpm --filter dashboard build` (or at minimum `pnpm typecheck`)
Expected: No errors related to `my-today.ts`

**Step 3: Commit**

```bash
git add apps/dashboard/pages/api/native/forms/my-today.ts
git commit -m "feat(api): add /api/native/forms/my-today endpoint for today card"
```

---

### Task 2: Add the API client function to the mobile app

**Files:**
- Modify: `apps/mobile/src/lib/api.ts`

**Step 1: Add types and fetch function**

Add the following types after the existing `MyScheduleResponse` interface (~line 544):

```typescript
// =============================================================================
// Today Card API Types
// =============================================================================

export interface TodayEntry {
  type: 'position' | 'shift';
  label: string;
  start_time: string;  // "09:00:00"
  end_time: string;     // "17:00:00"
}

export interface MyTodayResponse {
  status: 'working' | 'not_scheduled' | 'time_off';
  entries?: TodayEntry[];
  timeOffNote?: string | null;
}
```

Add the following function after `fetchMyScheduleAuth` (~line 561):

```typescript
/**
 * Fetch the authenticated user's schedule status for today
 */
export async function fetchMyTodayAuth(
  accessToken: string,
  locationId: string,
  employeeId: string
): Promise<MyTodayResponse> {
  const params = new URLSearchParams({
    location_id: locationId,
    employee_id: employeeId,
  });
  const url = `${API_BASE_URL}/api/native/forms/my-today?${params}`;
  const response = await fetch(url, { headers: authHeaders(accessToken) });
  return handleResponse<MyTodayResponse>(response);
}
```

Add `fetchMyTodayAuth` to the default export object at the bottom of the file.

**Step 2: Commit**

```bash
git add apps/mobile/src/lib/api.ts
git commit -m "feat(mobile): add fetchMyTodayAuth API client function"
```

---

### Task 3: Create the TodayCard component

**Files:**
- Create: `apps/mobile/src/components/today-card.tsx`

**Step 1: Build the TodayCard component**

This component:
- Accepts the `MyTodayResponse` data and loading/error states
- Renders a GlassCard with dynamic height (up to 50% viewport)
- Shows position/shift entries with times, or empty state messages
- Has a "Today's Setup" footer row with a right-pointing caret

```typescript
/**
 * TodayCard Component
 * Shows the employee's schedule status for today on the home screen.
 * Displays setup assignments, shifts, time off, or not-scheduled state.
 */

import React from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "../context/ThemeContext";
import { typography, fontWeights, fontSizes } from "../lib/fonts";
import { spacing, borderRadius, haptics } from "../lib/theme";
import { GlassCard } from "./glass";
import { AppIcon } from "./ui";
import type { MyTodayResponse, TodayEntry } from "../lib/api";

interface TodayCardProps {
  data: MyTodayResponse | null;
  isLoading: boolean;
  error: string | null;
}

function formatTime(time: string): string {
  // "09:00:00" -> "9:00 AM"
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

function EntryRow({ entry }: { entry: TodayEntry }) {
  const colors = useColors();
  const isPosition = entry.type === "position";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[4],
        gap: spacing[3],
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: isPosition ? colors.primary : colors.info,
        }}
      />
      <View style={{ flex: 1 }}>
        <Text
          selectable
          style={{
            ...typography.bodyMedium,
            fontWeight: fontWeights.semibold,
            color: colors.onSurface,
          }}
        >
          {entry.label}
        </Text>
      </View>
      <Text
        style={{
          ...typography.bodySmall,
          fontVariant: ["tabular-nums"],
          color: colors.onSurfaceVariant,
        }}
      >
        {formatTime(entry.start_time)} – {formatTime(entry.end_time)}
      </Text>
    </View>
  );
}

export function TodayCard({ data, isLoading, error }: TodayCardProps) {
  const colors = useColors();
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();

  // Max height for the entries area: 50% of viewport minus header/greeting (~120px)
  const maxEntriesHeight = (windowHeight - 120) * 0.5;

  const renderContent = () => {
    if (isLoading) {
      return (
        <View
          style={{
            paddingVertical: spacing[10],
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }

    if (error) {
      return (
        <View
          style={{
            paddingVertical: spacing[8],
            paddingHorizontal: spacing[4],
            alignItems: "center",
          }}
        >
          <AppIcon
            name="exclamationmark.circle"
            size={28}
            tintColor={colors.onSurfaceDisabled}
          />
          <Text
            style={{
              ...typography.bodySmall,
              color: colors.onSurfaceDisabled,
              marginTop: spacing[2],
              textAlign: "center",
            }}
          >
            Unable to load schedule
          </Text>
        </View>
      );
    }

    if (!data) return null;

    if (data.status === "time_off") {
      return (
        <View
          style={{
            paddingVertical: spacing[10],
            paddingHorizontal: spacing[4],
            alignItems: "center",
            gap: spacing[2],
          }}
        >
          <AppIcon
            name="sun.max.fill"
            size={36}
            tintColor={colors.warning}
          />
          <Text
            style={{
              ...typography.h4,
              color: colors.onSurface,
              marginTop: spacing[2],
            }}
          >
            Enjoy your time off!
          </Text>
          {data.timeOffNote && (
            <Text
              selectable
              style={{
                ...typography.bodySmall,
                color: colors.onSurfaceVariant,
                textAlign: "center",
              }}
            >
              {data.timeOffNote}
            </Text>
          )}
        </View>
      );
    }

    if (data.status === "not_scheduled") {
      return (
        <View
          style={{
            paddingVertical: spacing[10],
            paddingHorizontal: spacing[4],
            alignItems: "center",
            gap: spacing[2],
          }}
        >
          <AppIcon
            name="calendar.badge.minus"
            size={36}
            tintColor={colors.onSurfaceDisabled}
          />
          <Text
            style={{
              ...typography.bodyMedium,
              fontWeight: fontWeights.semibold,
              color: colors.onSurfaceVariant,
              marginTop: spacing[2],
            }}
          >
            Not scheduled today
          </Text>
        </View>
      );
    }

    // status === 'working'
    return (
      <View style={{ maxHeight: maxEntriesHeight }}>
        {(data.entries || []).map((entry, i) => (
          <React.Fragment key={`${entry.start_time}-${i}`}>
            {i > 0 && (
              <View
                style={{
                  height: 1,
                  backgroundColor: colors.outline,
                  marginHorizontal: spacing[4],
                }}
              />
            )}
            <EntryRow entry={entry} />
          </React.Fragment>
        ))}
      </View>
    );
  };

  return (
    <GlassCard
      style={{ marginBottom: 0 }}
      contentStyle={{ padding: 0 }}
    >
      {renderContent()}

      {/* Footer: Today's Setup */}
      <Pressable
        onPress={() => {
          haptics.light();
          router.push("/(tabs)/(home)/todays-setup");
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: spacing[3],
          paddingHorizontal: spacing[4],
          borderTopWidth: 1,
          borderTopColor: colors.outline,
        }}
      >
        <Text
          style={{
            ...typography.labelMedium,
            fontWeight: fontWeights.semibold,
            color: colors.onSurfaceVariant,
          }}
        >
          Today's Setup
        </Text>
        <AppIcon
          name="chevron.right"
          size={14}
          tintColor={colors.onSurfaceDisabled}
        />
      </Pressable>
    </GlassCard>
  );
}

export default TodayCard;
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/today-card.tsx
git commit -m "feat(mobile): add TodayCard component for home page"
```

---

### Task 4: Create the stub "Today's Setup" screen

**Files:**
- Create: `apps/mobile/app/(tabs)/(home)/todays-setup.tsx`
- Modify: `apps/mobile/app/(tabs)/(home)/_layout.tsx`

**Step 1: Create the stub screen**

```typescript
/**
 * Today's Setup — stub screen
 * Will show the full daily setup view for the location.
 */

import React from "react";
import { View, Text, ScrollView } from "react-native";
import { Stack } from "expo-router/stack";
import { useColors } from "../../../src/context/ThemeContext";
import { typography, fontWeights } from "../../../src/lib/fonts";
import { spacing } from "../../../src/lib/theme";
import { AppIcon } from "../../../src/components/ui";

export default function TodaysSetupScreen() {
  const colors = useColors();

  return (
    <>
      <Stack.Screen options={{ title: "Today's Setup", headerShown: true }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: spacing[5],
          gap: spacing[3],
        }}
        style={{ backgroundColor: colors.background }}
      >
        <AppIcon
          name="rectangle.grid.1x2"
          size={44}
          tintColor={colors.onSurfaceDisabled}
        />
        <Text
          style={{
            ...typography.h4,
            color: colors.onSurfaceVariant,
          }}
        >
          Coming Soon
        </Text>
        <Text
          style={{
            ...typography.bodySmall,
            color: colors.onSurfaceDisabled,
            textAlign: "center",
          }}
        >
          Full daily setup view will be available here.
        </Text>
      </ScrollView>
    </>
  );
}
```

**Step 2: Add the route to the home layout**

In `apps/mobile/app/(tabs)/(home)/_layout.tsx`, add a new `Stack.Screen` after the `edit-profile` screen:

```tsx
<Stack.Screen
  name="todays-setup"
  options={{
    headerShown: true,
    title: "Today's Setup",
  }}
/>
```

**Step 3: Commit**

```bash
git add apps/mobile/app/(tabs)/(home)/todays-setup.tsx apps/mobile/app/(tabs)/(home)/_layout.tsx
git commit -m "feat(mobile): add stub Today's Setup screen with route"
```

---

### Task 5: Rewrite the home screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/(home)/index.tsx`

**Step 1: Rewrite the home screen**

Replace the entire file with the new version that:
- Removes the leader/non-leader gate (no more ComingSoonScreen)
- Removes the success banner
- Removes Submit Rating, Submit Infraction, Manage Team cards
- Adds the TodayCard with data fetching
- Keeps the header (avatar, location selector) and greeting

```typescript
/**
 * Home Tab
 * Dashboard with greeting and Today card showing schedule/setup status.
 * Avatar bubble in top-left opens account modal.
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Image as ExpoImage } from "expo-image";
import { useAuth } from "../../../src/context/AuthContext";
import { useLocation } from "../../../src/context/LocationContext";
import { useColors } from "../../../src/context/ThemeContext";
import { typography, fontWeights, fontSizes } from "../../../src/lib/fonts";
import { spacing, borderRadius, haptics } from "../../../src/lib/theme";
import { AppIcon } from "../../../src/components/ui";
import { TodayCard } from "../../../src/components/today-card";
import { fetchMyTodayAuth } from "../../../src/lib/api";
import type { MyTodayResponse } from "../../../src/lib/api";
import "../../../src/lib/i18n";

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { fullName, profileImage, email, employeeId, session } = useAuth();
  const {
    selectedLocation,
    selectedLocationName,
    hasMultipleLocations,
    isLoading: locationLoading,
    locations,
  } = useLocation();

  const firstName = fullName?.split(" ")[0] || "there";
  const greeting = getGreeting(t);
  const singleLocation = !hasMultipleLocations && !!selectedLocation;

  // Today card state
  const [todayData, setTodayData] = useState<MyTodayResponse | null>(null);
  const [todayLoading, setTodayLoading] = useState(true);
  const [todayError, setTodayError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchToday = useCallback(async () => {
    const accessToken = session?.access_token;
    const locationId = selectedLocation?.id;
    if (!accessToken || !locationId || !employeeId) {
      setTodayLoading(false);
      return;
    }

    try {
      setTodayError(null);
      const data = await fetchMyTodayAuth(accessToken, locationId, employeeId);
      setTodayData(data);
    } catch (err: any) {
      // Permission errors (403) mean user can't view schedule — show not_scheduled
      if (err?.status === 403) {
        setTodayData({ status: 'not_scheduled' });
      } else {
        setTodayError(err?.message || 'Failed to load');
      }
    } finally {
      setTodayLoading(false);
    }
  }, [session?.access_token, selectedLocation?.id, employeeId]);

  useEffect(() => {
    setTodayLoading(true);
    fetchToday();
  }, [fetchToday]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchToday();
    setRefreshing(false);
  }, [fetchToday]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return email?.charAt(0)?.toUpperCase() || "U";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Fixed header — matches Levi/Schedule exactly */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing[4],
          paddingTop: insets.top + spacing[1],
          paddingBottom: spacing[2],
        }}
      >
        {/* Left — avatar bubble */}
        <Pressable
          onPress={() => {
            haptics.light();
            router.push("/(tabs)/(home)/account");
          }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            overflow: "hidden",
          }}
        >
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              style={{ width: 36, height: 36, borderRadius: 18 }}
            />
          ) : (
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.primary,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: fontWeights.bold,
                  color: colors.onPrimary,
                }}
              >
                {getInitials(fullName)}
              </Text>
            </View>
          )}
        </Pressable>

        {/* Center — location selector */}
        {!locationLoading && locations.length > 0 ? (
          <Pressable
            onPress={() => {
              if (!singleLocation) {
                haptics.light();
                router.push("/(tabs)/(home)/location-picker");
              }
            }}
            disabled={singleLocation}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: spacing[2],
              flex: 1,
              paddingVertical: spacing[1],
            }}
          >
            {!singleLocation && (
              <AppIcon
                name="chevron.down"
                size={12}
                tintColor={colors.onSurfaceDisabled}
              />
            )}
            {selectedLocation?.image_url && (
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  backgroundColor: "#FFFFFF",
                }}
              >
                <ExpoImage
                  source={{ uri: selectedLocation.image_url }}
                  style={{ width: 18, height: 18 }}
                  contentFit="contain"
                  cachePolicy="disk"
                />
              </View>
            )}
            <Text
              style={{
                fontSize: fontSizes.lg,
                fontWeight: fontWeights.semibold,
                color: colors.onSurface,
                maxWidth: 200,
              }}
              numberOfLines={1}
            >
              {selectedLocationName || t("home.noLocation")}
            </Text>
          </Pressable>
        ) : (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: spacing[2],
              flex: 1,
              paddingVertical: spacing[1],
            }}
          >
            <Text
              style={{
                fontSize: fontSizes.lg,
                fontWeight: fontWeights.semibold,
                color: colors.onSurface,
              }}
            >
              Home
            </Text>
          </View>
        )}

        {/* Right spacer */}
        <View style={{ width: 36, height: 36 }} />
      </View>

      {/* Scrollable content */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing[5],
          paddingBottom: spacing[5],
          gap: spacing[3],
        }}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Greeting */}
        <Animated.View entering={FadeIn.delay(50).duration(400)}>
          <Text
            style={{
              ...typography.h2,
              fontWeight: fontWeights.semibold,
              letterSpacing: -0.3,
              color: colors.onSurfaceVariant,
            }}
          >
            {greeting},{" "}
            <Text
              style={{
                fontWeight: fontWeights.bold,
                color: colors.onBackground,
              }}
            >
              {firstName}
            </Text>
          </Text>
        </Animated.View>

        {/* Today Card */}
        <TodayCard
          data={todayData}
          isLoading={todayLoading}
          error={todayError}
        />
      </ScrollView>
    </View>
  );
}

function getGreeting(t: (key: string) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return t("home.goodMorning");
  if (hour < 17) return t("home.goodAfternoon");
  return t("home.goodEvening");
}
```

Key changes from old version:
- Removed: `useForms` import and `lastSubmission` usage
- Removed: `useIsLeader` import and leader gate
- Removed: `ComingSoonScreen` import
- Removed: `GlassCard` import (used inside TodayCard instead)
- Removed: All three action card sections
- Removed: Success banner
- Removed: `StyleSheet.create` (switched to inline styles per Expo UI guidelines)
- Added: `fetchMyTodayAuth` data fetching with loading/error states
- Added: `TodayCard` rendering
- Added: Pull-to-refresh via `RefreshControl`
- Kept: Header, greeting, avatar, location selector (identical structure)

**Step 2: Verify it renders**

Open the Expo dev server (port 8082) and navigate to the Home tab. Expected:
- Greeting visible
- TodayCard shows loading spinner, then data (or "Not scheduled today" if no schedule)
- No Submit Rating / Infraction / Manage Team cards
- Pull to refresh works

**Step 3: Commit**

```bash
git add apps/mobile/app/(tabs)/(home)/index.tsx
git commit -m "feat(mobile): redesign home page with Today card, remove quick actions"
```

---

### Task 6: Verify and test the full flow

**Step 1: Start the dashboard dev server if not running**

Run: `pnpm dev:dashboard` (needed for the API endpoint)

**Step 2: Test the API endpoint directly**

Use curl or the mobile app to call `/api/native/forms/my-today` with valid auth token, location_id, and employee_id. Verify:
- Returns `{ status: 'not_scheduled' }` when no shifts exist for today
- Returns `{ status: 'working', entries: [...] }` when shifts exist
- Returns `{ status: 'time_off' }` when approved time off exists
- Returns 403 when user lacks SCHED_VIEW permission (mobile gracefully shows "not_scheduled")

**Step 3: Test the mobile app on device/simulator**

Navigate Home tab and verify:
- Loading state shows spinner
- "Not scheduled today" shows when no schedule
- Entry rows show position name + time range when data exists
- "Today's Setup" footer row is visible and tappable
- Tapping "Today's Setup" navigates to the stub screen
- Pull-to-refresh reloads data
- Dark mode renders correctly

**Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: No new errors

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix(mobile): address review feedback from today card testing"
```
