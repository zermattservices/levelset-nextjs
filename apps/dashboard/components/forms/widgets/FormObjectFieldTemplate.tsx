import * as React from 'react';
import type { ObjectFieldTemplateProps } from '@rjsf/utils';
import { useTranslation } from 'react-i18next';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/**
 * Custom ObjectFieldTemplate for RJSF that renders section headers,
 * text blocks, and groups section children — matching the editor layout.
 */
export function FormObjectFieldTemplate(props: ObjectFieldTemplateProps) {
  const { properties, uiSchema } = props;
  const { i18n } = useTranslation();
  const isSpanish = i18n.language === 'es';

  // Build section → children mapping from uiSchema metadata
  const childToSection = new Map<string, string>();

  for (const prop of properties) {
    const fieldUi = uiSchema?.[prop.name] || {};
    const meta = fieldUi['ui:fieldMeta'] || {};
    if (meta.fieldType === 'section' && meta.children) {
      for (const childId of meta.children as string[]) {
        childToSection.set(childId, prop.name);
      }
    }
  }

  const rendered = new Set<string>();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {properties.map((prop) => {
        if (rendered.has(prop.name)) return null;
        rendered.add(prop.name);

        const fieldUi = uiSchema?.[prop.name] || {};
        const meta = fieldUi['ui:fieldMeta'] || {};
        const options = fieldUi['ui:options'] || {};

        // ── Section: render header + grouped children ──
        if (meta.fieldType === 'section') {
          const childIds = (meta.children || []) as string[];
          const childProps = childIds
            .map((id) => {
              rendered.add(id);
              return properties.find((p) => p.name === id);
            })
            .filter(Boolean);

          const sectionName = isSpanish
            ? (options.sectionNameEs || options.sectionName || '')
            : (options.sectionName || '');

          return (
            <div
              key={prop.name}
              style={{
                borderRadius: 10,
                border: '1px solid var(--ls-color-muted-border)',
                background: 'var(--ls-color-bg-card)',
                overflow: 'hidden',
              }}
            >
              {/* Section header */}
              {sectionName && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '2px solid var(--ls-color-brand)',
                    background: 'var(--ls-color-neutral-foreground)',
                  }}
                >
                  <h3
                    style={{
                      fontFamily,
                      fontSize: 15,
                      fontWeight: 700,
                      color: 'var(--ls-color-text-primary)',
                      margin: 0,
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                    }}
                  >
                    {sectionName}
                  </h3>
                </div>
              )}
              {/* Section children */}
              {childProps.length > 0 && (
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {childProps.map((cp) => {
                    const childUi = uiSchema?.[cp!.name] || {};
                    const childMeta = childUi['ui:fieldMeta'] || {};
                    const childOptions = childUi['ui:options'] || {};

                    // Text block inside section — render HTML directly
                    if (childMeta.fieldType === 'text_block') {
                      const textContent = isSpanish
                        ? (childOptions.contentEs || childOptions.content || '')
                        : (childOptions.content || '');
                      if (!textContent) return null;
                      return (
                        <div
                          key={cp!.name}
                          style={{
                            fontFamily,
                            fontSize: 14,
                            lineHeight: 1.6,
                            color: 'var(--ls-color-text-primary)',
                          }}
                          dangerouslySetInnerHTML={{ __html: textContent }}
                        />
                      );
                    }

                    return <div key={cp!.name}>{cp!.content}</div>;
                  })}
                </div>
              )}
            </div>
          );
        }

        // ── Text block: render HTML content directly ──
        if (meta.fieldType === 'text_block') {
          const content = isSpanish
            ? (options.contentEs || options.content || '')
            : (options.content || '');

          if (!content) return null;

          return (
            <div
              key={prop.name}
              style={{
                fontFamily,
                fontSize: 14,
                lineHeight: 1.6,
                color: 'var(--ls-color-text-primary)',
                padding: '4px 0',
              }}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          );
        }

        // Skip fields that belong to a section (already rendered above)
        if (childToSection.has(prop.name)) return null;

        // Regular field
        return <div key={prop.name}>{prop.content}</div>;
      })}
    </div>
  );
}
