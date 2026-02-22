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
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import { ThemeProvider } from '@mui/material/styles';
import { Button } from '@mui/material';
import { rjsfMuiTheme } from '@/lib/forms/rjsf-theme';
import { getCustomWidgets } from '@/components/forms/widgets';
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

  const schema: RJSFSchema = React.useMemo(() => {
    if (!template.schema || Object.keys(template.schema).length === 0) {
      return {
        type: 'object' as const,
        properties: {},
      };
    }
    return template.schema as RJSFSchema;
  }, [template.schema]);

  const uiSchema: UiSchema = React.useMemo(() => {
    const base = (template.ui_schema || {}) as UiSchema;

    if (readOnly) {
      return {
        ...base,
        'ui:disabled': true,
      };
    }

    return base;
  }, [template.ui_schema, readOnly]);

  const handleChange = (e: IChangeEvent) => {
    setFormData(e.formData);
  };

  const handleSubmit = (e: IChangeEvent) => {
    if (onSubmit) {
      onSubmit(e.formData);
    }
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
    <ThemeProvider theme={rjsfMuiTheme}>
      <Form
        schema={schema}
        uiSchema={uiSchema}
        formData={formData}
        validator={validator}
        widgets={widgets}
        formContext={{ orgId: template.org_id, locationId: selectedLocationId, formType: template.form_type }}
        onChange={handleChange}
        onSubmit={handleSubmit}
        disabled={readOnly}
        readonly={readOnly}
        noHtml5Validate
      >
        {hideSubmit || readOnly ? (
          // Empty fragment hides the default submit button
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
    </ThemeProvider>
  );
}
