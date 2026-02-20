/**
 * API Service
 * Handles all API calls to the Levelset backend
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

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
 * Submit positional ratings (authenticated)
 */
export async function submitRatingsAuth(
  accessToken: string,
  locationId: string,
  data: RatingsSubmission
): Promise<SubmissionResult> {
  const response = await fetch(
    `${API_BASE_URL}/api/native/forms/ratings`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ ...data, location_id: locationId }),
    }
  );
  return handleResponse<SubmissionResult>(response);
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
 * Submit a discipline infraction (authenticated)
 */
export async function submitInfractionAuth(
  accessToken: string,
  locationId: string,
  data: InfractionSubmission
): Promise<SubmissionResult> {
  const response = await fetch(
    `${API_BASE_URL}/api/native/forms/infractions`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ ...data, location_id: locationId }),
    }
  );
  return handleResponse<SubmissionResult>(response);
}

/**
 * Upload a document attachment for an infraction (authenticated)
 */
export async function uploadInfractionDocumentAuth(
  accessToken: string,
  locationId: string,
  infractionId: string,
  file: { uri: string; name: string; type: string }
): Promise<{ id: string; file_name: string }> {
  const formData = new FormData();
  formData.append("infraction_id", infractionId);
  formData.append("location_id", locationId);
  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  const response = await fetch(
    `${API_BASE_URL}/api/native/forms/infraction-documents`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    }
  );
  return handleResponse<{ id: string; file_name: string }>(response);
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
};
