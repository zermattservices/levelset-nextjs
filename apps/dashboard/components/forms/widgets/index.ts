/**
 * Custom RJSF Widget & Field Registry
 *
 * Maps widget names to custom widget components.
 * Standard widgets (text, select, checkbox, radio, etc.) use @rjsf/mui defaults.
 * Custom widgets listed here extend RJSF with Levelset-specific UI.
 */

import type { RegistryWidgetsType, RegistryFieldsType } from '@rjsf/utils';
import { RatingScaleWidget } from './RatingScaleWidget';
import { SignatureWidget } from './SignatureWidget';
import { DataSelectWidget } from './DataSelectWidget';
import { FileUploadWidget } from './FileUploadWidget';
import { TextBlockField } from './TextBlockField';

export const customWidgets: RegistryWidgetsType = {
  signature: SignatureWidget,
  ratingScale: RatingScaleWidget,
  data_select: DataSelectWidget,
  file: FileUploadWidget,
};

export const customFields: RegistryFieldsType = {
  textBlock: TextBlockField as any,
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

/**
 * Get the custom field registry
 */
export function getCustomFields(): RegistryFieldsType {
  return { ...customFields };
}
