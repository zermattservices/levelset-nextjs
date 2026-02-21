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
import { EmployeeSelectWidget } from './EmployeeSelectWidget';
import { LeaderSelectWidget } from './LeaderSelectWidget';
import { PositionSelectWidget } from './PositionSelectWidget';
import { FileUploadWidget } from './FileUploadWidget';
import { InfractionSelectWidget } from './InfractionSelectWidget';
import { DiscActionSelectWidget } from './DiscActionSelectWidget';

export const customWidgets: RegistryWidgetsType = {
  signature: SignatureWidget,
  ratingScale: RatingScaleWidget,
  employee_select: EmployeeSelectWidget,
  leader_select: LeaderSelectWidget,
  position_select: PositionSelectWidget,
  file: FileUploadWidget,
  infraction_select: InfractionSelectWidget,
  disc_action_select: DiscActionSelectWidget,
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
