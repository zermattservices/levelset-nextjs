/**
 * Employee Overview Screen
 * Full employee detail page with tabbed navigation mirroring the dashboard employee modal.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { useAuth } from '../../../src/context/AuthContext';
import { useColors } from '../../../src/context/ThemeContext';
import { typography, fontWeights } from '../../../src/lib/fonts';
import { spacing, haptics } from '../../../src/lib/theme';
import { fetchEmployeeProfileAuth } from '../../../src/lib/api';
import type { EmployeeProfileResponse } from '../../../src/lib/api';
import { GlassCard } from '../../../src/components/glass';
import { AppIcon } from '../../../src/components/ui';
import { TabBar, SummarySection, StubTab, OverviewTab, PETab, DisciplineTab, EvaluationsTab } from '../../../src/components/employee-overview';

export default function EmployeeOverviewScreen() {
  const { employeeId, locationId } = useLocalSearchParams<{
    employeeId: string;
    locationId: string;
  }>();
  const { session } = useAuth();
  const colors = useColors();
  const router = useRouter();

  const [data, setData] = useState<EmployeeProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRangeLabel, setDateRangeLabel] = useState('Last 90 Days');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch employee data
  useEffect(() => {
    if (!session?.access_token || !locationId || !employeeId) return;
    setLoading(true);
    setError(null);
    fetchEmployeeProfileAuth(session.access_token, locationId, employeeId)
      .then(setData)
      .catch((err) => {
        console.error('[EmployeeOverview] fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load employee data');
      })
      .finally(() => setLoading(false));
  }, [session?.access_token, locationId, employeeId]);

  // Date range change handler (re-fetches with new range)
  const handleDateRangeChange = useCallback(
    (startDate: string, endDate: string) => {
      if (!session?.access_token || !locationId || !employeeId) return;
      setLoading(true);
      fetchEmployeeProfileAuth(session.access_token, locationId, employeeId, {
        startDate,
        endDate,
      })
        .then(setData)
        .catch((err) => console.error('[EmployeeOverview] date range fetch error:', err))
        .finally(() => setLoading(false));
    },
    [session?.access_token, locationId, employeeId]
  );

  // Pull-to-refresh handler
  const handleRefresh = useCallback(() => {
    if (!session?.access_token || !locationId || !employeeId) return;
    setRefreshing(true);
    fetchEmployeeProfileAuth(session.access_token, locationId, employeeId)
      .then(setData)
      .catch((err) => console.error('[EmployeeOverview] refresh error:', err))
      .finally(() => setRefreshing(false));
  }, [session?.access_token, locationId, employeeId]);

  // Contact button for header
  const contactButtonSize = 36;
  const contactButtonStyle = {
    width: contactButtonSize,
    height: contactButtonSize,
    borderRadius: contactButtonSize / 2,
    borderCurve: 'continuous' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: data?.employee.full_name || '',
          headerRight: () => (
            <Pressable
              onPress={() => {
                haptics.light();
                if (data?.employee) {
                  router.push({
                    pathname: '/(tabs)/(home)/employee-contact',
                    params: {
                      fullName: data.employee.full_name || '',
                      role: data.employee.role || '',
                      phone: data.employee.phone || '',
                      email: data.employee.email || '',
                      profileImage: data.employee.profile_image || '',
                      title: data.employee.title || '',
                      hireDate: data.employee.hire_date || '',
                    },
                  });
                }
              }}
            >
              <View style={contactButtonStyle}>
                <AppIcon name="person.crop.rectangle" size={22} tintColor={colors.onSurfaceVariant} />
              </View>
            </Pressable>
          ),
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: spacing[10], gap: spacing[4] }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Summary section */}
        <SummarySection activeTab={activeTab} data={data} loading={loading} dateRangeLabel={dateRangeLabel} />

        {/* Tab bar */}
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab content */}
        <View style={{ paddingHorizontal: spacing[5] }}>
          {error && !loading ? (
            <GlassCard>
              <View style={{ alignItems: 'center', padding: spacing[4], gap: spacing[3] }}>
                <AppIcon name="exclamationmark.triangle" size={32} tintColor={colors.error} />
                <Text style={[typography.bodyMedium, { color: colors.onSurface, textAlign: 'center' }]}>{error}</Text>
                <Pressable
                  onPress={() => {
                    if (!session?.access_token || !locationId || !employeeId) return;
                    setLoading(true);
                    setError(null);
                    fetchEmployeeProfileAuth(session.access_token, locationId, employeeId)
                      .then(setData)
                      .catch((err) => {
                        console.error('[EmployeeOverview] retry error:', err);
                        setError(err instanceof Error ? err.message : 'Failed to load employee data');
                      })
                      .finally(() => setLoading(false));
                  }}
                  style={{
                    paddingHorizontal: spacing[4],
                    paddingVertical: spacing[2],
                    backgroundColor: colors.primary,
                    borderRadius: 8,
                  }}
                >
                  <Text style={[typography.bodySmall, { color: colors.onPrimary, fontWeight: fontWeights.semibold }]}>Retry</Text>
                </Pressable>
              </View>
            </GlassCard>
          ) : loading && !data ? (
            <LoadingSkeleton />
          ) : (
            <>
              {activeTab === 'overview' && data && <OverviewTab data={data} />}
              {activeTab === 'pe' && data && (
                <PETab data={data} locationId={locationId!} onDateRangeChange={handleDateRangeChange} onDateRangeLabelChange={setDateRangeLabel} />
              )}
              {activeTab === 'discipline' && data && (
                <DisciplineTab data={data} locationId={locationId!} onDateRangeChange={handleDateRangeChange} />
              )}
              {activeTab === 'schedule' && <StubTab icon="calendar" title="Schedule" />}
              {activeTab === 'pathway' && <StubTab icon="map" title="Pathway" />}
              {activeTab === 'evaluations' && employeeId && locationId && (
                <EvaluationsTab employeeId={employeeId} locationId={locationId} />
              )}
            </>
          )}
        </View>

        {/* Loading overlay for date range changes */}
        {loading && data && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.1)',
            }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </ScrollView>

    </>
  );
}

// Simple loading skeleton
function LoadingSkeleton() {
  const colors = useColors();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={{ gap: spacing[3] }}>
      {[1, 2, 3].map((i) => (
        <GlassCard key={i}>
          <Animated.View style={animStyle}>
            <View
              style={{
                height: 16,
                width: '60%',
                backgroundColor: colors.onSurfaceDisabled,
                borderRadius: 8,
                marginBottom: spacing[2],
              }}
            />
            <View
              style={{
                height: 12,
                width: '40%',
                backgroundColor: colors.onSurfaceDisabled,
                borderRadius: 6,
              }}
            />
          </Animated.View>
        </GlassCard>
      ))}
    </View>
  );
}
