-- Consolidate 'leaders' data source to 'employees' in form templates.
-- The 'leaders' source is being merged into 'employees' with role filtering.
-- This updates all ui_schema JSON to replace dataSource: 'leaders' with 'employees'.

UPDATE form_templates
SET ui_schema = (
  SELECT jsonb_object_agg(
    key,
    CASE
      WHEN value #>> '{ui:fieldMeta,dataSource}' = 'leaders'
      THEN jsonb_set(value, '{ui:fieldMeta,dataSource}', '"employees"')
      ELSE value
    END
  )
  FROM jsonb_each(ui_schema)
)
WHERE ui_schema::text LIKE '%"dataSource":"leaders"%'
  OR ui_schema::text LIKE '%"dataSource": "leaders"%';
