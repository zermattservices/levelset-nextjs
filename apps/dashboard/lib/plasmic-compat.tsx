/**
 * Plasmic Compatibility Layer
 * 
 * This module provides replacements for Plasmic's internal utilities,
 * allowing us to keep using the generated CSS modules without the Plasmic packages.
 */

import React from 'react';

// classNames utility - same as Plasmic's implementation
export function classNames(...classes: (string | undefined | false | null | Record<string, boolean>)[]): string {
  const result: string[] = [];
  
  for (const cls of classes) {
    if (!cls) continue;
    
    if (typeof cls === 'string') {
      result.push(cls);
    } else if (typeof cls === 'object') {
      for (const [key, value] of Object.entries(cls)) {
        if (value) {
          result.push(key);
        }
      }
    }
  }
  
  return result.join(' ');
}

// hasVariant utility - checks if a state object has a specific variant active
export function hasVariant(
  state: Record<string, any>,
  groupName: string,
  variantName: string
): boolean {
  const value = state[groupName];
  
  if (value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === variantName;
  if (Array.isArray(value)) return value.includes(variantName);
  
  return false;
}

// renderPlasmicSlot utility - renders slot content with fallback
export function renderPlasmicSlot({
  defaultContents,
  value,
  className,
}: {
  defaultContents?: React.ReactNode;
  value?: React.ReactNode;
  className?: string;
}): React.ReactNode {
  const content = value ?? defaultContents;
  
  if (className && content) {
    return <span className={className}>{content}</span>;
  }
  
  return content;
}
