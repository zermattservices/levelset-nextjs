/**
 * API Service
 * Handles all API calls to the Levelset backend
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  buildRatingResponseData,
  buildInfractionResponseData,
  type SystemTemplate,
  type FieldMappings,
} from './form-mapping';

// =============================================================================
// Configuration
// =============================================================================

// Base URL for the PWA API - this should be configured per environment
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://app.levelset.io";

// Storage key for the mobile token
const MOBILE_TOKEN_KEY = "levelset_mobile_token";

// =============================================================================
// Token Management
// =============================================================================

/**
 * Store the mobile token for API authentication
 */
export async function setMobileToken(token: string | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem(MOBILE_TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(MOBILE_TOKEN_KEY);
  }
}

/**
 * Get the stored mobile token
 */
export async function getMobileToken(): Promise<string | null> {
  return AsyncStorage.getItem(MOBILE_TOKEN_KEY);
}

/**
 * Clear the mobile token (logout)
 */
export async function clearMobileToken(): Promise<void> {
  await AsyncStorage.removeItem(MOBILE_TOKEN_KEY);
}

// =============================================================================
// API Types
// =============================================================================

export interface Employee {
  id: string;
  name: string;
  role: string | null;
}

export interface Leader {
  id: string;
  name: string;
  role: string | null;
}

export interface Infraction {
  id: string;
  action: string;
  action_es?: string | null;
  points: number;
  require_tm_signature?: boolean;
  require_leader_signature?: boolean;
}

export interface InfractionDataResponse {
  employees: Employee[];
  leaders: Leader[];
  infractions: Infraction[];
  disciplinePassword?: string;
}

export interface Position {
  name: string;
  name_es?: string | null;
  zone: "FOH" | "BOH";
  description?: string | null;
  description_es?: string | null;
}

export interface PositionalDataResponse {
  employees: Employee[];
  leaders: Leader[];
  positions: Position[];
  rolePermissions?: Record<string, string[]>;
  requireRatingComments?: boolean;
}

export interface PositionLabelsResponse {
  labels: string[];
  labels_es?: string[];
  descriptions?: string[];
  descriptions_es?: string[];
}

export interface InfractionSubmission {
  leaderId: string;
  employeeId: string;
  infractionId: string;
  infractionDate: string; // YYYY-MM-DD format
  acknowledged: boolean;
  notes?: string | null;
  teamMemberSignature?: string | null;
  leaderSignature: string;
}

export interface RatingsSubmission {
  leaderId: string;
  employeeId: string;
  position: string;
  ratings: number[];
  notes?: string | null;
}

export interface SubmissionResult {
  success: boolean;
  message?: string;
  error?: string;
  action?: string;
  points?: number;
  employeeName?: string;
  infractionId?: string; // Returned after infraction submission for document uploads
  submissionId?: string;  // Form management submission ID
}

export interface FormSubmissionResult {
  id: string;
  org_id: string;
  location_id: string | null;
  template_id: string;
  form_type: string;
  employee_id: string | null;
  response_data: Record<string, any>;
  schema_snapshot: Record<string, any>;
  score: number | null;
  status: string;
  metadata: Record<string, any>;
  created_at: string;
}

// =============================================================================
// API Error Handling
// =============================================================================

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = "Request failed";
    try {
      const errorPayload = await response.json();
      if (errorPayload?.error) {
        message = errorPayload.error;
      }
    } catch {
      // Ignore JSON parse errors
    }
    throw new ApiError(message, response.status);
  }
  return response.json();
}

// =============================================================================
// Infraction API
// =============================================================================

/**
 * Fetch infraction form data (employees, leaders, infractions)
 */
export async function fetchInfractionData(token: string): Promise<InfractionDataResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/mobile/${encodeURIComponent(token)}/infraction-data`
  );
  return handleResponse<InfractionDataResponse>(response);
}

/**
 * Submit a discipline infraction
 */
export async function submitInfraction(
  token: string,
  data: InfractionSubmission
): Promise<SubmissionResult> {
  const response = await fetch(
    `${API_BASE_URL}/api/mobile/${encodeURIComponent(token)}/infractions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );
  return handleResponse<SubmissionResult>(response);
}

// =============================================================================
// Positional Ratings API
// =============================================================================

/**
 * Fetch positional ratings form data (employees, leaders, positions)
 */
export async function fetchPositionalData(token: string): Promise<PositionalDataResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/mobile/${encodeURIComponent(token)}/positional-data`
  );
  return handleResponse<PositionalDataResponse>(response);
}

/**
 * Fetch position labels for a specific position
 */
export async function fetchPositionLabels(
  token: string,
  position: string,
  zone?: string
): Promise<PositionLabelsResponse> {
  let url = `${API_BASE_URL}/api/mobile/${encodeURIComponent(token)}/position-labels?position=${encodeURIComponent(position)}`;
  if (zone) {
    url += `&zone=${encodeURIComponent(zone)}`;
  }
  const response = await fetch(url);
  return handleResponse<PositionLabelsResponse>(response);
}

/**
 * Submit positional ratings
 */
export async function submitRatings(
  token: string,
  data: RatingsSubmission
): Promise<SubmissionResult> {
  const response = await fetch(
    `${API_BASE_URL}/api/mobile/${encodeURIComponent(token)}/ratings`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );
  return handleResponse<SubmissionResult>(response);
}

// =============================================================================
// Infraction Document Upload API
// =============================================================================

/**
 * Upload a document attachment for an infraction
 */
export async function uploadInfractionDocument(
  token: string,
  infractionId: string,
  file: { uri: string; name: string; type: string }
): Promise<{ id: string; file_name: string }> {
  const formData = new FormData();
  formData.append("infraction_id", infractionId);
  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  const response = await fetch(
    `${API_BASE_URL}/api/mobile/${encodeURIComponent(token)}/infraction-documents`,
    {
      method: "POST",
      body: formData,
    }
  );
  return handleResponse<{ id: string; file_name: string }>(response);
}

// =============================================================================
// Authenticated Native Form API (JWT-based)
// These functions call the new /api/native/forms/ routes which require
// a Supabase JWT Bearer token and check user permissions.
// =============================================================================

/** Build headers with JWT auth for native form API calls */
function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

/**
 * Fetch positional ratings form data (authenticated)
 */
export async function fetchPositionalDataAuth(
  accessToken: string,
  locationId: string
): Promise<PositionalDataResponse> {
  const url = `${API_BASE_URL}/api/native/forms/positional-data?location_id=${encodeURIComponent(locationId)}`;
  const response = await fetch(url, { headers: authHeaders(accessToken) });
  return handleResponse<PositionalDataResponse>(response);
}

/**
 * Fetch position labels for a specific position (authenticated)
 */
export async function fetchPositionLabelsAuth(
  accessToken: string,
  locationId: string,
  position: string,
  zone?: string
): Promise<PositionLabelsResponse> {
  let url = `${API_BASE_URL}/api/native/forms/position-labels?location_id=${encodeURIComponent(locationId)}&position=${encodeURIComponent(position)}`;
  if (zone) {
    url += `&zone=${encodeURIComponent(zone)}`;
  }
  const response = await fetch(url, { headers: authHeaders(accessToken) });
  return handleResponse<PositionLabelsResponse>(response);
}

/**
 * Submit positional ratings via form management system (authenticated).
 * Fetches the system template, maps form data to field IDs, and submits
 * to /api/forms/submissions which dual-writes to both form_submissions
 * and the legacy ratings table.
 */
export async function submitRatingsAuth(
  accessToken: string,
  locationId: string,
  data: RatingsSubmission
): Promise<SubmissionResult> {
  const template = await fetchSystemTemplate(accessToken, 'positional-excellence-rating');
  const mappings = template.settings?.field_mappings;

  if (!mappings) {
    throw new ApiError('Rating template is missing field mappings', 500);
  }

  const responseData = buildRatingResponseData(mappings, {
    leaderId: data.leaderId,
    employeeId: data.employeeId,
    position: data.position,
    ratings: data.ratings,
    notes: data.notes ?? null,
  });

  const response = await fetch(
    `${API_BASE_URL}/api/forms/submissions`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        template_id: template.id,
        location_id: locationId,
        employee_id: data.employeeId,
        response_data: responseData,
      }),
    }
  );

  await handleResponse<FormSubmissionResult>(response);

  return {
    success: true,
  };
}

/**
 * Fetch infraction form data (authenticated)
 */
export async function fetchInfractionDataAuth(
  accessToken: string,
  locationId: string
): Promise<InfractionDataResponse> {
  const url = `${API_BASE_URL}/api/native/forms/infraction-data?location_id=${encodeURIComponent(locationId)}`;
  const response = await fetch(url, { headers: authHeaders(accessToken) });
  return handleResponse<InfractionDataResponse>(response);
}

/**
 * Submit a discipline infraction via form management system (authenticated).
 * Fetches the system template, maps form data to field IDs, and submits
 * to /api/forms/submissions which dual-writes to both form_submissions
 * and the legacy infractions table.
 */
export async function submitInfractionAuth(
  accessToken: string,
  locationId: string,
  data: InfractionSubmission
): Promise<SubmissionResult> {
  const template = await fetchSystemTemplate(accessToken, 'discipline-infraction');
  const mappings = template.settings?.field_mappings;

  if (!mappings) {
    throw new ApiError('Infraction template is missing field mappings', 500);
  }

  const responseData = buildInfractionResponseData(mappings, {
    leaderId: data.leaderId,
    employeeId: data.employeeId,
    infractionId: data.infractionId,
    infractionDate: data.infractionDate,
    acknowledged: data.acknowledged,
    notes: data.notes ?? null,
    teamMemberSignature: data.teamMemberSignature ?? null,
    leaderSignature: data.leaderSignature,
  });

  const response = await fetch(
    `${API_BASE_URL}/api/forms/submissions`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        template_id: template.id,
        location_id: locationId,
        employee_id: data.employeeId,
        response_data: responseData,
      }),
    }
  );

  const result = await handleResponse<FormSubmissionResult>(response);

  return {
    success: true,
    infractionId: result.metadata?.infraction_id || undefined,
    submissionId: result.id,
  };
}

/**
 * Upload a document attachment for an infraction via form submission.
 * Uses the form-management submission-documents endpoint which resolves
 * the infraction_id from the form submission's metadata.
 */
export async function uploadInfractionDocumentAuth(
  accessToken: string,
  locationId: string,
  submissionOrInfractionId: string,
  file: { uri: string; name: string; type: string },
  options?: { isSubmissionId?: boolean }
): Promise<{ id: string; file_name: string }> {
  const formData = new FormData();
  formData.append('location_id', locationId);
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  if (options?.isSubmissionId) {
    formData.append('submission_id', submissionOrInfractionId);
    const response = await fetch(
      `${API_BASE_URL}/api/forms/submission-documents`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      }
    );
    return handleResponse<{ id: string; file_name: string }>(response);
  }

  formData.append('infraction_id', submissionOrInfractionId);
  const response = await fetch(
    `${API_BASE_URL}/api/native/forms/infraction-documents`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    }
  );
  return handleResponse<{ id: string; file_name: string }>(response);
}

// =============================================================================
// Submissions API Types (JWT-based, authenticated)
// =============================================================================

export interface SubmissionRecord {
  id: string;
  form_type: 'ratings' | 'infractions' | 'disc_actions';
  created_at: string;
  submitted_by_name: string;
  employee_name: string;
  position?: string;
  overall_score?: number;
  infraction_name?: string;
  point_value?: number;
  action_name?: string;
}

export interface SubmissionsFilters {
  form_type?: string;
  employee_id?: string;
  submitted_by?: string;
  start_date?: string;
  end_date?: string;
}

export interface SubmissionsResponse {
  submissions: SubmissionRecord[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Fetch unified submissions list for a location (authenticated)
 */
export async function fetchSubmissionsAuth(
  accessToken: string,
  locationId: string,
  filters?: SubmissionsFilters,
  page: number = 1
): Promise<SubmissionsResponse> {
  const params = new URLSearchParams({
    location_id: locationId,
    page: String(page),
  });
  if (filters?.form_type) params.set("form_type", filters.form_type);
  if (filters?.employee_id) params.set("employee_id", filters.employee_id);
  if (filters?.submitted_by) params.set("submitted_by", filters.submitted_by);
  if (filters?.start_date) params.set("start_date", filters.start_date);
  if (filters?.end_date) params.set("end_date", filters.end_date);

  const url = `${API_BASE_URL}/api/native/forms/submissions?${params}`;
  const response = await fetch(url, { headers: authHeaders(accessToken) });
  return handleResponse<SubmissionsResponse>(response);
}

// =============================================================================
// Employee API Types (JWT-based, authenticated)
// =============================================================================

export interface EmployeeListItem {
  id: string;
  full_name: string;
  role: string | null;
  hire_date: string | null;
  profile_image: string | null;
  works_today: boolean;
  is_leader: boolean;
}

export interface EmployeeProfileInfraction {
  id: string;
  infraction: string;
  infraction_es?: string | null;
  infraction_date: string;
  points: number;
  leader_name: string | null;
  ack_bool: boolean;
}

export interface EmployeeProfileDiscAction {
  id: string;
  action: string;
  action_es?: string | null;
  action_date: string;
  leader_name: string | null;
}

export interface EmployeeProfileRating {
  id: string;
  position: string;
  zone?: 'FOH' | 'BOH' | null;
  rating_1: number | null;
  rating_2: number | null;
  rating_3: number | null;
  rating_4: number | null;
  rating_5: number | null;
  rating_avg: number | null;
  notes: string | null;
  created_at: string;
  rater_name: string | null;
}

export interface PositionAverage {
  position: string;
  average: number;
  count: number;
  zone?: 'FOH' | 'BOH' | null;
}

export interface DiscRubricAction {
  action: string;
  points_threshold: number;
}

export interface OEPillar {
  id: string;
  name: string;
  weight: number;
  description: string;
  score: number | null;
}

export interface EmployeeProfileResponse {
  employee: {
    id: string;
    full_name: string;
    role: string | null;
    hire_date: string | null;
    profile_image: string | null;
    phone: string | null;
    email: string | null;
    title: string | null;
  };
  infractions: EmployeeProfileInfraction[];
  disc_actions: EmployeeProfileDiscAction[];
  ratings: EmployeeProfileRating[];
  position_averages: PositionAverage[];
  thresholds: RatingThresholds | null;
  disc_rubric: DiscRubricAction[];
  schedule: WeekSchedule | null;
  summary: {
    infraction_count: number;
    total_points: number;
    avg_rating: number | null;
  };
  oe_pillars: OEPillar[];
  oe_overall: number | null;
}

// =============================================================================
// Schedule API (JWT-based, authenticated)
// =============================================================================

export interface ScheduleShift {
  id: string;
  shift_date: string;     // "2026-02-20"
  start_time: string;     // "09:00:00"
  end_time: string;       // "17:00:00"
  break_minutes: number;
  notes: string | null;
  position: { id: string; name: string } | null;
}

export interface WeekSchedule {
  weekStart: string;      // "2026-02-15"
  shifts: ScheduleShift[];
}

export interface MyScheduleResponse {
  thisWeek: WeekSchedule;
  nextWeek: WeekSchedule | null;
}

// =============================================================================
// Today Card API Types
// =============================================================================

export interface TodayEntry {
  type: 'position' | 'shift';
  label: string;
  label_es?: string | null;
  start_time: string;  // "09:00:00"
  end_time: string;     // "17:00:00"
}

export interface TodaySetupAssignment {
  id: string;
  label: string;
  label_es?: string | null;
  start_time: string;
  end_time: string;
}

export interface TodayShift {
  id: string;
  label: string;
  label_es?: string | null;
  start_time: string;
  end_time: string;
  zone?: "FOH" | "BOH" | null;
  setup_assignments: TodaySetupAssignment[];
}

export interface MyTodayResponse {
  status: 'working' | 'not_scheduled' | 'time_off';
  date?: string;
  shifts?: TodayShift[];
  entries?: TodayEntry[];
  timeOffNote?: string | null;
}

/**
 * Fetch the authenticated user's assigned shifts for this week and next week
 */
export async function fetchMyScheduleAuth(
  accessToken: string,
  locationId: string,
  employeeId: string
): Promise<MyScheduleResponse> {
  const params = new URLSearchParams({
    location_id: locationId,
    employee_id: employeeId,
  });
  const url = `${API_BASE_URL}/api/native/forms/my-schedule?${params}`;
  const response = await fetch(url, { headers: authHeaders(accessToken) });
  return handleResponse<MyScheduleResponse>(response);
}

/**
 * Fetch the authenticated user's schedule status for a given day (defaults to today).
 */
export async function fetchMyTodayAuth(
  accessToken: string,
  locationId: string,
  employeeId: string,
  date?: string,
): Promise<MyTodayResponse> {
  const params = new URLSearchParams({
    location_id: locationId,
    employee_id: employeeId,
  });
  if (date) params.set('date', date);
  const url = `${API_BASE_URL}/api/native/forms/my-today?${params}`;
  const response = await fetch(url, { headers: authHeaders(accessToken) });
  return handleResponse<MyTodayResponse>(response);
}

// =============================================================================
// Employee API (JWT-based, authenticated)
// =============================================================================

/**
 * Fetch all active employees for a location
 */
export async function fetchEmployeesAuth(
  accessToken: string,
  locationId: string
): Promise<{ employees: EmployeeListItem[] }> {
  const params = new URLSearchParams({ location_id: locationId });
  const url = `${API_BASE_URL}/api/native/forms/employees?${params}`;
  const response = await fetch(url, { headers: authHeaders(accessToken) });
  return handleResponse<{ employees: EmployeeListItem[] }>(response);
}

/**
 * Fetch detailed profile data for a single employee
 */
export async function fetchEmployeeProfileAuth(
  accessToken: string,
  locationId: string,
  employeeId: string,
  options?: { startDate?: string; endDate?: string }
): Promise<EmployeeProfileResponse> {
  const params = new URLSearchParams({
    location_id: locationId,
    employee_id: employeeId,
  });
  if (options?.startDate) params.set('start_date', options.startDate);
  if (options?.endDate) params.set('end_date', options.endDate);
  const url = `${API_BASE_URL}/api/native/forms/employee-profile?${params}`;
  const response = await fetch(url, { headers: authHeaders(accessToken) });
  return handleResponse<EmployeeProfileResponse>(response);
}

// =============================================================================
// Recent Activities API Types (JWT-based, authenticated)
// =============================================================================

export interface RecentActivity {
  id: string;
  type: 'rating' | 'infraction' | 'disc_action' | 'review';
  date: string;
  position?: string;
  position_es?: string | null;
  zone?: 'FOH' | 'BOH' | null;
  rating_avg?: number | null;
  rater_name?: string | null;
  infraction_name?: string;
  infraction_name_es?: string | null;
  points?: number;
  action_type?: string;
  action_type_es?: string | null;
  leader_name?: string | null;
  author_name?: string | null;
  review_rating?: number;
  review_text_preview?: string | null;
}

export interface RatingThresholds {
  yellow_threshold: number;
  green_threshold: number;
}

export interface RecentActivitiesResponse {
  activities: RecentActivity[];
  thresholds: RatingThresholds;
}

export interface RatingDetailData {
  rating: {
    id: string;
    position: string;
    zone: 'FOH' | 'BOH' | null;
    rating_1: number | null;
    rating_2: number | null;
    rating_3: number | null;
    rating_4: number | null;
    rating_5: number | null;
    rating_avg: number | null;
    notes: string | null;
    rater_name: string | null;
    employee_name: string | null;
    employee_id: string;
    created_at: string;
  };
  labels: {
    label_1: string;
    label_2: string;
    label_3: string;
    label_4: string;
    label_5: string;
    label_1_es?: string | null;
    label_2_es?: string | null;
    label_3_es?: string | null;
    label_4_es?: string | null;
    label_5_es?: string | null;
  } | null;
  criteria: { name: string; name_es?: string | null; description: string; description_es?: string | null }[] | null;
  last4_avg: number | null;
  thresholds: RatingThresholds;
}

export interface InfractionDetailData {
  infraction: {
    id: string;
    infraction: string;
    infraction_es?: string | null;
    points: number;
    infraction_date: string;
    leader_name: string | null;
    acknowledgement: string | null;
    ack_bool: boolean;
    notes: string | null;
    leader_signature: string | null;
    team_member_signature: string | null;
    created_at: string;
    employee_id?: string;
    employee_name?: string | null;
  };
  total_points: number;
}

// =============================================================================
// Setup Board API Types (JWT-based, authenticated)
// =============================================================================

export interface SetupBlock {
  block_time: string;      // "HH:MM"
  end_time: string;        // "HH:MM"
  template_id: string;
  template_name: string;
  zone: 'FOH' | 'BOH';
  positions: Record<string, { slot_count: number; is_required: boolean }>;
}

export interface SetupPosition {
  id: string;
  name: string;
  name_es?: string | null;
  zone: 'FOH' | 'BOH';
  display_order: number;
}

export interface SetupEmployee {
  id: string;
  full_name: string;
  is_foh: boolean;
  is_boh: boolean;
  shift: {
    id: string;
    start_time: string;
    end_time: string;
    position_id: string | null;
  };
}

export interface SetupAssignment {
  id: string;
  org_id: string;
  shift_id: string;
  employee_id: string;
  position_id: string;
  assignment_date: string;
  start_time: string;
  end_time: string;
  assigned_by?: string;
  employee?: { id: string; full_name: string };
  position?: { id: string; name: string; zone: string };
  shift?: { id: string; shift_date: string; start_time: string; end_time: string; position_id: string };
}

export interface SetupBoardResponse {
  blocks: SetupBlock[];
  positions: SetupPosition[];
  employees: SetupEmployee[];
  assignments: SetupAssignment[];
}

// =============================================================================
// In-memory cache (TTL-based with stale-while-revalidate)
// =============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

/** Default TTL: 2 minutes */
const CACHE_TTL = 2 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    // Stale — return it but caller should revalidate
    return entry.data;
  }
  return entry.data;
}

function isFresh(key: string): boolean {
  const entry = cache.get(key);
  if (!entry) return false;
  return Date.now() - entry.timestamp <= CACHE_TTL;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/** Clear all cached entries (e.g., on logout) */
export function clearApiCache(): void {
  cache.clear();
}

// =============================================================================
// System Template Cache (longer TTL - templates rarely change)
// =============================================================================

const TEMPLATE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Fetch a system form template by slug for the current user's org.
 * Cached for 10 minutes since templates rarely change.
 */
export async function fetchSystemTemplate(
  accessToken: string,
  slug: string
): Promise<SystemTemplate> {
  const cacheKey = `system-template:${slug}`;
  const entry = cache.get(cacheKey);

  if (entry && Date.now() - entry.timestamp <= TEMPLATE_CACHE_TTL) {
    return entry.data as SystemTemplate;
  }

  const url = `${API_BASE_URL}/api/forms/template-by-slug?slug=${encodeURIComponent(slug)}`;
  const response = await fetch(url, { headers: authHeaders(accessToken) });
  const data = await handleResponse<SystemTemplate>(response);
  setCache(cacheKey, data);
  return data;
}

// =============================================================================
// Recent Activities API Functions (JWT-based, authenticated)
// =============================================================================

/**
 * Fetch the last 5 recent activities for the authenticated employee.
 * Returns cached data instantly if available, revalidates in background.
 */
export async function fetchRecentActivitiesAuth(
  accessToken: string,
  locationId: string,
  employeeId: string,
  options?: { skipCache?: boolean }
): Promise<RecentActivitiesResponse> {
  const cacheKey = `recent-activities:${locationId}:${employeeId}`;

  const doFetch = async (): Promise<RecentActivitiesResponse> => {
    const params = new URLSearchParams({
      location_id: locationId,
      employee_id: employeeId,
    });
    const url = `${API_BASE_URL}/api/native/forms/my-recent-activities?${params}`;
    const response = await fetch(url, { headers: authHeaders(accessToken) });
    const data = await handleResponse<RecentActivitiesResponse>(response);
    setCache(cacheKey, data);

    // Pre-warm detail caches for visible activities
    prefetchActivityDetails(accessToken, locationId, data.activities);

    return data;
  };

  // Bypass cache on explicit refresh (pull-to-refresh)
  if (options?.skipCache) {
    return doFetch();
  }

  const cached = getCached<RecentActivitiesResponse>(cacheKey);
  if (cached && isFresh(cacheKey)) {
    return cached;
  }
  if (cached) {
    // Stale — return cached, revalidate in background
    doFetch().catch(() => {});
    return cached;
  }

  return doFetch();
}

/**
 * Pre-fetch detail pages for visible activities (fire-and-forget).
 * Only fetches rating and infraction details that aren't already cached.
 */
function prefetchActivityDetails(
  accessToken: string,
  locationId: string,
  activities: RecentActivity[]
): void {
  for (const activity of activities) {
    if (activity.type === "rating") {
      const key = `rating-detail:${locationId}:${activity.id}`;
      if (!getCached(key)) {
        fetchRatingDetailAuth(accessToken, locationId, activity.id).catch(() => {});
      }
    } else if (activity.type === "infraction" || activity.type === "disc_action") {
      const key = `infraction-detail:${locationId}:${activity.id}`;
      if (!getCached(key)) {
        fetchInfractionDetailAuth(accessToken, locationId, activity.id).catch(() => {});
      }
    }
  }
}

/**
 * Fetch detailed rating data with position labels and historical average.
 * Returns cached data instantly if available (stale-while-revalidate).
 * Pre-warmed by prefetchActivityDetails when recent activities load.
 */
export async function fetchRatingDetailAuth(
  accessToken: string,
  locationId: string,
  ratingId: string
): Promise<RatingDetailData> {
  const cacheKey = `rating-detail:${locationId}:${ratingId}`;

  const doFetch = async (): Promise<RatingDetailData> => {
    const params = new URLSearchParams({
      location_id: locationId,
      rating_id: ratingId,
    });
    const url = `${API_BASE_URL}/api/native/forms/rating-detail?${params}`;
    const response = await fetch(url, { headers: authHeaders(accessToken) });
    const data = await handleResponse<RatingDetailData>(response);
    setCache(cacheKey, data);
    return data;
  };

  const cached = getCached<RatingDetailData>(cacheKey);
  if (cached && isFresh(cacheKey)) {
    return cached;
  }
  if (cached) {
    // Stale — return cached instantly, revalidate in background
    doFetch().catch(() => {});
    return cached;
  }

  return doFetch();
}

/**
 * Fetch detailed infraction data with employee's total point value.
 * Returns cached data instantly if available (stale-while-revalidate).
 * Pre-warmed by prefetchActivityDetails when recent activities load.
 */
export async function fetchInfractionDetailAuth(
  accessToken: string,
  locationId: string,
  infractionId: string
): Promise<InfractionDetailData> {
  const cacheKey = `infraction-detail:${locationId}:${infractionId}`;

  const doFetch = async (): Promise<InfractionDetailData> => {
    const params = new URLSearchParams({
      location_id: locationId,
      infraction_id: infractionId,
    });
    const url = `${API_BASE_URL}/api/native/forms/infraction-detail?${params}`;
    const response = await fetch(url, { headers: authHeaders(accessToken) });
    const data = await handleResponse<InfractionDetailData>(response);
    setCache(cacheKey, data);
    return data;
  };

  const cached = getCached<InfractionDetailData>(cacheKey);
  if (cached && isFresh(cacheKey)) {
    return cached;
  }
  if (cached) {
    // Stale — return cached instantly, revalidate in background
    doFetch().catch(() => {});
    return cached;
  }

  return doFetch();
}

// =============================================================================
// Setup Board API Functions (JWT-based, authenticated)
// =============================================================================

/**
 * Fetch the full setup board data for a date + zone.
 */
export async function fetchSetupBoardAuth(
  accessToken: string,
  locationId: string,
  date: string,
  zone: 'FOH' | 'BOH'
): Promise<SetupBoardResponse> {
  const cacheKey = `setup-board:${locationId}:${date}:${zone}`;
  const cached = getCached<SetupBoardResponse>(cacheKey);
  if (cached && isFresh(cacheKey)) return cached;

  const params = new URLSearchParams({ location_id: locationId, date, zone });
  const url = `${API_BASE_URL}/api/native/forms/setup-board?${params}`;
  const response = await fetch(url, { headers: authHeaders(accessToken) });
  const data = await handleResponse<SetupBoardResponse>(response);
  setCache(cacheKey, data);
  return data;
}

/** Invalidate setup board cache for a given date+zone */
export function invalidateSetupCache(locationId: string, date: string, zone: string): void {
  cache.delete(`setup-board:${locationId}:${date}:${zone}`);
}

/**
 * Assign an employee to a position slot.
 */
export async function setupAssignAuth(
  accessToken: string,
  locationId: string,
  payload: {
    shift_id: string;
    employee_id: string;
    position_id: string;
    assignment_date: string;
    start_time: string;
    end_time: string;
  }
): Promise<{ assignment: SetupAssignment }> {
  const response = await fetch(`${API_BASE_URL}/api/native/forms/setup-board`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ ...payload, location_id: locationId, intent: 'assign' }),
  });
  return handleResponse<{ assignment: SetupAssignment }>(response);
}

/**
 * Unassign an employee from a position slot.
 */
export async function setupUnassignAuth(
  accessToken: string,
  locationId: string,
  assignmentId: string
): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/native/forms/setup-board`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ location_id: locationId, intent: 'unassign', id: assignmentId }),
  });
  return handleResponse<{ success: boolean }>(response);
}

/**
 * Reassign an employee to a different position.
 */
export async function setupReassignAuth(
  accessToken: string,
  locationId: string,
  assignmentId: string,
  newPositionId: string
): Promise<{ assignment: SetupAssignment }> {
  const response = await fetch(`${API_BASE_URL}/api/native/forms/setup-board`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ location_id: locationId, intent: 'reassign', id: assignmentId, position_id: newPositionId }),
  });
  return handleResponse<{ assignment: SetupAssignment }>(response);
}

// =============================================================================
// Export all
// =============================================================================

export default {
  // Token management
  setMobileToken,
  getMobileToken,
  clearMobileToken,
  // PWA Infraction API (token-based, DO NOT MODIFY)
  fetchInfractionData,
  submitInfraction,
  uploadInfractionDocument,
  // PWA Ratings API (token-based, DO NOT MODIFY)
  fetchPositionalData,
  fetchPositionLabels,
  submitRatings,
  // Native Form API (JWT-based, authenticated)
  fetchPositionalDataAuth,
  fetchPositionLabelsAuth,
  submitRatingsAuth,
  fetchInfractionDataAuth,
  submitInfractionAuth,
  uploadInfractionDocumentAuth,
  // Form Management API
  fetchSystemTemplate,
  // Submissions API (JWT-based, authenticated)
  fetchSubmissionsAuth,
  // Schedule API (JWT-based, authenticated)
  fetchMyScheduleAuth,
  fetchMyTodayAuth,
  // Employee API (JWT-based, authenticated)
  fetchEmployeesAuth,
  fetchEmployeeProfileAuth,
  // Recent Activities API (JWT-based, authenticated)
  fetchRecentActivitiesAuth,
  fetchRatingDetailAuth,
  fetchInfractionDetailAuth,
  clearApiCache,
  // Setup Board API (JWT-based, authenticated)
  fetchSetupBoardAuth,
  invalidateSetupCache,
  setupAssignAuth,
  setupUnassignAuth,
  setupReassignAuth,
};
