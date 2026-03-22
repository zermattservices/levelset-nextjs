/**
 * DragContext — shared state for setup page drag-and-drop
 * Tracks active drag item, finger position, and drop zone registration.
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { LayoutRectangle } from 'react-native';
import { useSharedValue, SharedValue } from 'react-native-reanimated';
import type { SetupAssignment } from '../../lib/api';

export interface DragItem {
  employeeId: string;
  employeeName: string;
  shiftId: string;
  shiftStartTime: string;
  shiftEndTime: string;
  /** If dragged from a slot, this is the assignment being moved */
  fromAssignment?: SetupAssignment;
}

export interface DropZoneRef {
  positionId: string;
  slotIndex: number;
  layout: LayoutRectangle;
}

/** Each slot stores its View ref so we can remeasure on demand */
export interface DropZoneViewRef {
  positionId: string;
  slotIndex: number;
  viewRef: React.RefObject<View | null>;
}

import { View } from 'react-native';

interface DragContextValue {
  // Drag state
  activeDrag: DragItem | null;
  setActiveDrag: (item: DragItem | null) => void;

  // Finger position (shared values for 60fps overlay tracking)
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;

  // Drop zone registration
  dropZones: React.MutableRefObject<Map<string, DropZoneRef>>;
  registerDropZone: (key: string, ref: DropZoneRef) => void;
  unregisterDropZone: (key: string) => void;

  // View ref registration (for remeasuring)
  registerDropZoneView: (key: string, ref: DropZoneViewRef) => void;
  unregisterDropZoneView: (key: string) => void;
  remeasureAllDropZones: () => void;

  // Hover state
  hoveredZoneKey: string | null;
  setHoveredZoneKey: (key: string | null) => void;

  // Hit test: find which drop zone the finger is over
  hitTest: (x: number, y: number) => DropZoneRef | null;
}

const DragCtx = createContext<DragContextValue | null>(null);

export function DragProvider({ children }: { children: React.ReactNode }) {
  const [activeDrag, setActiveDrag] = useState<DragItem | null>(null);
  const [hoveredZoneKey, setHoveredZoneKey] = useState<string | null>(null);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dropZones = useRef<Map<string, DropZoneRef>>(new Map());
  const dropZoneViews = useRef<Map<string, DropZoneViewRef>>(new Map());

  const registerDropZone = useCallback((key: string, ref: DropZoneRef) => {
    dropZones.current.set(key, ref);
  }, []);

  const unregisterDropZone = useCallback((key: string) => {
    dropZones.current.delete(key);
  }, []);

  const registerDropZoneView = useCallback((key: string, ref: DropZoneViewRef) => {
    dropZoneViews.current.set(key, ref);
  }, []);

  const unregisterDropZoneView = useCallback((key: string) => {
    dropZoneViews.current.delete(key);
  }, []);

  const remeasureAllDropZones = useCallback(() => {
    for (const [key, zoneView] of dropZoneViews.current) {
      zoneView.viewRef.current?.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          dropZones.current.set(key, {
            positionId: zoneView.positionId,
            slotIndex: zoneView.slotIndex,
            layout: { x, y, width, height },
          });
        }
      });
    }
  }, []);

  const hitTest = useCallback((x: number, y: number): DropZoneRef | null => {
    for (const [, zone] of dropZones.current) {
      const { x: zx, y: zy, width, height } = zone.layout;
      if (x >= zx && x <= zx + width && y >= zy && y <= zy + height) {
        return zone;
      }
    }
    return null;
  }, []);

  return (
    <DragCtx.Provider value={{
      activeDrag, setActiveDrag,
      dragX, dragY,
      dropZones, registerDropZone, unregisterDropZone,
      registerDropZoneView, unregisterDropZoneView, remeasureAllDropZones,
      hoveredZoneKey, setHoveredZoneKey,
      hitTest,
    }}>
      {children}
    </DragCtx.Provider>
  );
}

export function useDrag() {
  const ctx = useContext(DragCtx);
  if (!ctx) throw new Error('useDrag must be inside DragProvider');
  return ctx;
}
