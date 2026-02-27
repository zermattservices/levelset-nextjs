import * as React from 'react';
import {
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Drawer,
  MenuItem,
  InputLabel,
  FormControl,
  IconButton,
  Typography,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';

import {
  StyledTextField,
  StyledSelect,
  inputLabelSx,
  menuItemSx,
} from '@/components/forms/dialogStyles';

import styles from './DocumentUploadStep.module.css';

/* ------------------------------------------------------------------ */
/*  Types & Constants                                                  */
/* ------------------------------------------------------------------ */

interface Document {
  id: string;
  name: string;
  description: string | null;
  category: string;
  source_type: 'file' | 'url' | 'text';
  file_type: string | null;
  file_size: number | null;
  storage_path: string | null;
  original_url: string | null;
  original_filename: string | null;
  uploaded_by_name?: string;
  current_version: number;
  created_at: string;
  updated_at: string;
  extraction_status?: string;
}

interface DocumentUploadStepProps {
  accessToken: string;
  orgId: string;
  initialData: { documentIds: string[] } | null;
  onComplete: (data: { documentIds: string[]; analysisId: string | null }) => void;
  onSkip: () => void;
  onBack?: () => void;
}

const CATEGORIES = [
  'employee_handbook',
  'leadership_resource',
  'development_resource',
  'organization_info',
  'benefits',
  'other',
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  employee_handbook: 'Employee Handbook',
  leadership_resource: 'Leadership Resource',
  development_resource: 'Development Resource',
  organization_info: 'Organization Info',
  benefits: 'Benefits',
  other: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  employee_handbook: 'var(--ls-color-brand)',
  leadership_resource: 'var(--ls-color-warning)',
  development_resource: 'var(--ls-color-success)',
  organization_info: 'var(--ls-color-muted)',
  benefits: '#7c3aed',
  other: 'var(--ls-color-neutral)',
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const API_BASE = '/api/onboarding/documents';
const fontFamily = '"Satoshi", sans-serif';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '\u2014';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function getFileTypeIcon(fileType: string | null, sourceType: string): React.ReactNode {
  if (sourceType === 'text') return <ArticleOutlinedIcon sx={{ fontSize: 20, color: 'var(--ls-color-success)' }} />;
  if (sourceType === 'url') return <LinkOutlinedIcon sx={{ fontSize: 20, color: 'var(--ls-color-muted)' }} />;
  if (!fileType) return <InsertDriveFileOutlinedIcon sx={{ fontSize: 20, color: 'var(--ls-color-muted)' }} />;
  if (fileType.includes('pdf')) return <PictureAsPdfOutlinedIcon sx={{ fontSize: 20, color: '#e53935' }} />;
  if (fileType.startsWith('image/')) return <ImageOutlinedIcon sx={{ fontSize: 20, color: 'var(--ls-color-brand)' }} />;
  return <InsertDriveFileOutlinedIcon sx={{ fontSize: 20, color: 'var(--ls-color-muted)' }} />;
}

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DocumentUploadStep({
  accessToken,
  orgId,
  initialData,
  onComplete,
  onSkip,
  onBack,
}: DocumentUploadStepProps) {
  // Data
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Upload dialog
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [uploadMode, setUploadMode] = React.useState<'file' | 'url'>('file');
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [uploadUrl, setUploadUrl] = React.useState('');
  const [uploadName, setUploadName] = React.useState('');
  const [uploadDescription, setUploadDescription] = React.useState('');
  const [uploadCategory, setUploadCategory] = React.useState<string>('employee_handbook');
  const [uploading, setUploading] = React.useState(false);
  const [dragActive, setDragActive] = React.useState(false);

  // Detail drawer
  const [selectedDocument, setSelectedDocument] = React.useState<Document | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = React.useState(false);
  const [editingField, setEditingField] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');
  const [editCategory, setEditCategory] = React.useState<string>('other');
  const [savingEdit, setSavingEdit] = React.useState(false);

  // Delete confirm
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // Replace file
  const replaceInputRef = React.useRef<HTMLInputElement>(null);

  // Analysis
  const [analyzing, setAnalyzing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Snackbar
  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  /* ---------------------------------------------------------------- */
  /*  Auth headers                                                     */
  /* ---------------------------------------------------------------- */

  const headers = React.useMemo(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      'x-org-id': orgId,
    }),
    [accessToken, orgId],
  );

  /* ---------------------------------------------------------------- */
  /*  Data fetching                                                    */
  /* ---------------------------------------------------------------- */

  const fetchDocuments = React.useCallback(async () => {
    try {
      const res = await fetch(API_BASE, { headers });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [headers]);

  React.useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  /* ---------------------------------------------------------------- */
  /*  Upload                                                           */
  /* ---------------------------------------------------------------- */

  const resetUploadForm = () => {
    setUploadMode('file');
    setUploadFile(null);
    setUploadUrl('');
    setUploadName('');
    setUploadDescription('');
    setUploadCategory('employee_handbook');
    setDragActive(false);
  };

  const handleFileSelect = (file: File) => {
    setUploadFile(file);
    if (!uploadName) {
      setUploadName(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleUploadSubmit = async () => {
    if (uploadMode === 'file' && !uploadFile) return;
    if (uploadMode === 'url' && !uploadUrl.trim()) return;
    if (!uploadName.trim()) return;

    setUploading(true);
    try {
      let createData: any = null;

      if (uploadMode === 'file' && uploadFile) {
        if (uploadFile.size > MAX_FILE_SIZE) {
          throw new Error('File exceeds 100MB limit');
        }

        // Step 1: Get signed upload URL
        const urlRes = await fetch(`${API_BASE}/upload-url`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: uploadFile.name,
            content_type: uploadFile.type,
            file_size: uploadFile.size,
          }),
        });

        if (!urlRes.ok) {
          const err = await urlRes.json();
          throw new Error(err.error || 'Failed to get upload URL');
        }

        const { signed_url, storage_path } = await urlRes.json();

        // Step 2: Upload file directly to Supabase Storage
        const storageRes = await fetch(signed_url, {
          method: 'PUT',
          body: uploadFile,
          headers: { 'Content-Type': uploadFile.type },
        });

        if (!storageRes.ok) {
          throw new Error('Failed to upload file to storage');
        }

        // Step 3: Create document record
        const createRes = await fetch(API_BASE, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            intent: 'create',
            name: uploadName.trim(),
            description: uploadDescription.trim() || null,
            category: uploadCategory,
            folder_id: null,
            source_type: 'file',
            storage_path,
            file_type: uploadFile.type,
            file_size: uploadFile.size,
            original_filename: uploadFile.name,
          }),
        });

        if (!createRes.ok) {
          const err = await createRes.json();
          throw new Error(err.error || 'Failed to create document');
        }
        createData = await createRes.json();
      } else {
        // URL document
        const createRes = await fetch(API_BASE, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            intent: 'create',
            name: uploadName.trim(),
            description: uploadDescription.trim() || null,
            category: uploadCategory,
            folder_id: null,
            source_type: 'url',
            original_url: uploadUrl.trim(),
          }),
        });

        if (!createRes.ok) {
          const err = await createRes.json();
          throw new Error(err.error || 'Failed to create document');
        }
        createData = await createRes.json();
      }

      setSnackbar({ open: true, message: 'Document added', severity: 'success' });
      resetUploadForm();
      setUploadDialogOpen(false);
      fetchDocuments();

      // Trigger document processing in the background
      const docId = createData?.id;
      if (docId) {
        fetch(`${API_BASE}/process`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_id: docId }),
        }).catch(() => {});
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Upload failed', severity: 'error' });
    } finally {
      setUploading(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Document detail drawer                                           */
  /* ---------------------------------------------------------------- */

  const openDetailDrawer = (doc: Document) => {
    setSelectedDocument(doc);
    setEditName(doc.name);
    setEditDescription(doc.description || '');
    setEditCategory(doc.category);
    setEditingField(null);
    setDetailDrawerOpen(true);
  };

  const closeDetailDrawer = () => {
    setDetailDrawerOpen(false);
    setSelectedDocument(null);
    setEditingField(null);
  };

  const handleSaveDocumentField = async (field: string) => {
    if (!selectedDocument) return;
    setSavingEdit(true);
    try {
      const body: Record<string, any> = {};
      if (field === 'name') body.name = editName.trim();
      if (field === 'description') body.description = editDescription.trim() || null;
      if (field === 'category') body.category = editCategory;

      const res = await fetch(`${API_BASE}/${selectedDocument.id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update');
      }

      const updated = await res.json();
      setSelectedDocument(updated);
      setEditingField(null);
      setSnackbar({ open: true, message: 'Document updated', severity: 'success' });
      fetchDocuments();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to update', severity: 'error' });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedDocument) return;
    try {
      const res = await fetch(`${API_BASE}/${selectedDocument.id}`, { headers });
      if (!res.ok) throw new Error('Download failed');

      const data = await res.json();
      if (data.signed_url) {
        window.open(data.signed_url, '_blank');
      } else if (data.original_url) {
        window.open(data.original_url, '_blank');
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Download failed', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!selectedDocument) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/${selectedDocument.id}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete');
      }

      setSnackbar({ open: true, message: 'Document deleted', severity: 'success' });
      setDeleteConfirmOpen(false);
      closeDetailDrawer();
      fetchDocuments();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to delete', severity: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedDocument) return;

    try {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File exceeds 100MB limit');
      }

      // Step 1: Get signed URL for replacement
      const urlRes = await fetch(`${API_BASE}/${selectedDocument.id}/replace-url`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type,
          file_size: file.size,
        }),
      });

      if (!urlRes.ok) {
        const err = await urlRes.json();
        throw new Error(err.error || 'Failed to get upload URL');
      }

      const { signed_url, storage_path, new_version } = await urlRes.json();

      // Step 2: Upload file directly to Supabase Storage
      const storageRes = await fetch(signed_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!storageRes.ok) {
        throw new Error('Failed to upload file to storage');
      }

      // Step 3: Finalize replacement
      const finalizeRes = await fetch(`${API_BASE}/${selectedDocument.id}/replace`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'finalize',
          storage_path,
          file_type: file.type,
          file_size: file.size,
          original_filename: file.name,
          new_version,
        }),
      });

      if (!finalizeRes.ok) {
        const err = await finalizeRes.json();
        throw new Error(err.error || 'Replace failed');
      }

      const updated = await finalizeRes.json();
      setSelectedDocument(updated);
      setSnackbar({ open: true, message: 'File replaced', severity: 'success' });
      fetchDocuments();

      // Trigger re-processing
      fetch(`${API_BASE}/process`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: selectedDocument.id }),
      }).catch(() => {});
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Replace failed', severity: 'error' });
    }

    if (replaceInputRef.current) replaceInputRef.current.value = '';
  };

  /* ---------------------------------------------------------------- */
  /*  Continue (with analysis)                                         */
  /* ---------------------------------------------------------------- */

  const handleContinue = async () => {
    setError(null);

    if (documents.length === 0) {
      onComplete({ documentIds: [], analysisId: null });
      return;
    }

    const documentIds = documents.map(d => d.id);
    setAnalyzing(true);

    try {
      const res = await fetch('/api/onboarding/analyze-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ orgId, documentIds }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to start analysis');
      }

      const { analysisId } = await res.json();

      // Poll for analysis completion
      const startTime = Date.now();
      const maxWait = 60000;
      const pollInterval = 3000;

      const poll = async (): Promise<void> => {
        if (Date.now() - startTime > maxWait) {
          onComplete({ documentIds, analysisId });
          return;
        }

        try {
          const statusRes = await fetch(
            `/api/onboarding/analysis-status?analysisId=${analysisId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );

          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.status === 'complete') {
              onComplete({ documentIds, analysisId });
              return;
            }
            if (statusData.status === 'error') {
              throw new Error('Analysis failed. Your documents were saved and can be re-analyzed later.');
            }
          }
        } catch (err: any) {
          if (err.message.includes('Analysis failed')) {
            throw err;
          }
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
        return poll();
      };

      await poll();
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
      setAnalyzing(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Shared MUI sx                                                    */
  /* ---------------------------------------------------------------- */

  const muiButtonSx = {
    fontFamily,
    fontSize: 13,
    fontWeight: 600,
    textTransform: 'none' as const,
    borderRadius: '8px',
    boxShadow: 'none',
  };

  /* ---------------------------------------------------------------- */
  /*  JSX                                                              */
  /* ---------------------------------------------------------------- */

  return (
    <div>
      {error && <div className={styles.errorBanner}>{error}</div>}

      {analyzing && (
        <div className={styles.analyzingOverlay}>
          <div className={styles.analyzingSpinner} />
          <div className={styles.analyzingText}>Levi is analyzing your documents...</div>
          <div className={styles.analyzingSubtext}>
            This may take a moment. Levi is reading through your documents to understand your organization.
          </div>
        </div>
      )}

      {!analyzing && (
        <>
          <div className={styles.card}>
            <h3 className={styles.sectionTitle}>Train Levi on Your Organization</h3>
            <p className={styles.sectionDescription}>
              Upload your team's key documents so Levi can understand how your organization operates.
              The more context you provide, the better Levi can assist you.
            </p>

            <div className={styles.infoBanner}>
              <span className={styles.infoBannerIcon}>&#9432;</span>
              <span>
                Levi uses uploaded documents to extract discipline policies, understand job
                expectations, and tailor recommendations to your organization. Supported
                formats: PDF, DOCX, TXT, images.
              </span>
            </div>

            {/* Action bar */}
            <div className={styles.actionBar}>
              <Button
                variant="contained"
                startIcon={<UploadFileOutlinedIcon sx={{ fontSize: 18 }} />}
                onClick={() => {
                  resetUploadForm();
                  setUploadDialogOpen(true);
                }}
                sx={{
                  ...muiButtonSx,
                  backgroundColor: 'var(--ls-color-brand)',
                  '&:hover': { backgroundColor: 'var(--ls-color-brand-hover)' },
                }}
              >
                Upload Document
              </Button>
            </div>

            {/* Documents list */}
            {loading ? (
              <div className={styles.loadingState}>
                <CircularProgress size={20} sx={{ color: 'var(--ls-color-brand)' }} />
                <span className={styles.loadingText}>Loading documents...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className={styles.emptyState}>
                <DescriptionOutlinedIcon sx={{ fontSize: 40, color: 'var(--ls-color-muted)', opacity: 0.5 }} />
                <div className={styles.emptyStateTitle}>No documents yet</div>
                <div className={styles.emptyStateDescription}>
                  Upload handbooks, discipline policies, job descriptions, or other key documents to get started.
                </div>
              </div>
            ) : (
              <div className={styles.documentsTable}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Name</th>
                      <th className={styles.th}>Category</th>
                      <th className={`${styles.th} ${styles.hideMobile}`}>Type</th>
                      <th className={`${styles.th} ${styles.hideMobile}`}>Size</th>
                      <th className={`${styles.th} ${styles.hideMobile}`}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => {
                      const catColor = CATEGORY_COLORS[doc.category] || 'var(--ls-color-neutral)';
                      return (
                        <tr
                          key={doc.id}
                          className={styles.tr}
                          onClick={() => openDetailDrawer(doc)}
                        >
                          <td className={styles.td}>
                            <div className={styles.nameCell}>
                              {getFileTypeIcon(doc.file_type, doc.source_type)}
                              <span className={styles.docName}>{doc.name}</span>
                            </div>
                          </td>
                          <td className={styles.td}>
                            <Chip
                              label={CATEGORY_LABELS[doc.category] || doc.category}
                              size="small"
                              sx={{
                                fontFamily,
                                fontSize: 11,
                                fontWeight: 600,
                                backgroundColor: catColor + '1a',
                                color: catColor,
                                border: 'none',
                                height: 24,
                              }}
                            />
                          </td>
                          <td className={`${styles.td} ${styles.tdMuted} ${styles.hideMobile}`}>
                            {doc.source_type}
                          </td>
                          <td className={`${styles.td} ${styles.tdMuted} ${styles.hideMobile}`}>
                            {formatFileSize(doc.file_size)}
                          </td>
                          <td className={`${styles.td} ${styles.tdMuted} ${styles.hideMobile}`}>
                            {formatDate(doc.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={styles.footerRow}>
            {onBack && (
              <button type="button" className={styles.stepBackBtn} onClick={onBack}>
                &#8592; Back
              </button>
            )}
            <button
              type="button"
              className={styles.skipLink}
              onClick={onSkip}
            >
              Skip for now
            </button>
            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleContinue}
            >
              Continue
            </button>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/*  Upload Dialog                                                */}
      {/* ============================================================ */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => !uploading && setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px', fontFamily } }}
      >
        <DialogTitle
          sx={{
            fontFamily,
            fontSize: 18,
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pb: 1,
          }}
        >
          Add Document
          <IconButton size="small" onClick={() => !uploading && setUploadDialogOpen(false)}>
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <Chip
              label="Upload File"
              icon={<UploadFileOutlinedIcon sx={{ fontSize: 16 }} />}
              variant={uploadMode === 'file' ? 'filled' : 'outlined'}
              onClick={() => setUploadMode('file')}
              sx={{
                fontFamily,
                fontSize: 12,
                fontWeight: 500,
                px: 1,
                ...(uploadMode === 'file'
                  ? {
                      backgroundColor: 'var(--ls-color-brand)',
                      color: '#fff',
                      '& .MuiChip-icon': { color: '#fff' },
                      '&:hover': { backgroundColor: 'var(--ls-color-brand-hover)' },
                    }
                  : { borderColor: 'var(--ls-color-muted-border)', color: 'var(--ls-color-muted)' }),
              }}
            />
            <Chip
              label="Link URL"
              icon={<LinkOutlinedIcon sx={{ fontSize: 16 }} />}
              variant={uploadMode === 'url' ? 'filled' : 'outlined'}
              onClick={() => setUploadMode('url')}
              sx={{
                fontFamily,
                fontSize: 12,
                fontWeight: 500,
                px: 1,
                ...(uploadMode === 'url'
                  ? {
                      backgroundColor: 'var(--ls-color-brand)',
                      color: '#fff',
                      '& .MuiChip-icon': { color: '#fff' },
                      '&:hover': { backgroundColor: 'var(--ls-color-brand-hover)' },
                    }
                  : { borderColor: 'var(--ls-color-muted-border)', color: 'var(--ls-color-muted)' }),
              }}
            />
          </div>

          {/* File drop zone */}
          {uploadMode === 'file' && (
            <div
              className={classNames(styles.uploadDropZone, dragActive && styles.uploadDropZoneActive)}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.onchange = (e: any) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                };
                input.click();
              }}
            >
              <UploadFileOutlinedIcon sx={{ fontSize: 36, color: 'var(--ls-color-muted)', mb: 1 }} />
              {uploadFile ? (
                <div style={{ textAlign: 'center' }}>
                  <Typography sx={{ fontFamily, fontSize: 14, fontWeight: 600, color: 'var(--ls-color-text-primary)' }}>
                    {uploadFile.name}
                  </Typography>
                  <Typography sx={{ fontFamily, fontSize: 12, color: 'var(--ls-color-muted)', mt: 0.5 }}>
                    {formatFileSize(uploadFile.size)} &middot; Click to change
                  </Typography>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <Typography sx={{ fontFamily, fontSize: 14, fontWeight: 500, color: 'var(--ls-color-text-primary)' }}>
                    Drag & drop a file here
                  </Typography>
                  <Typography sx={{ fontFamily, fontSize: 12, color: 'var(--ls-color-muted)', mt: 0.5 }}>
                    or click to browse (PDF, DOCX, TXT, images up to 100 MB)
                  </Typography>
                </div>
              )}
            </div>
          )}

          {/* URL input */}
          {uploadMode === 'url' && (
            <StyledTextField
              label="URL"
              placeholder="https://example.com/page-or-resource"
              fullWidth
              size="small"
              value={uploadUrl}
              onChange={(e) => setUploadUrl(e.target.value)}
              sx={{ mb: 2 }}
            />
          )}

          {/* Common fields */}
          <StyledTextField
            label="Document Name"
            fullWidth
            size="small"
            required
            value={uploadName}
            onChange={(e) => setUploadName(e.target.value)}
            sx={{ mb: 2 }}
          />

          <StyledTextField
            label="Description"
            fullWidth
            size="small"
            multiline
            rows={2}
            value={uploadDescription}
            onChange={(e) => setUploadDescription(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth size="small">
            <InputLabel sx={inputLabelSx}>Category</InputLabel>
            <StyledSelect
              value={uploadCategory}
              label="Category"
              onChange={(e) => setUploadCategory(e.target.value as string)}
            >
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat} sx={menuItemSx}>
                  {CATEGORY_LABELS[cat]}
                </MenuItem>
              ))}
            </StyledSelect>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setUploadDialogOpen(false)}
            disabled={uploading}
            sx={{ ...muiButtonSx, color: 'var(--ls-color-muted)' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUploadSubmit}
            disabled={
              uploading ||
              !uploadName.trim() ||
              (uploadMode === 'file' && !uploadFile) ||
              (uploadMode === 'url' && !uploadUrl.trim())
            }
            startIcon={uploading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : undefined}
            sx={{
              ...muiButtonSx,
              backgroundColor: 'var(--ls-color-brand)',
              '&:hover': { backgroundColor: 'var(--ls-color-brand-hover)' },
              '&.Mui-disabled': { backgroundColor: 'var(--ls-color-muted-border)', color: '#fff' },
            }}
          >
            {uploading ? 'Uploading...' : 'Add Document'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ============================================================ */}
      {/*  Document Detail Drawer                                       */}
      {/* ============================================================ */}
      <Drawer
        anchor="right"
        open={detailDrawerOpen}
        onClose={closeDetailDrawer}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, fontFamily } }}
      >
        {selectedDocument && (
          <div className={styles.drawerContent}>
            {/* Header */}
            <div className={styles.drawerHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', flex: 1 }}>
                {getFileTypeIcon(selectedDocument.file_type, selectedDocument.source_type)}
                {editingField === 'name' ? (
                  <StyledTextField
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    size="small"
                    autoFocus
                    onBlur={() => handleSaveDocumentField('name')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveDocumentField('name');
                      if (e.key === 'Escape') setEditingField(null);
                    }}
                    sx={{ flex: 1 }}
                  />
                ) : (
                  <Typography
                    sx={{
                      fontFamily,
                      fontSize: 16,
                      fontWeight: 600,
                      color: 'var(--ls-color-text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      cursor: 'pointer',
                    }}
                    onClick={() => setEditingField('name')}
                  >
                    {selectedDocument.name}
                  </Typography>
                )}
              </div>
              <IconButton size="small" onClick={closeDetailDrawer}>
                <CloseIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </div>

            {/* Actions */}
            <div className={styles.drawerActions}>
              {selectedDocument.source_type === 'file' && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadOutlinedIcon sx={{ fontSize: 16 }} />}
                  onClick={handleDownload}
                  sx={{
                    ...muiButtonSx,
                    fontSize: 12,
                    borderColor: 'var(--ls-color-muted-border)',
                    color: 'var(--ls-color-text-primary)',
                  }}
                >
                  Download
                </Button>
              )}

              {selectedDocument.source_type === 'url' && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<LinkOutlinedIcon sx={{ fontSize: 16 }} />}
                  onClick={handleDownload}
                  sx={{
                    ...muiButtonSx,
                    fontSize: 12,
                    borderColor: 'var(--ls-color-muted-border)',
                    color: 'var(--ls-color-text-primary)',
                  }}
                >
                  Open Link
                </Button>
              )}

              {selectedDocument.source_type === 'file' && (
                <>
                  <input
                    ref={replaceInputRef}
                    type="file"
                    hidden
                    onChange={handleReplaceFile}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SwapHorizOutlinedIcon sx={{ fontSize: 16 }} />}
                    onClick={() => replaceInputRef.current?.click()}
                    sx={{
                      ...muiButtonSx,
                      fontSize: 12,
                      borderColor: 'var(--ls-color-muted-border)',
                      color: 'var(--ls-color-text-primary)',
                    }}
                  >
                    Replace
                  </Button>
                </>
              )}

              <Button
                variant="outlined"
                size="small"
                startIcon={<DeleteOutlinedIcon sx={{ fontSize: 16 }} />}
                onClick={() => setDeleteConfirmOpen(true)}
                sx={{
                  ...muiButtonSx,
                  fontSize: 12,
                  borderColor: 'var(--ls-color-destructive-border)',
                  color: 'var(--ls-color-destructive)',
                  '&:hover': {
                    backgroundColor: 'var(--ls-color-destructive-soft)',
                    borderColor: 'var(--ls-color-destructive)',
                  },
                }}
              >
                Delete
              </Button>
            </div>

            {/* Description */}
            <div className={styles.drawerSection}>
              <div className={styles.drawerSectionLabel}>Description</div>
              {editingField === 'description' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <StyledTextField
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    size="small"
                    multiline
                    rows={3}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Button
                      size="small"
                      onClick={() => setEditingField(null)}
                      sx={{ ...muiButtonSx, fontSize: 11, color: 'var(--ls-color-muted)' }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleSaveDocumentField('description')}
                      disabled={savingEdit}
                      sx={{
                        ...muiButtonSx,
                        fontSize: 11,
                        backgroundColor: 'var(--ls-color-brand)',
                        '&:hover': { backgroundColor: 'var(--ls-color-brand-hover)' },
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className={styles.drawerSectionValue}
                  onClick={() => {
                    setEditDescription(selectedDocument.description || '');
                    setEditingField('description');
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {selectedDocument.description || (
                    <span style={{ color: 'var(--ls-color-muted)', fontStyle: 'italic' }}>
                      Click to add description
                    </span>
                  )}
                  <EditOutlinedIcon
                    sx={{ fontSize: 14, color: 'var(--ls-color-muted)', ml: 0.5, verticalAlign: 'middle' }}
                  />
                </div>
              )}
            </div>

            {/* Category */}
            <div className={styles.drawerSection}>
              <div className={styles.drawerSectionLabel}>Category</div>
              {editingField === 'category' ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <StyledSelect
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as string)}
                    >
                      {CATEGORIES.map((cat) => (
                        <MenuItem key={cat} value={cat} sx={menuItemSx}>
                          {CATEGORY_LABELS[cat]}
                        </MenuItem>
                      ))}
                    </StyledSelect>
                  </FormControl>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => handleSaveDocumentField('category')}
                    disabled={savingEdit}
                    sx={{
                      ...muiButtonSx,
                      fontSize: 11,
                      backgroundColor: 'var(--ls-color-brand)',
                      '&:hover': { backgroundColor: 'var(--ls-color-brand-hover)' },
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setEditingField(null)}
                    sx={{ ...muiButtonSx, fontSize: 11, color: 'var(--ls-color-muted)' }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={() => {
                    setEditCategory(selectedDocument.category);
                    setEditingField('category');
                  }}
                >
                  <Chip
                    label={CATEGORY_LABELS[selectedDocument.category] || selectedDocument.category}
                    size="small"
                    sx={{
                      fontFamily,
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor: (CATEGORY_COLORS[selectedDocument.category] || 'var(--ls-color-neutral)') + '1a',
                      color: CATEGORY_COLORS[selectedDocument.category] || 'var(--ls-color-neutral)',
                      border: 'none',
                      height: 24,
                    }}
                  />
                  <EditOutlinedIcon sx={{ fontSize: 14, color: 'var(--ls-color-muted)' }} />
                </div>
              )}
            </div>

            {/* Details */}
            <div className={styles.drawerSection}>
              <div className={styles.drawerSectionLabel}>Details</div>
              <div className={styles.drawerDetailGrid}>
                <span className={styles.drawerDetailLabel}>Type</span>
                <span className={styles.drawerDetailValue} style={{ textTransform: 'capitalize' }}>
                  {selectedDocument.source_type}
                </span>

                {selectedDocument.source_type === 'file' && (
                  <>
                    <span className={styles.drawerDetailLabel}>File Type</span>
                    <span className={styles.drawerDetailValue}>{selectedDocument.file_type || '\u2014'}</span>

                    <span className={styles.drawerDetailLabel}>Size</span>
                    <span className={styles.drawerDetailValue}>
                      {formatFileSize(selectedDocument.file_size)}
                    </span>

                    <span className={styles.drawerDetailLabel}>Original File</span>
                    <span className={styles.drawerDetailValue}>
                      {selectedDocument.original_filename || '\u2014'}
                    </span>
                  </>
                )}

                {selectedDocument.source_type === 'url' && (
                  <>
                    <span className={styles.drawerDetailLabel}>URL</span>
                    <span className={styles.drawerDetailValue} style={{ wordBreak: 'break-all' }}>
                      {selectedDocument.original_url || '\u2014'}
                    </span>
                  </>
                )}

                <span className={styles.drawerDetailLabel}>Version</span>
                <span className={styles.drawerDetailValue}>v{selectedDocument.current_version}</span>

                {selectedDocument.uploaded_by_name && (
                  <>
                    <span className={styles.drawerDetailLabel}>Uploaded By</span>
                    <span className={styles.drawerDetailValue}>
                      {selectedDocument.uploaded_by_name}
                    </span>
                  </>
                )}

                <span className={styles.drawerDetailLabel}>Created</span>
                <span className={styles.drawerDetailValue}>{formatDate(selectedDocument.created_at)}</span>

                <span className={styles.drawerDetailLabel}>Updated</span>
                <span className={styles.drawerDetailValue}>{formatDate(selectedDocument.updated_at)}</span>

                {selectedDocument.extraction_status && (
                  <>
                    <span className={styles.drawerDetailLabel}>Processing</span>
                    <span className={styles.drawerDetailValue}>
                      <Chip
                        label={selectedDocument.extraction_status}
                        size="small"
                        sx={{
                          fontFamily,
                          fontSize: 11,
                          height: 22,
                          textTransform: 'capitalize',
                          backgroundColor:
                            selectedDocument.extraction_status === 'completed'
                              ? 'var(--ls-color-success-soft)'
                              : selectedDocument.extraction_status === 'processing'
                              ? 'var(--ls-color-warning-soft)'
                              : 'var(--ls-color-muted-soft)',
                          color:
                            selectedDocument.extraction_status === 'completed'
                              ? 'var(--ls-color-success)'
                              : selectedDocument.extraction_status === 'processing'
                              ? 'var(--ls-color-warning)'
                              : 'var(--ls-color-muted)',
                        }}
                      />
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* ============================================================ */}
      {/*  Delete Confirmation Dialog                                   */}
      {/* ============================================================ */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => !deleting && setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px', fontFamily } }}
      >
        <DialogTitle sx={{ fontFamily, fontSize: 18, fontWeight: 600 }}>
          Delete Document
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily, fontSize: 14, color: 'var(--ls-color-muted)' }}>
            Are you sure you want to delete &ldquo;{selectedDocument?.name}&rdquo;? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteConfirmOpen(false)}
            disabled={deleting}
            sx={{ ...muiButtonSx, color: 'var(--ls-color-muted)' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDelete}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : undefined}
            sx={{
              ...muiButtonSx,
              backgroundColor: 'var(--ls-color-destructive)',
              '&:hover': { backgroundColor: 'var(--ls-color-destructive-hover)' },
              '&.Mui-disabled': { backgroundColor: 'var(--ls-color-muted-border)', color: '#fff' },
            }}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ============================================================ */}
      {/*  Snackbar                                                     */}
      {/* ============================================================ */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ fontFamily, fontSize: 13, borderRadius: '8px' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
