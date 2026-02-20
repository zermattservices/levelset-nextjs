/**
 * FormPreviewPanel — Preview tab content for the form detail page.
 *
 * Renders the form using FormRenderer in interactive preview mode.
 * Users can fill out the form to test it, but submissions are discarded.
 */

import * as React from 'react';
import { Button, Chip, Snackbar, Alert } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import sty from './FormPreviewPanel.module.css';
import { FormRenderer } from './FormRenderer';
import type { FormTemplate } from '@/lib/forms/types';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

interface FormPreviewPanelProps {
  template: FormTemplate;
}

export function FormPreviewPanel({ template }: FormPreviewPanelProps) {
  const [resetKey, setResetKey] = React.useState(0);
  const [submitted, setSubmitted] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState(false);

  const handleReset = () => {
    setResetKey((prev) => prev + 1);
    setSubmitted(false);
  };

  const handlePreviewSubmit = (_formData: Record<string, any>) => {
    setSubmitted(true);
    setSnackbar(true);
  };

  return (
    <div className={sty.previewWrapper}>
      {/* Preview toolbar */}
      <div className={sty.previewToolbar}>
        <div className={sty.toolbarLeft}>
          <Chip
            label="Preview Mode"
            size="small"
            sx={{
              fontFamily,
              fontSize: 11,
              fontWeight: 600,
              height: 24,
              borderRadius: '12px',
              backgroundColor: 'var(--ls-color-brand-soft)',
              color: 'var(--ls-color-brand)',
            }}
          />
          <span className={sty.previewHint}>
            Test the form below. Submissions are not saved.
          </span>
        </div>
        <Button
          size="small"
          startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
          onClick={handleReset}
          sx={{
            fontFamily,
            fontSize: 12,
            fontWeight: 500,
            textTransform: 'none',
            color: 'var(--ls-color-muted)',
            borderColor: 'var(--ls-color-muted-border)',
            borderRadius: '6px',
            padding: '4px 12px',
            '&:hover': {
              backgroundColor: 'var(--ls-color-neutral-foreground)',
            },
          }}
          variant="outlined"
        >
          Reset
        </Button>
      </div>

      {/* Form preview area */}
      <div className={sty.formContainer}>
        {submitted ? (
          <div className={sty.submittedState}>
            <CheckCircleOutlineIcon sx={{ fontSize: 48, color: 'var(--ls-color-success)' }} />
            <span className={sty.submittedTitle}>Form Submitted Successfully</span>
            <span className={sty.submittedDescription}>
              This is a preview — no data was saved.
            </span>
            <Button
              size="small"
              variant="outlined"
              onClick={handleReset}
              sx={{
                fontFamily,
                fontSize: 13,
                fontWeight: 500,
                textTransform: 'none',
                color: 'var(--ls-color-brand)',
                borderColor: 'var(--ls-color-brand)',
                borderRadius: '8px',
                marginTop: '8px',
                '&:hover': {
                  backgroundColor: 'var(--ls-color-brand-soft)',
                  borderColor: 'var(--ls-color-brand)',
                },
              }}
            >
              Fill Out Again
            </Button>
          </div>
        ) : (
          <div className={sty.formContent} key={resetKey}>
            <h2 className={sty.formTitle}>{template.name}</h2>
            {template.description && (
              <p className={sty.formDescription}>{template.description}</p>
            )}
            <FormRenderer
              template={template}
              onSubmit={handlePreviewSubmit}
              submitLabel="Submit (Preview)"
            />
          </div>
        )}
      </div>

      <Snackbar
        open={snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(false)}
          severity="success"
          sx={{ fontFamily, fontSize: 13, borderRadius: '8px' }}
        >
          Preview submission successful — no data saved
        </Alert>
      </Snackbar>
    </div>
  );
}
