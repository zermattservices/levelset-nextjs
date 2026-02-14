/**
 * Fuzzy matching utility to match spreadsheet employee names to Supabase employees
 */

import type { Employee } from '@/lib/supabase.types';
import { parseEmployeeName, type ParsedName } from './name-parser';

export interface MatchResult {
  employee: Employee | null;
  confidence: 'exact' | 'high' | 'medium' | 'low' | 'none';
  score: number;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1].toLowerCase() === str2[j - 1].toLowerCase() ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Normalize string for comparison (lowercase, remove extra spaces, punctuation)
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim();
}

/**
 * Check if two names match exactly (case-insensitive)
 */
function exactMatch(name1: string, name2: string): boolean {
  return normalize(name1) === normalize(name2);
}

/**
 * Check if first name matches and last name contains the other
 */
function partialMatch(parsed: ParsedName, employee: Employee): boolean {
  const empFirstName = employee.first_name || '';
  const empLastName = employee.last_name || '';
  const empFullName = employee.full_name || '';
  const empPayrollName = employee.payroll_name || '';

  // Check if payroll_name matches exactly
  if (empPayrollName && exactMatch(parsed.fullName, empPayrollName)) {
    return true;
  }

  // Check first name match (case-insensitive)
  const normalizedParsedFirst = normalize(parsed.firstName);
  const normalizedEmpFirst = normalize(empFirstName);
  if (normalizedParsedFirst !== normalizedEmpFirst) {
    return false;
  }

  // Check if last name contains the other (handles multiple last names)
  const normalizedParsedLast = normalize(parsed.lastName);
  const normalizedEmpLast = normalize(empLastName);
  
  return normalizedParsedLast.includes(normalizedEmpLast) || 
         normalizedEmpLast.includes(normalizedParsedLast);
}

/**
 * Calculate similarity score between parsed name and employee (0-1)
 */
function calculateSimilarity(parsed: ParsedName, employee: Employee): number {
  const empFirstName = employee.first_name || '';
  const empLastName = employee.last_name || '';
  const empFullName = employee.full_name || '';
  const empPayrollName = employee.payroll_name || '';

  // Exact payroll name match = 1.0
  if (empPayrollName && exactMatch(parsed.fullName, empPayrollName)) {
    return 1.0;
  }

  // Exact first + last match = 0.95
  if (exactMatch(parsed.firstName, empFirstName) && 
      exactMatch(parsed.lastName, empLastName)) {
    return 0.95;
  }

  // Partial match (first matches, last contains) = 0.85 (increased from 0.8)
  if (partialMatch(parsed, employee)) {
    return 0.85;
  }

  // Also check if first name matches and last name is very similar (handles "Zavodny, Lucy" -> "Lucy Zavodny")
  const normalizedParsedFirst = normalize(parsed.firstName);
  const normalizedEmpFirst = normalize(empFirstName);
  const normalizedParsedLast = normalize(parsed.lastName);
  const normalizedEmpLast = normalize(empLastName);
  
  // Only give high score if last names actually match (not just first name)
  if (normalizedParsedFirst === normalizedEmpFirst && 
      (normalizedParsedLast === normalizedEmpLast || 
       normalizedParsedLast.includes(normalizedEmpLast) || 
       normalizedEmpLast.includes(normalizedParsedLast))) {
    return 0.85;
  }
  
  // Reverse check: parsed last matches emp first, parsed first matches emp last (handles name order differences)
  if (normalizedParsedLast === normalizedEmpFirst && 
      normalizedParsedFirst === normalizedEmpLast) {
    return 0.85;
  }
  
  // If first names match but last names are completely different, penalize heavily
  // This prevents "Castro, Jessica" from matching "Jessica Badejo"
  if (normalizedParsedFirst === normalizedEmpFirst && normalizedParsedFirst.length > 0) {
    const lastNameDistance = levenshteinDistance(normalizedParsedLast, normalizedEmpLast);
    const lastNameMaxLen = Math.max(normalizedParsedLast.length, normalizedEmpLast.length);
    const lastNameSimilarity = lastNameMaxLen > 0
      ? 1 - (lastNameDistance / lastNameMaxLen)
      : 0;
    
    // If last names are very different (similarity < 0.3), don't give a high score
    // This means last names must have at least some similarity
    if (lastNameSimilarity < 0.3) {
      // Return a lower score that won't meet the 'high' confidence threshold
      // Cap at 0.65 to prevent false matches when only first name matches
      return 0.65;
    }
  }

  // Calculate Levenshtein distance for first name
  const firstNameDistance = levenshteinDistance(
    normalize(parsed.firstName),
    normalize(empFirstName)
  );
  const firstNameMaxLen = Math.max(parsed.firstName.length, empFirstName.length);
  const firstNameSimilarity = firstNameMaxLen > 0 
    ? 1 - (firstNameDistance / firstNameMaxLen)
    : 0;

  // Calculate Levenshtein distance for last name
  const lastNameDistance = levenshteinDistance(
    normalize(parsed.lastName),
    normalize(empLastName)
  );
  const lastNameMaxLen = Math.max(parsed.lastName.length, empLastName.length);
  const lastNameSimilarity = lastNameMaxLen > 0
    ? 1 - (lastNameDistance / lastNameMaxLen)
    : 0;

  // Also check against full_name
  const fullNameDistance = levenshteinDistance(
    normalize(parsed.fullName),
    normalize(empFullName)
  );
  const fullNameMaxLen = Math.max(parsed.fullName.length, empFullName.length);
  const fullNameSimilarity = fullNameMaxLen > 0
    ? 1 - (fullNameDistance / fullNameMaxLen)
    : 0;

  // Weighted average: first name 40%, last name 40%, full name 20%
  const weightedSimilarity = 
    (firstNameSimilarity * 0.4) + 
    (lastNameSimilarity * 0.4) + 
    (fullNameSimilarity * 0.2);

  return weightedSimilarity;
}

/**
 * Match a parsed spreadsheet name to the best employee from a list
 */
export function matchEmployee(
  parsedName: ParsedName,
  employees: Employee[]
): MatchResult {
  if (employees.length === 0) {
    return {
      employee: null,
      confidence: 'none',
      score: 0,
    };
  }

  // Calculate similarity scores for all employees
  const matches = employees.map(emp => ({
    employee: emp,
    score: calculateSimilarity(parsedName, emp),
  }));

  // Sort by score (highest first)
  matches.sort((a, b) => b.score - a.score);

  const bestMatch = matches[0];
  const secondBestMatch = matches[1];

  if (!bestMatch || bestMatch.score === 0) {
    return {
      employee: null,
      confidence: 'none',
      score: 0,
    };
  }

  // Determine confidence level
  let confidence: MatchResult['confidence'];
  if (bestMatch.score >= 0.9) {
    confidence = 'exact';
  } else if (bestMatch.score >= 0.7) {
    confidence = 'high';
  } else if (bestMatch.score >= 0.5) {
    confidence = 'medium';
  } else if (bestMatch.score >= 0.3) {
    confidence = 'low';
  } else {
    confidence = 'none';
  }

  // If there's a second best match that's very close, be more conservative
  // Only return match if best match is significantly better than second best
  if (secondBestMatch && secondBestMatch.score > 0) {
    const scoreDifference = bestMatch.score - secondBestMatch.score;
    // If scores are too close (within 0.15), don't auto-match
    if (scoreDifference < 0.15 && bestMatch.score < 0.9) {
      return {
        employee: null,
        confidence: 'none',
        score: bestMatch.score,
      };
    }
  }

  // Only return match if confidence is at least medium
  if (confidence === 'none' || confidence === 'low') {
    return {
      employee: null,
      confidence,
      score: bestMatch.score,
    };
  }

  return {
    employee: bestMatch.employee,
    confidence,
    score: bestMatch.score,
  };
}

