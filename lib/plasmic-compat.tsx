/**
 * Plasmic Compatibility Layer
 * 
 * This module provides replacements for Plasmic utilities that are used
 * throughout the codebase. These implementations allow components to
 * continue working after Plasmic is removed.
 */

import * as React from 'react';

/**
 * Replacement for usePlasmicCanvasContext
 * Always returns undefined since we're no longer in the Plasmic editor
 */
export function usePlasmicCanvasContext(): undefined {
  return undefined;
}

/**
 * DataProvider replacement
 * This provides data to children through React context
 */
interface DataProviderProps {
  name: string;
  data: unknown;
  children?: React.ReactNode;
}

const DataContext = React.createContext<Record<string, unknown>>({});

export function DataProvider({ name, data, children }: DataProviderProps) {
  const parentData = React.useContext(DataContext);
  
  const value = React.useMemo(() => ({
    ...parentData,
    [name]: data,
  }), [parentData, name, data]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataProvider(): Record<string, unknown> {
  return React.useContext(DataContext);
}
