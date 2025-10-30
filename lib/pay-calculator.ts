/**
 * Pay Calculator for CFA Buda and CFA West Buda locations
 * Based on 2025 Pay Ranges chart
 */

import type { Employee, AvailabilityType } from './supabase.types';

// CFA Buda and CFA West Buda location IDs
// These locations use the special pay calculation logic
export const CFA_BUDA_LOCATION_IDS = [
  '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', // CFA Buda
  'e437119c-27d9-4114-9273-350925016738', // CFA West Buda
];

// Pay structure based on the 2025 pay chart
interface PayRate {
  starting: number;
  certified: number;
}

interface PayStructure {
  // Team Member rates (including New Hire)
  teamMember: {
    serviceLimited: PayRate;      // FOH Limited
    serviceAvailable: PayRate;     // FOH Available
    productionLimited: PayRate;    // BOH Limited
    productionAvailable: PayRate;  // BOH Available
  };
  // Trainer rates (ignore FOH/BOH)
  trainer: {
    limited: PayRate;
    available: PayRate;
  };
  // Leadership rates (always "Available", ignore FOH/BOH)
  teamLeader: PayRate;
  director: PayRate;
  executive: PayRate;
}

const CFA_BUDA_PAY_STRUCTURE: PayStructure = {
  teamMember: {
    serviceLimited: { starting: 11, certified: 13 },
    serviceAvailable: { starting: 15, certified: 17 },
    productionLimited: { starting: 14, certified: 15 },
    productionAvailable: { starting: 16, certified: 18 },
  },
  trainer: {
    limited: { starting: 14, certified: 15 },
    available: { starting: 19, certified: 20 },
  },
  teamLeader: { starting: 21, certified: 25 },
  director: { starting: 27, certified: 30 },
  executive: { starting: 32, certified: 36 },
};

/**
 * Calculate pay for an employee based on CFA Buda pay structure
 * 
 * Rules:
 * - New Hire gets same pay as Team Member
 * - Team Member pay varies by FOH/BOH and availability
 * - If both FOH and BOH, use BOH (higher pay)
 * - Trainer pay varies by availability only (ignore FOH/BOH)
 * - Leadership (Team Leader, Director, Executive) ignore both availability and FOH/BOH
 * - Certified employees get higher pay across all roles
 */
export function calculatePay(employee: Employee): number | null {
  const role = employee.role?.trim();
  const isCertified = employee.is_certified === true;
  const availability = employee.availability || 'Available';
  const isFoh = employee.is_foh === true;
  const isBoh = employee.is_boh === true;

  // Normalize role names
  const normalizedRole = role?.toLowerCase();

  // Team Member or New Hire
  if (normalizedRole === 'team member' || normalizedRole === 'new hire') {
    // Determine if Service (FOH) or Production (BOH)
    // If both, use BOH (higher pay)
    const isProduction = isBoh;
    const isService = isFoh && !isBoh; // Only service if FOH and NOT BOH

    if (isProduction) {
      // Production (BOH)
      if (availability === 'Limited') {
        return isCertified 
          ? CFA_BUDA_PAY_STRUCTURE.teamMember.productionLimited.certified
          : CFA_BUDA_PAY_STRUCTURE.teamMember.productionLimited.starting;
      } else {
        return isCertified
          ? CFA_BUDA_PAY_STRUCTURE.teamMember.productionAvailable.certified
          : CFA_BUDA_PAY_STRUCTURE.teamMember.productionAvailable.starting;
      }
    } else if (isService) {
      // Service (FOH)
      if (availability === 'Limited') {
        return isCertified
          ? CFA_BUDA_PAY_STRUCTURE.teamMember.serviceLimited.certified
          : CFA_BUDA_PAY_STRUCTURE.teamMember.serviceLimited.starting;
      } else {
        return isCertified
          ? CFA_BUDA_PAY_STRUCTURE.teamMember.serviceAvailable.certified
          : CFA_BUDA_PAY_STRUCTURE.teamMember.serviceAvailable.starting;
      }
    } else {
      // Neither FOH nor BOH set - return null or default?
      // For now, default to Service Available
      return isCertified
        ? CFA_BUDA_PAY_STRUCTURE.teamMember.serviceAvailable.certified
        : CFA_BUDA_PAY_STRUCTURE.teamMember.serviceAvailable.starting;
    }
  }

  // Trainer (ignore FOH/BOH)
  if (normalizedRole === 'trainer') {
    if (availability === 'Limited') {
      return isCertified
        ? CFA_BUDA_PAY_STRUCTURE.trainer.limited.certified
        : CFA_BUDA_PAY_STRUCTURE.trainer.limited.starting;
    } else {
      return isCertified
        ? CFA_BUDA_PAY_STRUCTURE.trainer.available.certified
        : CFA_BUDA_PAY_STRUCTURE.trainer.available.starting;
    }
  }

  // Team Leader (ignore availability and FOH/BOH)
  if (normalizedRole === 'team lead' || normalizedRole === 'team leader') {
    return isCertified
      ? CFA_BUDA_PAY_STRUCTURE.teamLeader.certified
      : CFA_BUDA_PAY_STRUCTURE.teamLeader.starting;
  }

  // Director (ignore availability and FOH/BOH)
  if (normalizedRole === 'director') {
    return isCertified
      ? CFA_BUDA_PAY_STRUCTURE.director.certified
      : CFA_BUDA_PAY_STRUCTURE.director.starting;
  }

  // Executive (ignore availability and FOH/BOH)
  if (normalizedRole === 'executive') {
    return isCertified
      ? CFA_BUDA_PAY_STRUCTURE.executive.certified
      : CFA_BUDA_PAY_STRUCTURE.executive.starting;
  }

  // Unknown role
  return null;
}

/**
 * Check if a location should use CFA Buda pay calculation
 */
export function shouldCalculatePay(locationId: string): boolean {
  return CFA_BUDA_LOCATION_IDS.includes(locationId);
}

/**
 * Get a summary of how pay was calculated (for debugging/display)
 */
export function getPayCalculationSummary(employee: Employee): string {
  const role = employee.role?.trim().toLowerCase();
  const isCertified = employee.is_certified === true;
  const availability = employee.availability || 'Available';
  const isFoh = employee.is_foh === true;
  const isBoh = employee.is_boh === true;

  const parts: string[] = [];
  parts.push(`Role: ${employee.role}`);

  if (role === 'team member' || role === 'new hire') {
    const type = isBoh ? 'Production (BOH)' : isFoh ? 'Service (FOH)' : 'Service (default)';
    parts.push(type);
    parts.push(`Availability: ${availability}`);
  } else if (role === 'trainer') {
    parts.push(`Availability: ${availability}`);
  }

  parts.push(isCertified ? 'Certified' : 'Not Certified');
  parts.push(`Pay: $${calculatePay(employee)?.toFixed(2) || 'N/A'}`);

  return parts.join(' | ');
}

