/**
 * Form Validation Utilities
 * Reusable validation functions for mobile forms
 */

// =============================================================================
// Types
// =============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface FieldValidation {
  field: string;
  value: unknown;
  rules: ValidationRule[];
}

export type ValidationRule =
  | { type: "required"; message?: string }
  | { type: "minLength"; length: number; message?: string }
  | { type: "maxLength"; length: number; message?: string }
  | { type: "pattern"; pattern: RegExp; message?: string }
  | { type: "custom"; validate: (value: unknown) => boolean; message: string }
  | { type: "arrayLength"; length: number; message?: string }
  | { type: "arrayAllValid"; validate: (item: unknown) => boolean; message?: string }
  | { type: "signatureRequired"; message?: string }
  | { type: "ratingValue"; message?: string };

// =============================================================================
// Validation Rule Checkers
// =============================================================================

/**
 * Check if a value is empty (null, undefined, empty string, empty array)
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Check if a string value meets minimum length
 */
export function isMinLength(value: string, minLength: number): boolean {
  return value.trim().length >= minLength;
}

/**
 * Check if a string value is within maximum length
 */
export function isMaxLength(value: string, maxLength: number): boolean {
  return value.trim().length <= maxLength;
}

/**
 * Check if a value matches a pattern
 */
export function matchesPattern(value: string, pattern: RegExp): boolean {
  return pattern.test(value);
}

/**
 * Check if a signature is valid (non-empty base64 data)
 */
export function isValidSignature(signature: string | null | undefined): boolean {
  if (!signature) return false;
  // Check for actual image data (not just empty canvas)
  // A blank signature canvas typically produces a very short base64 string
  const trimmed = signature.trim();
  if (trimmed === "") return false;
  // Base64 encoded PNG starts with specific header
  if (trimmed.startsWith("data:image/png;base64,")) {
    const data = trimmed.substring("data:image/png;base64,".length);
    // A blank canvas produces ~1-2KB, actual signatures are usually larger
    return data.length > 2000;
  }
  return trimmed.length > 100;
}

/**
 * Check if a rating value is valid (1, 2, or 3)
 */
export function isValidRating(value: unknown): boolean {
  return value === 1 || value === 2 || value === 3;
}

/**
 * Check if all ratings in an array are valid
 */
export function areAllRatingsValid(ratings: unknown[]): boolean {
  if (!Array.isArray(ratings)) return false;
  return ratings.every(isValidRating);
}

// =============================================================================
// Single Field Validation
// =============================================================================

/**
 * Validate a single field against a set of rules
 */
export function validateField(
  value: unknown,
  rules: ValidationRule[]
): string | null {
  for (const rule of rules) {
    switch (rule.type) {
      case "required":
        if (isEmpty(value)) {
          return rule.message || "This field is required";
        }
        break;

      case "minLength":
        if (typeof value === "string" && !isMinLength(value, rule.length)) {
          return rule.message || `Must be at least ${rule.length} characters`;
        }
        break;

      case "maxLength":
        if (typeof value === "string" && !isMaxLength(value, rule.length)) {
          return rule.message || `Must be no more than ${rule.length} characters`;
        }
        break;

      case "pattern":
        if (typeof value === "string" && !matchesPattern(value, rule.pattern)) {
          return rule.message || "Invalid format";
        }
        break;

      case "custom":
        if (!rule.validate(value)) {
          return rule.message;
        }
        break;

      case "arrayLength":
        if (!Array.isArray(value) || value.length !== rule.length) {
          return rule.message || `Must have exactly ${rule.length} items`;
        }
        break;

      case "arrayAllValid":
        if (!Array.isArray(value) || !value.every(rule.validate)) {
          return rule.message || "All items must be valid";
        }
        break;

      case "signatureRequired":
        if (!isValidSignature(value as string)) {
          return rule.message || "Signature is required";
        }
        break;

      case "ratingValue":
        if (!isValidRating(value)) {
          return rule.message || "Please select a rating";
        }
        break;
    }
  }
  return null;
}

// =============================================================================
// Form Validation
// =============================================================================

/**
 * Validate multiple fields at once
 */
export function validateForm(fields: FieldValidation[]): ValidationResult {
  const errors: Record<string, string> = {};

  for (const { field, value, rules } of fields) {
    const error = validateField(value, rules);
    if (error) {
      errors[field] = error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// =============================================================================
// Discipline Infraction Form Validation
// =============================================================================

export interface DisciplineInfractionFormData {
  leaderId: string | null;
  employeeId: string | null;
  infractionId: string | null;
  date: Date;
  acknowledged: boolean;
  notes: string;
  teamSignature: string | null;
  leaderSignature: string | null;
  requireTeamSignature?: boolean;
}

/**
 * Validate the Discipline Infraction form
 */
export function validateDisciplineInfractionForm(
  data: DisciplineInfractionFormData
): ValidationResult {
  const fields: FieldValidation[] = [
    {
      field: "leaderId",
      value: data.leaderId,
      rules: [{ type: "required", message: "Please select a leader" }],
    },
    {
      field: "employeeId",
      value: data.employeeId,
      rules: [{ type: "required", message: "Please select an employee" }],
    },
    {
      field: "infractionId",
      value: data.infractionId,
      rules: [{ type: "required", message: "Please select an infraction type" }],
    },
    {
      field: "leaderSignature",
      value: data.leaderSignature,
      rules: [{ type: "signatureRequired", message: "Leader signature is required" }],
    },
  ];

  // Team signature is required if acknowledged OR if infraction requires it
  if (data.acknowledged || data.requireTeamSignature) {
    fields.push({
      field: "teamSignature",
      value: data.teamSignature,
      rules: [{ type: "signatureRequired", message: "Team member signature is required" }],
    });
  }

  return validateForm(fields);
}

/**
 * Check if discipline infraction form is complete (for submit button state)
 */
export function isDisciplineInfractionFormComplete(
  data: DisciplineInfractionFormData
): boolean {
  const { isValid } = validateDisciplineInfractionForm(data);
  return isValid;
}

// =============================================================================
// Positional Ratings Form Validation
// =============================================================================

export interface PositionalRatingsFormData {
  leaderId: string | null;
  employeeId: string | null;
  positionKey: string | null;
  ratings: (number | null)[];
  notes: string;
  requireRatingComments: boolean;
  expectedRatingsCount: number;
}

/**
 * Validate the Positional Ratings form
 */
export function validatePositionalRatingsForm(
  data: PositionalRatingsFormData
): ValidationResult {
  const fields: FieldValidation[] = [
    {
      field: "leaderId",
      value: data.leaderId,
      rules: [{ type: "required", message: "Please select a leader" }],
    },
    {
      field: "employeeId",
      value: data.employeeId,
      rules: [{ type: "required", message: "Please select an employee" }],
    },
    {
      field: "positionKey",
      value: data.positionKey,
      rules: [{ type: "required", message: "Please select a position" }],
    },
  ];

  // Validate each rating
  for (let i = 0; i < data.expectedRatingsCount; i++) {
    fields.push({
      field: `rating_${i}`,
      value: data.ratings[i],
      rules: [{ type: "ratingValue", message: "Please select a rating" }],
    });
  }

  // Notes required if org settings require it
  if (data.requireRatingComments) {
    fields.push({
      field: "notes",
      value: data.notes,
      rules: [{ type: "required", message: "Additional details are required" }],
    });
  }

  return validateForm(fields);
}

/**
 * Check if positional ratings form is complete (for submit button state)
 */
export function isPositionalRatingsFormComplete(
  data: PositionalRatingsFormData
): boolean {
  const { isValid } = validatePositionalRatingsForm(data);
  return isValid;
}

// =============================================================================
// Date Validation
// =============================================================================

/**
 * Format a date as YYYY-MM-DD for API submission
 */
export function formatDateForApi(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Validate date is in YYYY-MM-DD format
 */
export function isValidDateFormat(dateString: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
}

/**
 * Check if a date is not in the future
 */
export function isNotFutureDate(date: Date): boolean {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date <= today;
}

// =============================================================================
// Export default validation utilities
// =============================================================================

export default {
  // Checkers
  isEmpty,
  isMinLength,
  isMaxLength,
  matchesPattern,
  isValidSignature,
  isValidRating,
  areAllRatingsValid,
  // Validation
  validateField,
  validateForm,
  // Form-specific
  validateDisciplineInfractionForm,
  isDisciplineInfractionFormComplete,
  validatePositionalRatingsForm,
  isPositionalRatingsFormComplete,
  // Date utilities
  formatDateForApi,
  isValidDateFormat,
  isNotFutureDate,
};
