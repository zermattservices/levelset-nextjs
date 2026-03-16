import * as React from 'react';
import type { FieldProps } from '@rjsf/utils';
import { useTranslation } from 'react-i18next';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/**
 * SectionField — renders section headers in forms (preview and submission).
 * Registered as a custom RJSF field via ui:field = 'section'.
 */
export function SectionField(props: FieldProps) {
  const { uiSchema } = props;
  const { i18n } = useTranslation();
  const options = uiSchema?.['ui:options'] || {};
  const isSpanish = i18n.language === 'es';
  const sectionName = isSpanish
    ? (options.sectionNameEs || options.sectionName || '')
    : (options.sectionName || '');

  if (!sectionName) return null;

  return (
    <div
      style={{
        borderBottom: '2px solid var(--ls-color-brand)',
        paddingBottom: 6,
        marginTop: 16,
        marginBottom: 4,
      }}
    >
      <h3
        style={{
          fontFamily: '"Mont", sans-serif',
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--ls-color-text-primary)',
          margin: 0,
        }}
      >
        {sectionName}
      </h3>
    </div>
  );
}
