/**
 * Fetch and parse employee position averages from Google Sheets bundles
 * Used for certification evaluation
 */

import type { Employee } from './supabase.types';

export interface PositionAverages {
  employeeId: string;
  employeeName: string;
  positions: Record<string, number>; // position -> average
}

interface BundlePayload {
  header: (string | number)[];
  rows: (string | number)[][];
  sheetName: string;
  updated: string;
}

interface Bundle {
  tabs: Record<string, BundlePayload>;
}

/**
 * Fetch the ratings bundle from Google Cloud Storage
 * @param bundleUrl - URL to the bundle JSON file
 * @returns Parsed bundle object
 */
export async function fetchBundle(bundleUrl: string): Promise<Bundle | null> {
  try {
    const response = await fetch(bundleUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch bundle: HTTP ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data || !data.tabs) {
      console.error('Invalid bundle schema: missing tabs');
      return null;
    }
    
    return data as Bundle;
  } catch (error) {
    console.error('Error fetching bundle:', error);
    return null;
  }
}

/**
 * Check if a value is a valid numeric rating (0-3 range)
 * @param val - Value to check
 * @returns boolean
 */
function isPureNumber(val: any): boolean {
  if (val === null || val === undefined || val === '') return false;
  const str = String(val).trim();
  if (str === '') return false;
  const num = parseFloat(str);
  return !isNaN(num) && isFinite(num) && num >= 0 && num <= 3.0;
}

/**
 * Strip whitespace and special characters
 */
function strip(v: any): string {
  return String(v ?? '').replace(/[\s\u00A0\u2007\u202F]+/g, '').trim();
}

/**
 * Parse FOH or BOH tab to extract employee position averages
 * @param payload - The tab payload from the bundle
 * @returns Map of employee names to their position averages
 */
function parseTabForAverages(payload: BundlePayload): Map<string, Record<string, number>> {
  const result = new Map<string, Record<string, number>>();
  
  const header = payload.header;
  const rows = payload.rows;
  
  // Find the "# of Ratings" column to exclude it
  const ratingsIdx = header.findIndex(h => 
    typeof h === 'string' && /#\s*of\s*ratings/i.test(h)
  );
  
  // Process each row
  rows.forEach(row => {
    // Employee name is in the second column (index 1)
    const employeeName = strip(row[1]);
    
    if (!employeeName) return; // Skip empty names
    
    const positions: Record<string, number> = {};
    
    // Start from column 2 (first position column) and process each column
    for (let col = 2; col < header.length; col++) {
      // Skip the "# of Ratings" column
      if (col === ratingsIdx) continue;
      
      const positionName = String(header[col]).trim();
      const value = row[col];
      
      // Only include valid numeric ratings
      if (positionName && isPureNumber(value)) {
        const average = parseFloat(String(value));
        positions[positionName] = average;
      }
    }
    
    // Only add if there are position averages
    if (Object.keys(positions).length > 0) {
      result.set(employeeName, positions);
    }
  });
  
  return result;
}

/**
 * Fetch all position averages for employees from a location's bundle
 * @param bundleUrl - URL to the Google Sheets bundle
 * @param employees - List of employees to match against
 * @returns Array of PositionAverages objects
 */
export async function fetchEmployeePositionAverages(
  bundleUrl: string,
  employees: Employee[]
): Promise<PositionAverages[]> {
  const bundle = await fetchBundle(bundleUrl);
  
  if (!bundle) {
    console.error('Failed to fetch bundle');
    return [];
  }
  
  // Create a map of employee names to IDs for matching
  const nameToId = new Map<string, string>();
  employees.forEach(emp => {
    const name = emp.full_name || `${emp.first_name} ${emp.last_name || ''}`.trim();
    if (name) {
      nameToId.set(name.toLowerCase(), emp.id);
    }
  });
  
  // Parse FOH and BOH tabs
  const fohAverages = bundle.tabs['FOH'] ? parseTabForAverages(bundle.tabs['FOH']) : new Map();
  const bohAverages = bundle.tabs['BOH'] ? parseTabForAverages(bundle.tabs['BOH']) : new Map();
  
  // Combine FOH and BOH data
  const result: PositionAverages[] = [];
  const processedEmployees = new Set<string>();
  
  // Process FOH data
  fohAverages.forEach((positions, employeeName) => {
    const employeeId = nameToId.get(employeeName.toLowerCase());
    
    if (employeeId) {
      result.push({
        employeeId,
        employeeName,
        positions,
      });
      processedEmployees.add(employeeId);
    }
  });
  
  // Process BOH data
  bohAverages.forEach((positions, employeeName) => {
    const employeeId = nameToId.get(employeeName.toLowerCase());
    
    if (!employeeId) return;
    
    // If employee was already processed from FOH, merge the positions
    const existing = result.find(r => r.employeeId === employeeId);
    if (existing) {
      existing.positions = { ...existing.positions, ...positions };
    } else {
      result.push({
        employeeId,
        employeeName,
        positions,
      });
      processedEmployees.add(employeeId);
    }
  });
  
  return result;
}

/**
 * Get position averages for a single employee
 * @param bundleUrl - URL to the Google Sheets bundle
 * @param employee - The employee to get averages for
 * @returns PositionAverages object or null
 */
export async function getEmployeePositionAverages(
  bundleUrl: string,
  employee: Employee
): Promise<PositionAverages | null> {
  const averages = await fetchEmployeePositionAverages(bundleUrl, [employee]);
  return averages.length > 0 ? averages[0] : null;
}

/**
 * Get bundle URL for a location
 * @param locationId - The location ID
 * @returns Bundle URL or null if not found
 */
export function getBundleUrlForLocation(locationId: string): string | null {
  // These URLs should be configured in environment variables
  // For now, using the known Buda URL as example
  
  const budaLocationId = process.env.NEXT_PUBLIC_BUDA_LOCATION_ID;
  const westBudaLocationId = process.env.NEXT_PUBLIC_WEST_BUDA_LOCATION_ID;
  
  if (locationId === budaLocationId) {
    return 'https://storage.googleapis.com/trainingapp-assets/snapshots/buda/all.json';
  }
  
  if (locationId === westBudaLocationId) {
    // Assuming West Buda has a similar structure
    return 'https://storage.googleapis.com/trainingapp-assets/snapshots/west-buda/all.json';
  }
  
  return null;
}
