/**
 * Custom RJSF Widget Registry
 *
 * Maps widget names to custom widget components.
 * Standard widgets (text, select, checkbox, radio, etc.) use @rjsf/mui defaults.
 * Custom widgets listed here extend RJSF with Levelset-specific UI.
 */

import type { RegistryWidgetsType } from '@rjsf/utils';
import { RatingScaleWidget } from './RatingScaleWidget';
import { SignatureWidget } from './SignatureWidget';

/**
 * Custom widget registry for RJSF forms.
 * Widgets for employee_select, leader_select, position_select, and file
 * are placeholder pass-throughs for now — they'll render as standard text
 * inputs until Sprint 5 wires up the full Levelset data connectors.
 */
export const customWidgets: RegistryWidgetsType = {
  // Custom widgets
  signature: SignatureWidget,
  ratingScale: RatingScaleWidget,

  // Placeholder widgets — render as default text inputs for now
  // These will be replaced with full autocomplete implementations in Sprint 5
  employee_select: undefined as any,
  leader_select: undefined as any,
  position_select: undefined as any,
  file: undefined as any,
};

/**
 * Get the widget registry, filtering out undefined placeholders
 */
export function getCustomWidgets(): RegistryWidgetsType {
  const widgets: RegistryWidgetsType = {};
  for (const [key, widget] of Object.entries(customWidgets)) {
    if (widget) {
      widgets[key] = widget;
    }
  }
  return widgets;
}
