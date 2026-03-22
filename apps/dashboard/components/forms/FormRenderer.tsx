/**
 * FormRenderer — Wraps RJSF with Levelset theme, custom widgets, and validator.
 *
 * Usage:
 *   <FormRenderer template={template} onSubmit={handleSubmit} />
 *   <FormRenderer template={template} readOnly initialData={submission.response_data} />
 */

import * as React from 'react';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import type { IChangeEvent } from '@rjsf/core';
import type { RJSFSchema, UiSchema, ErrorListProps } from '@rjsf/utils';
import { Button, Typography, Box } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { getCustomWidgets, getCustomFields } from '@/components/forms/widgets';
import { FormObjectFieldTemplate } from '@/components/forms/widgets/FormObjectFieldTemplate';
import type { FormTemplate } from '@/lib/forms/types';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

interface FormRendererProps {
  /** Form template containing schema + ui_schema */
  template: FormTemplate;
  /** Submit handler — receives form data */
  onSubmit?: (formData: Record<string, any>) => void;
  /** Read-only mode — disables all inputs */
  readOnly?: boolean;
  /** Pre-fill form data */
  initialData?: Record<string, any>;
  /** Hide submit button (e.g. for preview mode) */
  hideSubmit?: boolean;
  /** Custom submit button label */
  submitLabel?: string;
}

/**
 * Patch boolean fields to have default: false so RJSF doesn't treat
 * `false` as a missing/invalid value for required boolean fields.
 */
function patchBooleanDefaults(schema: RJSFSchema): RJSFSchema {
  if (!schema.properties) return schema;

  const patched = { ...schema, properties: { ...schema.properties } };
  for (const [key, prop] of Object.entries(patched.properties)) {
    const p = prop as Record<string, any>;
    if (p.type === 'boolean' && p.default === undefined) {
      patched.properties[key] = { ...p, default: false };
    }
  }
  return patched;
}

/**
 * Custom error list shown at the top of the form on validation failure.
 * Renders a summary banner and scrolls to the first error field.
 */
function ErrorListTemplate({ errors }: ErrorListProps) {
  const scrolledRef = React.useRef(false);

  React.useEffect(() => {
    if (errors.length > 0 && !scrolledRef.current) {
      scrolledRef.current = true;

      // Find the first field with an error and scroll to it
      requestAnimationFrame(() => {
        const errorEl = document.querySelector('.Mui-error, [class*="fieldError"]');
        if (errorEl) {
          errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }
  }, [errors]);

  if (errors.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 2,
        mb: 3,
        borderRadius: '8px',
        backgroundColor: 'var(--ls-color-destructive-soft)',
        border: '1px solid var(--ls-color-destructive-border)',
      }}
    >
      <ErrorOutlineIcon sx={{ fontSize: 18, color: 'var(--ls-color-destructive-base)' }} />
      <Typography sx={{ fontFamily, fontSize: 13, fontWeight: 600, color: 'var(--ls-color-destructive-base)' }}>
        {errors.length === 1
          ? 'Please complete 1 required field before submitting.'
          : `Please complete ${errors.length} required fields before submitting.`}
      </Typography>
    </Box>
  );
}

export function FormRenderer({
  template,
  onSubmit,
  readOnly = false,
  initialData,
  hideSubmit = false,
  submitLabel = 'Submit',
}: FormRendererProps) {
  const [formData, setFormData] = React.useState<Record<string, any>>(initialData || {});
  const { selectedLocationId } = useLocationContext();

  const widgets = React.useMemo(() => getCustomWidgets(), []);
  const fields = React.useMemo(() => getCustomFields(), []);

  const schema: RJSFSchema = React.useMemo(() => {
    if (!template.schema || Object.keys(template.schema).length === 0) {
      return {
        type: 'object' as const,
        properties: {},
      };
    }
    return patchBooleanDefaults(template.schema as RJSFSchema);
  }, [template.schema]);

  const uiSchema: UiSchema = React.useMemo(() => {
    const base = { ...(template.ui_schema || {}) } as UiSchema;

    // Patch boolean fields to use yesNoSwitch widget if not already set
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        const p = prop as Record<string, any>;
        if (p.type === 'boolean') {
          if (!base[key]) base[key] = {};
          if (!base[key]['ui:widget']) {
            base[key] = { ...base[key], 'ui:widget': 'yesNoSwitch' };
          }
        }
      }
    }

    if (readOnly) {
      return {
        ...base,
        'ui:disabled': true,
      };
    }

    return base;
  }, [template.ui_schema, readOnly, schema.properties]);

  const handleChange = (e: IChangeEvent) => {
    setFormData(e.formData);
  };

  const handleSubmit = (e: IChangeEvent) => {
    if (onSubmit) {
      onSubmit(e.formData);
    }
  };

  const handleError = () => {
    // On validation error, scroll to the first error field
    requestAnimationFrame(() => {
      const errorEl = document.querySelector('.Mui-error, [class*="fieldError"]');
      if (errorEl) {
        errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  };

  const hasFields = schema.properties && Object.keys(schema.properties).length > 0;

  if (!hasFields) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 24px',
          textAlign: 'center',
          gap: 8,
          border: '2px dashed var(--ls-color-muted-border)',
          borderRadius: 12,
          background: 'var(--ls-color-neutral-foreground)',
        }}
      >
        <span
          style={{
            fontFamily,
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--ls-color-text-primary)',
          }}
        >
          No Fields
        </span>
        <span
          style={{
            fontFamily,
            fontSize: 14,
            color: 'var(--ls-color-muted)',
          }}
        >
          This form has no fields yet. Use the Editor tab to add fields.
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Global styles for RJSF error highlighting */}
      <style>{`
        .rjsf .form-group.field-error .MuiOutlinedInput-notchedOutline,
        .rjsf .form-group.field-error .MuiInputBase-root .MuiOutlinedInput-notchedOutline {
          border-color: var(--ls-color-destructive-base) !important;
          border-width: 2px !important;
        }
        .rjsf .form-group.field-error .MuiFormLabel-root {
          color: var(--ls-color-destructive-base) !important;
        }
        .rjsf .form-group .field-error-message,
        .rjsf .field-error .MuiFormHelperText-root {
          color: var(--ls-color-destructive-base) !important;
          font-family: ${fontFamily};
          font-size: 12px;
        }
        .rjsf .Mui-error .MuiOutlinedInput-notchedOutline {
          border-color: var(--ls-color-destructive-base) !important;
          border-width: 2px !important;
        }
      `}</style>
      <Form
        schema={schema}
        uiSchema={uiSchema}
        formData={formData}
        validator={validator}
        widgets={widgets}
        fields={fields}
        templates={{
          ObjectFieldTemplate: FormObjectFieldTemplate,
          ErrorListTemplate,
        }}
        formContext={{ orgId: template.org_id, locationId: selectedLocationId, formType: template.form_type }}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onError={handleError}
        disabled={readOnly}
        readonly={readOnly}
        noHtml5Validate
        showErrorList="top"
      >
        {hideSubmit || readOnly ? (
          <></>
        ) : (
          <Button
            type="submit"
            variant="contained"
            sx={{
              fontFamily,
              fontWeight: 600,
              fontSize: 14,
              textTransform: 'none',
              backgroundColor: 'var(--ls-color-brand)',
              borderRadius: '8px',
              padding: '10px 24px',
              marginTop: '16px',
              '&:hover': {
                backgroundColor: 'var(--ls-color-brand-hover)',
              },
            }}
          >
            {submitLabel}
          </Button>
        )}
      </Form>
    </>
  );
}
