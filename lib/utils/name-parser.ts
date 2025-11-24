/**
 * Parses employee names from HR/Payroll spreadsheet format
 * Format: "Last, First Middle (Nickname)" or variations
 * Examples:
 * - "Aguilera Andrade, Yaqueline"
 * - "Badejo, Jessica I"
 * - "Chavez, Jacquelynn E (Jackie)"
 * - "Hicks , Vanessa Marie (Vanessa )"
 */

export interface ParsedName {
  firstName: string;
  lastName: string;
  middleName?: string;
  nickname?: string;
  fullName: string; // Original name from spreadsheet
}

export function parseEmployeeName(fullName: string): ParsedName {
  if (!fullName || typeof fullName !== 'string') {
    return {
      firstName: '',
      lastName: '',
      fullName: fullName || '',
    };
  }

  const trimmed = fullName.trim();
  
  // Extract nickname if present (in parentheses)
  let nameWithoutNickname = trimmed;
  let nickname: string | undefined;
  const nicknameMatch = trimmed.match(/\(([^)]+)\)/);
  if (nicknameMatch) {
    nickname = nicknameMatch[1].trim();
    nameWithoutNickname = trimmed.replace(/\([^)]+\)/g, '').trim();
  }

  // Split by comma to separate last name from first name
  const parts = nameWithoutNickname.split(',').map(p => p.trim());
  
  if (parts.length < 2) {
    // No comma found, try to parse as "First Last" format
    const spaceParts = nameWithoutNickname.split(/\s+/);
    if (spaceParts.length >= 2) {
      return {
        firstName: spaceParts[0],
        lastName: spaceParts.slice(1).join(' '),
        nickname,
        fullName: trimmed,
      };
    }
    // Single word or empty
    return {
      firstName: nameWithoutNickname,
      lastName: '',
      nickname,
      fullName: trimmed,
    };
  }

  const lastName = parts[0];
  const firstMiddle = parts[1];

  // Split first and middle names
  const firstMiddleParts = firstMiddle.split(/\s+/).filter(p => p.length > 0);
  
  if (firstMiddleParts.length === 0) {
    return {
      firstName: '',
      lastName,
      nickname,
      fullName: trimmed,
    };
  }

  const firstName = firstMiddleParts[0];
  const middleName = firstMiddleParts.length > 1 
    ? firstMiddleParts.slice(1).join(' ') 
    : undefined;

  return {
    firstName,
    lastName,
    middleName,
    nickname,
    fullName: trimmed,
  };
}

