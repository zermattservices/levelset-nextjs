import * as React from 'react';
import DOMPurify from 'dompurify';
import type { FieldProps } from '@rjsf/utils';
import { useTranslation } from 'react-i18next';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/**
 * TextBlockField — renders rich text content as read-only HTML in forms.
 * Registered as a custom RJSF field (not widget) via ui:field = 'textBlock'.
 */
export function TextBlockField(props: FieldProps) {
  const { uiSchema } = props;
  const { i18n } = useTranslation();
  const options = uiSchema?.['ui:options'] || {};
  const isSpanish = i18n.language === 'es';
  const content = isSpanish ? (options.contentEs || options.content || '') : (options.content || '');

  if (!content) return null;

  return (
    <div
      className="text-block-content"
      style={{
        fontFamily,
        fontSize: 14,
        lineHeight: 1.6,
        color: 'var(--ls-color-text-primary)',
        padding: '8px 0',
      }}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
    />
  );
}
