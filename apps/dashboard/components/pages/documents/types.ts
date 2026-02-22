import * as React from 'react';

/* ------------------------------------------------------------------ */
/*  Org Document Categories                                            */
/* ------------------------------------------------------------------ */

export const ORG_DOCUMENT_CATEGORIES = [
  'employee_handbook',
  'leadership_resource',
  'development_resource',
  'organization_info',
  'benefits',
  'other',
] as const;

export type OrgDocumentCategory = (typeof ORG_DOCUMENT_CATEGORIES)[number];

export const ORG_CATEGORY_LABELS: Record<OrgDocumentCategory, string> = {
  employee_handbook: 'Employee Handbook',
  leadership_resource: 'Leadership Resource',
  development_resource: 'Development Resource',
  organization_info: 'Organization Info',
  benefits: 'Benefits',
  other: 'Other',
};

export const ORG_CATEGORY_COLORS: Record<OrgDocumentCategory, string> = {
  employee_handbook: 'var(--ls-color-brand)',
  leadership_resource: 'var(--ls-color-warning)',
  development_resource: 'var(--ls-color-success)',
  organization_info: 'var(--ls-color-muted)',
  benefits: '#7c3aed',
  other: 'var(--ls-color-neutral)',
};

/* ------------------------------------------------------------------ */
/*  Global Document Categories                                         */
/* ------------------------------------------------------------------ */

export const GLOBAL_DOCUMENT_CATEGORIES = [
  'cfa_general',
  'cfa_design_system',
  'levelset_general',
  'levelset_design_system',
  'locale_information',
  'other',
] as const;

export type GlobalDocumentCategory = (typeof GLOBAL_DOCUMENT_CATEGORIES)[number];

export const GLOBAL_CATEGORY_LABELS: Record<GlobalDocumentCategory, string> = {
  cfa_general: 'Chick-fil-A General',
  cfa_design_system: 'CFA Design System',
  levelset_general: 'Levelset General',
  levelset_design_system: 'Levelset Design System',
  locale_information: 'Locale Information',
  other: 'Other',
};

export const GLOBAL_CATEGORY_COLORS: Record<GlobalDocumentCategory, string> = {
  cfa_general: 'var(--ls-color-brand)',
  cfa_design_system: '#e53935',
  levelset_general: 'var(--ls-color-success)',
  levelset_design_system: 'var(--ls-color-warning)',
  locale_information: '#7c3aed',
  other: 'var(--ls-color-neutral)',
};

/* ------------------------------------------------------------------ */
/*  Shared Interfaces                                                  */
/* ------------------------------------------------------------------ */

export interface DocumentFolder {
  id: string;
  org_id?: string;
  name: string;
  parent_folder_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  org_id?: string;
  folder_id: string | null;
  name: string;
  description: string | null;
  category: string;
  source_type: 'file' | 'url' | 'text';
  file_type: string | null;
  file_size: number | null;
  storage_path: string | null;
  original_url: string | null;
  original_filename: string | null;
  uploaded_by: string | null;
  uploaded_by_name?: string;
  current_version: number;
  created_at: string;
  updated_at: string;
  extraction_status?: string;
  raw_content?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

export interface DocumentsConfig {
  mode: 'org' | 'global';
  apiBasePath: string;
  pageTitle: string;
  headTitle: string;
  rootBreadcrumbName: string;
  categories: readonly string[];
  categoryLabels: Record<string, string>;
  categoryColors: Record<string, string>;
  headerExtra?: React.ReactNode;
  backLink?: { label: string; href: string };
}
