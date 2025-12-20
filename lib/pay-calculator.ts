/**
 * Pay Calculator for multiple organizations
 * Each organization can have its own pay structure
 */

import type { Employee, AvailabilityType, CertificationStatus } from './supabase.types';

// CFA Buda and CFA West Buda location IDs (Reece Howard organization)
// These locations use the special pay calculation logic with certification
export const CFA_BUDA_LOCATION_IDS = [
  '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', // CFA Buda
  'e437119c-27d9-4114-9273-350925016738', // CFA West Buda
];

// Riley Emter organization location IDs
// These locations use a simpler pay structure without certification
export const RILEY_EMTER_LOCATION_IDS = [
  'd2f47920-543d-44d2-bcd4-d5f9a63009c0', // Manor FSU (05467)
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

// Riley Emter pay structure (no certification logic - simpler flat rates)
interface RileyEmterPayStructure {
  teamMember: {
    fohLimited: number;
    fohAvailable: number;
    bohLimited: number;
    bohAvailable: number;
  };
  trainer: {
    fohLimited: number;
    fohAvailable: number;
    bohLimited: number;
    bohAvailable: number;
  };
  teamLeader: {
    foh: number;
    boh: number;
  };
  areaCoordinator: number;
  director: number;
}

const RILEY_EMTER_PAY_STRUCTURE: RileyEmterPayStructure = {
  teamMember: {
    fohLimited: 12,
    fohAvailable: 14,
    bohLimited: 13,
    bohAvailable: 15,
  },
  trainer: {
    fohLimited: 15,
    fohAvailable: 16,
    bohLimited: 16,
    bohAvailable: 17,
  },
  teamLeader: {
    foh: 18,
    boh: 19,
  },
  areaCoordinator: 22,
  director: 24,
};

/**
 * Helper function to determine if an employee counts as "certified" for pay purposes
 * Certified and PIP statuses count as certified, Not Certified and Pending do not
 */
function isCertifiedForPay(certifiedStatus?: CertificationStatus): boolean {
  return certifiedStatus === 'Certified' || certifiedStatus === 'PIP';
}

/**
 * Calculate pay for an employee based on CFA Buda pay structure
 * 
 * Rules:
 * - New Hire gets same pay as Team Member
 * - Team Member pay varies by FOH/BOH and availability
 * - If both FOH and BOH, use BOH (higher pay)
 * - Trainer pay varies by availability only (ignore FOH/BOH)
 * - Leadership (Team Leader, Director, Executive) ignore both availability and FOH/BOH
 * - Certified/PIP employees get higher pay across all roles
 */
export function calculatePay(employee: Employee): number | null {
  const role = employee.role?.trim();
  const isCertified = isCertifiedForPay(employee.certified_status);
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
 * Calculate pay for Riley Emter organization employees
 * 
 * Rules:
 * - Team Member pay varies by FOH/BOH and availability
 * - Trainer pay varies by FOH/BOH and availability
 * - Team Leader pay varies by FOH/BOH only (availability ignored)
 * - Area Coordinator and Director have flat rates (FOH/BOH ignored)
 * - If both FOH and BOH, use the higher of the two (BOH)
 * - If neither FOH nor BOH, return null
 */
export function calculatePayRileyEmter(employee: Employee): number | null {
  const role = employee.role?.trim();
  const availability = employee.availability || 'Available';
  const isFoh = employee.is_foh === true;
  const isBoh = employee.is_boh === true;

  // If neither FOH nor BOH is set, return null
  if (!isFoh && !isBoh) {
    return null;
  }

  // Normalize role names
  const normalizedRole = role?.toLowerCase();

  // Team Member or New Hire
  if (normalizedRole === 'team member' || normalizedRole === 'new hire') {
    // If both, use BOH (higher pay)
    if (isBoh) {
      return availability === 'Limited'
        ? RILEY_EMTER_PAY_STRUCTURE.teamMember.bohLimited
        : RILEY_EMTER_PAY_STRUCTURE.teamMember.bohAvailable;
    } else {
      return availability === 'Limited'
        ? RILEY_EMTER_PAY_STRUCTURE.teamMember.fohLimited
        : RILEY_EMTER_PAY_STRUCTURE.teamMember.fohAvailable;
    }
  }

  // Trainer
  if (normalizedRole === 'trainer') {
    // If both, use BOH (higher pay)
    if (isBoh) {
      return availability === 'Limited'
        ? RILEY_EMTER_PAY_STRUCTURE.trainer.bohLimited
        : RILEY_EMTER_PAY_STRUCTURE.trainer.bohAvailable;
    } else {
      return availability === 'Limited'
        ? RILEY_EMTER_PAY_STRUCTURE.trainer.fohLimited
        : RILEY_EMTER_PAY_STRUCTURE.trainer.fohAvailable;
    }
  }

  // Team Leader (availability ignored)
  if (normalizedRole === 'team lead' || normalizedRole === 'team leader') {
    // If both, use BOH (higher pay)
    return isBoh
      ? RILEY_EMTER_PAY_STRUCTURE.teamLeader.boh
      : RILEY_EMTER_PAY_STRUCTURE.teamLeader.foh;
  }

  // Area Coordinator (FOH/BOH doesn't affect pay, but must be set)
  if (normalizedRole === 'area coordinator') {
    return RILEY_EMTER_PAY_STRUCTURE.areaCoordinator;
  }

  // Director (FOH/BOH doesn't affect pay, but must be set)
  if (normalizedRole === 'director') {
    return RILEY_EMTER_PAY_STRUCTURE.director;
  }

  // Operator and unknown roles return null
  return null;
}

/**
 * Check if a location should use pay calculation
 */
export function shouldCalculatePay(locationId: string): boolean {
  return CFA_BUDA_LOCATION_IDS.includes(locationId) || RILEY_EMTER_LOCATION_IDS.includes(locationId);
}

/**
 * Check which pay calculation to use for a location
 */
export function getPayCalculationType(locationId: string): 'cfa_buda' | 'riley_emter' | null {
  if (CFA_BUDA_LOCATION_IDS.includes(locationId)) {
    return 'cfa_buda';
  }
  if (RILEY_EMTER_LOCATION_IDS.includes(locationId)) {
    return 'riley_emter';
  }
  return null;
}

/**
 * Calculate pay for an employee based on their location
 */
export function calculatePayForLocation(employee: Employee, locationId: string): number | null {
  const payType = getPayCalculationType(locationId);
  
  if (payType === 'cfa_buda') {
    return calculatePay(employee);
  }
  
  if (payType === 'riley_emter') {
    return calculatePayRileyEmter(employee);
  }
  
  return null;
}

/**
 * Get a summary of how pay was calculated (for debugging/display)
 */
export function getPayCalculationSummary(employee: Employee): string {
  const role = employee.role?.trim().toLowerCase();
  const isCertified = isCertifiedForPay(employee.certified_status);
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

  parts.push(`Status: ${employee.certified_status || 'Not Certified'}`);
  parts.push(`Pay Level: ${isCertified ? 'Certified' : 'Starting'}`);
  parts.push(`Pay: $${calculatePay(employee)?.toFixed(2) || 'N/A'}`);

  return parts.join(' | ');
}

