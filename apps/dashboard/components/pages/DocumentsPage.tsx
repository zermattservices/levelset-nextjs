import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';
import {
  Button,
  TextField,
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
  Breadcrumbs,
  Link as MuiLink,
  Typography,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined';
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
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

import sty from './DocumentsPage.module.css';
import projectcss from '@/styles/base.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { AuthLoadingScreen } from '@/components/CodeComponents/AuthLoadingScreen';
import { useAuth } from '@/lib/providers/AuthProvider';
import {
  StyledTextField,
  StyledSelect,
  inputLabelSx,
  menuItemSx,
} from '@/components/forms/dialogStyles';

const fontFamily = '"Satoshi", sans-serif';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------ */
/*  Constants & Types                                                  */
/* ------------------------------------------------------------------ */

const DOCUMENT_CATEGORIES = [
  'employee_handbook',
  'leadership_resource',
  'development_resource',
  'organization_info',
  'benefits',
  'other',
] as const;

type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  employee_handbook: 'Employee Handbook',
  leadership_resource: 'Leadership Resource',
  development_resource: 'Development Resource',
  organization_info: 'Organization Info',
  benefits: 'Benefits',
  other: 'Other',
};

interface DocumentFolder {
  id: string;
  org_id: string;
  name: string;
  parent_folder_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface Document {
  id: string;
  org_id: string;
  folder_id: string | null;
  name: string;
  description: string | null;
  category: DocumentCategory;
  source_type: 'file' | 'url';
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
  digest_status?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '\u2014';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeIcon(fileType: string | null, sourceType: string): React.ReactNode {
  if (sourceType === 'url') return <LinkOutlinedIcon sx={{ fontSize: 20, color: 'var(--ls-color-muted)' }} />;
  if (!fileType) return <InsertDriveFileOutlinedIcon sx={{ fontSize: 20, color: 'var(--ls-color-muted)' }} />;
  if (fileType.includes('pdf')) return <PictureAsPdfOutlinedIcon sx={{ fontSize: 20, color: '#e53935' }} />;
  if (fileType.startsWith('image/')) return <ImageOutlinedIcon sx={{ fontSize: 20, color: 'var(--ls-color-brand)' }} />;
  return <InsertDriveFileOutlinedIcon sx={{ fontSize: 20, color: 'var(--ls-color-muted)' }} />;
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    employee_handbook: 'var(--ls-color-brand)',
    leadership_resource: 'var(--ls-color-warning)',
    development_resource: 'var(--ls-color-success)',
    organization_info: 'var(--ls-color-muted)',
    benefits: '#7c3aed',
    other: 'var(--ls-color-neutral)',
  };
  return colors[category] || 'var(--ls-color-neutral)';
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DocumentsPage() {
  const router = useRouter();
  const auth = useAuth();
  const { t } = useTranslation();

  // Data state
  const [folders, setFolders] = React.useState<DocumentFolder[]>([]);
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Navigation
  const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(null);
  const [folderPath, setFolderPath] = React.useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'Documents' },
  ]);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<DocumentCategory | null>(null);

  // Upload dialog
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [uploadMode, setUploadMode] = React.useState<'file' | 'url'>('file');
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [uploadUrl, setUploadUrl] = React.useState('');
  const [uploadName, setUploadName] = React.useState('');
  const [uploadDescription, setUploadDescription] = React.useState('');
  const [uploadCategory, setUploadCategory] = React.useState<DocumentCategory>('other');
  const [uploading, setUploading] = React.useState(false);
  const [dragActive, setDragActive] = React.useState(false);

  // Create folder dialog
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState('');
  const [creatingFolder, setCreatingFolder] = React.useState(false);

  // Detail drawer
  const [selectedDocument, setSelectedDocument] = React.useState<Document | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = React.useState(false);
  const [editingField, setEditingField] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');
  const [editCategory, setEditCategory] = React.useState<DocumentCategory>('other');
  const [savingEdit, setSavingEdit] = React.useState(false);

  // Delete confirm
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // Replace file
  const replaceInputRef = React.useRef<HTMLInputElement>(null);

  // Snackbar
  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  // Redirect unauthenticated users
  React.useEffect(() => {
    if (auth.isLoaded && !auth.authUser) {
      router.push(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
    }
  }, [auth.isLoaded, auth.authUser, router]);

  /* ---------------------------------------------------------------- */
  /*  Auth helpers                                                     */
  /* ---------------------------------------------------------------- */

  const getAccessToken = React.useCallback(async (): Promise<string | null> => {
    try {
      const { createSupabaseClient } = await import('@/util/supabase/component');
      const supabase = createSupabaseClient();
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || null;
    } catch {
      return null;
    }
  }, []);

  const authHeaders = React.useCallback(
    async (): Promise<Record<string, string>> => {
      const token = await getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      return headers;
    },
    [getAccessToken],
  );

  /* ---------------------------------------------------------------- */
  /*  Data fetching                                                    */
  /* ---------------------------------------------------------------- */

  const fetchFolders = React.useCallback(async () => {
    try {
      const headers = await authHeaders();
      const params = new URLSearchParams();
      if (currentFolderId) params.set('parent_folder_id', currentFolderId);

      const res = await fetch(`/api/documents/folders?${params}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setFolders(data);
      }
    } catch {
      // silently handle
    }
  }, [authHeaders, currentFolderId]);

  const fetchDocuments = React.useCallback(async () => {
    try {
      const headers = await authHeaders();
      const params = new URLSearchParams();
      if (currentFolderId) params.set('folder_id', currentFolderId);
      if (categoryFilter) params.set('category', categoryFilter);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/documents?${params}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch {
      // silently handle
    }
  }, [authHeaders, currentFolderId, categoryFilter, searchQuery]);

  const fetchAll = React.useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchFolders(), fetchDocuments()]);
    setLoading(false);
  }, [fetchFolders, fetchDocuments]);

  React.useEffect(() => {
    if (!auth.isLoaded || !auth.authUser || !auth.appUser || auth.role !== 'Levelset Admin') return;
    fetchAll();
  }, [auth.isLoaded, auth.authUser, auth.appUser, auth.role, fetchAll]);

  /* ---------------------------------------------------------------- */
  /*  Folder navigation                                                */
  /* ---------------------------------------------------------------- */

  const navigateToFolder = (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId);
    setFolderPath((prev) => [...prev, { id: folderId, name: folderName }]);
  };

  const navigateToBreadcrumb = (index: number) => {
    const target = folderPath[index];
    setCurrentFolderId(target.id);
    setFolderPath((prev) => prev.slice(0, index + 1));
  };

  // Refetch when folder or filters change
  React.useEffect(() => {
    if (!auth.isLoaded || !auth.authUser || auth.role !== 'Levelset Admin') return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolderId, categoryFilter, searchQuery]);

  /* ---------------------------------------------------------------- */
  /*  Create folder                                                    */
  /* ---------------------------------------------------------------- */

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/documents/folders', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parent_folder_id: currentFolderId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create folder');
      }

      setSnackbar({ open: true, message: 'Folder created', severity: 'success' });
      setNewFolderName('');
      setCreateFolderDialogOpen(false);
      fetchFolders();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to create folder', severity: 'error' });
    } finally {
      setCreatingFolder(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Upload                                                           */
  /* ---------------------------------------------------------------- */

  const resetUploadForm = () => {
    setUploadMode('file');
    setUploadFile(null);
    setUploadUrl('');
    setUploadName('');
    setUploadDescription('');
    setUploadCategory('other');
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
      const token = await getAccessToken();

      if (uploadMode === 'file' && uploadFile) {
        // Step 1: Upload file
        const formData = new FormData();
        formData.append('file', uploadFile);
        if (currentFolderId) formData.append('folder_id', currentFolderId);

        const uploadRes = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || 'Upload failed');
        }

        const uploadData = await uploadRes.json();

        // Step 2: Create document record
        const createRes = await fetch('/api/documents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            intent: 'create',
            name: uploadName.trim(),
            description: uploadDescription.trim() || null,
            category: uploadCategory,
            folder_id: currentFolderId,
            source_type: 'file',
            storage_path: uploadData.storage_path,
            file_type: uploadFile.type,
            file_size: uploadFile.size,
            original_filename: uploadFile.name,
          }),
        });

        if (!createRes.ok) {
          const err = await createRes.json();
          throw new Error(err.error || 'Failed to create document');
        }
      } else {
        // URL document — no file upload needed
        const createRes = await fetch('/api/documents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            intent: 'create',
            name: uploadName.trim(),
            description: uploadDescription.trim() || null,
            category: uploadCategory,
            folder_id: currentFolderId,
            source_type: 'url',
            original_url: uploadUrl.trim(),
          }),
        });

        if (!createRes.ok) {
          const err = await createRes.json();
          throw new Error(err.error || 'Failed to create document');
        }
      }

      setSnackbar({ open: true, message: 'Document added', severity: 'success' });
      resetUploadForm();
      setUploadDialogOpen(false);
      fetchDocuments();
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
      const headers = await authHeaders();
      const body: Record<string, any> = { intent: 'update' };
      if (field === 'name') body.name = editName.trim();
      if (field === 'description') body.description = editDescription.trim() || null;
      if (field === 'category') body.category = editCategory;

      const res = await fetch(`/api/documents/${selectedDocument.id}`, {
        method: 'POST',
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
      const headers = await authHeaders();
      const res = await fetch(`/api/documents/${selectedDocument.id}?action=download`, { headers });
      if (!res.ok) throw new Error('Download failed');

      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
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
      const headers = await authHeaders();
      const res = await fetch(`/api/documents/${selectedDocument.id}`, {
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
      const token = await getAccessToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_id', selectedDocument.id);

      const uploadRes = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || 'Replace failed');
      }

      const uploadData = await uploadRes.json();

      const updateRes = await fetch(`/api/documents/${selectedDocument.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          intent: 'replace',
          storage_path: uploadData.storage_path,
          file_type: file.type,
          file_size: file.size,
          original_filename: file.name,
        }),
      });

      if (!updateRes.ok) {
        const err = await updateRes.json();
        throw new Error(err.error || 'Failed to update document');
      }

      const updated = await updateRes.json();
      setSelectedDocument(updated);
      setSnackbar({ open: true, message: 'File replaced', severity: 'success' });
      fetchDocuments();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Replace failed', severity: 'error' });
    }

    // Reset file input
    if (replaceInputRef.current) replaceInputRef.current.value = '';
  };

  /* ---------------------------------------------------------------- */
  /*  DataGrid columns                                                 */
  /* ---------------------------------------------------------------- */

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 2,
      minWidth: 220,
      renderCell: (params) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
          {getFileTypeIcon(params.row.file_type, params.row.source_type)}
          <span
            style={{
              fontFamily,
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--ls-color-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {params.value}
          </span>
        </div>
      ),
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 180,
      renderCell: (params) => (
        <Chip
          label={CATEGORY_LABELS[params.value as DocumentCategory] || params.value}
          size="small"
          sx={{
            fontFamily,
            fontSize: 11,
            fontWeight: 600,
            backgroundColor: getCategoryColor(params.value) + '1a',
            color: getCategoryColor(params.value),
            border: 'none',
            height: 24,
          }}
        />
      ),
    },
    {
      field: 'source_type',
      headerName: 'Type',
      width: 80,
      renderCell: (params) => (
        <span style={{ fontFamily, fontSize: 12, color: 'var(--ls-color-muted)', textTransform: 'capitalize' }}>
          {params.value}
        </span>
      ),
    },
    {
      field: 'file_size',
      headerName: 'Size',
      width: 100,
      renderCell: (params) => (
        <span style={{ fontFamily, fontSize: 12, color: 'var(--ls-color-muted)' }}>
          {formatFileSize(params.value)}
        </span>
      ),
    },
    {
      field: 'uploaded_by_name',
      headerName: 'Uploaded By',
      width: 140,
      renderCell: (params) => (
        <span style={{ fontFamily, fontSize: 12, color: 'var(--ls-color-muted)' }}>
          {params.value || '\u2014'}
        </span>
      ),
    },
    {
      field: 'created_at',
      headerName: 'Date',
      width: 120,
      renderCell: (params) => (
        <span style={{ fontFamily, fontSize: 12, color: 'var(--ls-color-muted)' }}>
          {formatDate(params.value)}
        </span>
      ),
    },
  ];

  /* ---------------------------------------------------------------- */
  /*  Render guards                                                    */
  /* ---------------------------------------------------------------- */

  if (!auth.isLoaded || !auth.authUser) {
    return <AuthLoadingScreen />;
  }

  const isLevelsetAdmin = auth.role === 'Levelset Admin';

  /* ---------------------------------------------------------------- */
  /*  MUI shared sx                                                    */
  /* ---------------------------------------------------------------- */

  /* muiInputSx kept only for the search bar which has no label */
  const searchInputSx = {
    '& .MuiOutlinedInput-root': {
      fontFamily,
      fontSize: 13,
      borderRadius: '8px',
      height: 36,
    },
  };

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
    <>
      <Head>
        <title key="title">Levelset | Documents</title>
        <meta key="og:title" property="og:title" content="Levelset | Documents" />
      </Head>

      <style>{`
        body {
          margin: 0;
        }
      `}</style>

      <div
        className={classNames(
          projectcss.all,
          projectcss.root_reset,
          projectcss.plasmic_default_styles,
          projectcss.plasmic_mixins,
          projectcss.plasmic_tokens,
          sty.root,
        )}
      >
        <MenuNavigation
          className={classNames('__wab_instance', sty.menuNavigation)}
          firstName={auth.first_name}
          userRole={auth.role}
        />

        <div className={sty.contentWrapper}>
          <div className={sty.contentInner}>
            {!isLevelsetAdmin ? (
              /* ---- Coming Soon (non-admin) ---- */
              <div className={sty.comingSoonContainer}>
                <DescriptionOutlinedIcon className={sty.comingSoonIcon} />
                <h2 className={sty.comingSoonTitle}>Documents</h2>
                <p className={sty.comingSoonDescription}>
                  Manage and organize documents for your organization. This feature is currently being developed.
                </p>
                <span className={sty.comingSoonBadge}>Coming Soon</span>
              </div>
            ) : (
              /* ---- Admin view ---- */
              <>
                {/* Page header */}
                <div className={sty.pageHeader}>
                  <h1 className={sty.pageTitle}>Documents</h1>
                </div>

                {/* Breadcrumbs */}
                {folderPath.length > 1 && (
                  <div className={sty.breadcrumbs}>
                    <Breadcrumbs
                      separator={<NavigateNextIcon sx={{ fontSize: 16, color: 'var(--ls-color-muted)' }} />}
                      sx={{ fontFamily, fontSize: 13 }}
                    >
                      {folderPath.map((crumb, idx) => {
                        const isLast = idx === folderPath.length - 1;
                        return isLast ? (
                          <Typography
                            key={idx}
                            sx={{ fontFamily, fontSize: 13, fontWeight: 600, color: 'var(--ls-color-text-primary)' }}
                          >
                            {crumb.name}
                          </Typography>
                        ) : (
                          <MuiLink
                            key={idx}
                            component="button"
                            underline="hover"
                            onClick={() => navigateToBreadcrumb(idx)}
                            sx={{
                              fontFamily,
                              fontSize: 13,
                              color: 'var(--ls-color-brand)',
                              cursor: 'pointer',
                              border: 'none',
                              background: 'none',
                              padding: 0,
                            }}
                          >
                            {crumb.name}
                          </MuiLink>
                        );
                      })}
                    </Breadcrumbs>
                  </div>
                )}

                {/* Action bar */}
                <div className={sty.actionBar}>
                  <div className={sty.actionBarLeft}>
                    <TextField
                      placeholder="Search documents..."
                      size="small"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <SearchOutlinedIcon
                            sx={{ fontSize: 18, color: 'var(--ls-color-muted)', mr: 0.5 }}
                          />
                        ),
                      }}
                      sx={{ ...searchInputSx, width: 260 }}
                      className={sty.searchInput}
                    />

                    <div className={sty.filterChips}>
                      <Chip
                        label="All"
                        size="small"
                        variant={categoryFilter === null ? 'filled' : 'outlined'}
                        onClick={() => setCategoryFilter(null)}
                        sx={{
                          fontFamily,
                          fontSize: 12,
                          fontWeight: 500,
                          ...(categoryFilter === null
                            ? {
                                backgroundColor: 'var(--ls-color-brand)',
                                color: '#fff',
                                '&:hover': { backgroundColor: 'var(--ls-color-brand-hover)' },
                              }
                            : {
                                borderColor: 'var(--ls-color-muted-border)',
                                color: 'var(--ls-color-muted)',
                              }),
                        }}
                      />
                      {DOCUMENT_CATEGORIES.map((cat) => (
                        <Chip
                          key={cat}
                          label={CATEGORY_LABELS[cat]}
                          size="small"
                          variant={categoryFilter === cat ? 'filled' : 'outlined'}
                          onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                          sx={{
                            fontFamily,
                            fontSize: 12,
                            fontWeight: 500,
                            ...(categoryFilter === cat
                              ? {
                                  backgroundColor: getCategoryColor(cat),
                                  color: '#fff',
                                  '&:hover': { opacity: 0.9 },
                                }
                              : {
                                  borderColor: 'var(--ls-color-muted-border)',
                                  color: 'var(--ls-color-muted)',
                                }),
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className={sty.actionBarRight}>
                    <Button
                      variant="outlined"
                      startIcon={<CreateNewFolderOutlinedIcon sx={{ fontSize: 18 }} />}
                      onClick={() => setCreateFolderDialogOpen(true)}
                      sx={{
                        ...muiButtonSx,
                        borderColor: 'var(--ls-color-muted-border)',
                        color: 'var(--ls-color-text-primary)',
                        '&:hover': {
                          borderColor: 'var(--ls-color-brand)',
                          backgroundColor: 'var(--ls-color-brand-soft)',
                        },
                      }}
                    >
                      New Folder
                    </Button>
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
                      Upload
                    </Button>
                  </div>
                </div>

                {/* Content: Folders + Documents */}
                {loading ? (
                  <div className={sty.loadingState}>
                    <CircularProgress size={24} sx={{ color: 'var(--ls-color-brand)' }} />
                    <span className={sty.loadingText}>Loading documents...</span>
                  </div>
                ) : (
                  <>
                    {/* Folders grid */}
                    {folders.length > 0 && (
                      <div className={sty.foldersGrid}>
                        {folders.map((folder) => (
                          <div
                            key={folder.id}
                            className={sty.folderCard}
                            onClick={() => navigateToFolder(folder.id, folder.name)}
                          >
                            <FolderOutlinedIcon className={sty.folderCardIcon} />
                            <span className={sty.folderCardName}>{folder.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Documents table */}
                    {documents.length === 0 && folders.length === 0 ? (
                      <div className={sty.emptyState}>
                        <DescriptionOutlinedIcon className={sty.emptyStateIcon} />
                        <h3 className={sty.emptyStateTitle}>No documents yet</h3>
                        <p className={sty.emptyStateDescription}>
                          Upload files or add links to get started. Organize documents into folders for easy access.
                        </p>
                      </div>
                    ) : documents.length > 0 ? (
                      <div className={sty.documentsSection}>
                        <DataGridPro
                          rows={documents}
                          columns={columns}
                          density="compact"
                          disableColumnMenu
                          disableRowSelectionOnClick
                          hideFooter
                          onRowClick={(params) => openDetailDrawer(params.row as Document)}
                          sx={{
                            fontFamily,
                            border: '1px solid var(--ls-color-muted-border)',
                            borderRadius: '8px',
                            '& .MuiDataGrid-columnHeaders': {
                              backgroundColor: 'var(--ls-color-neutral-foreground)',
                              borderBottom: '1px solid var(--ls-color-muted-border)',
                            },
                            '& .MuiDataGrid-columnHeaderTitle': {
                              fontFamily,
                              fontSize: 12,
                              fontWeight: 600,
                              color: 'var(--ls-color-muted)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            },
                            '& .MuiDataGrid-row': {
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: 'var(--ls-color-brand-soft)',
                              },
                            },
                            '& .MuiDataGrid-cell': {
                              borderBottom: '1px solid var(--ls-color-muted-border)',
                              display: 'flex',
                              alignItems: 'center',
                            },
                          }}
                          autoHeight
                        />
                      </div>
                    ) : null}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

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
              className={classNames(sty.uploadDropZone, dragActive && sty.uploadDropZoneActive)}
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
                    or click to browse
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
              onChange={(e) => setUploadCategory(e.target.value as DocumentCategory)}
            >
              {DOCUMENT_CATEGORIES.map((cat) => (
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
      {/*  Create Folder Dialog                                         */}
      {/* ============================================================ */}
      <Dialog
        open={createFolderDialogOpen}
        onClose={() => !creatingFolder && setCreateFolderDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px', fontFamily } }}
      >
        <DialogTitle sx={{ fontFamily, fontSize: 18, fontWeight: 600, pb: 1 }}>
          Create Folder
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <StyledTextField
            label="Folder Name"
            fullWidth
            size="small"
            required
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder();
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setCreateFolderDialogOpen(false)}
            disabled={creatingFolder}
            sx={{ ...muiButtonSx, color: 'var(--ls-color-muted)' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateFolder}
            disabled={creatingFolder || !newFolderName.trim()}
            startIcon={creatingFolder ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : undefined}
            sx={{
              ...muiButtonSx,
              backgroundColor: 'var(--ls-color-brand)',
              '&:hover': { backgroundColor: 'var(--ls-color-brand-hover)' },
              '&.Mui-disabled': { backgroundColor: 'var(--ls-color-muted-border)', color: '#fff' },
            }}
          >
            {creatingFolder ? 'Creating...' : 'Create'}
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
          <div className={sty.drawerContent}>
            {/* Header */}
            <div className={sty.drawerHeader}>
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
            <div className={sty.drawerActions}>
              {selectedDocument.source_type === 'file' ? (
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
              ) : (
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

            {/* Info sections */}
            <div className={sty.drawerSection}>
              <div className={sty.drawerSectionLabel}>Description</div>
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
                  className={sty.drawerSectionValue}
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

            <div className={sty.drawerSection}>
              <div className={sty.drawerSectionLabel}>Category</div>
              {editingField === 'category' ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <StyledSelect
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as DocumentCategory)}
                    >
                      {DOCUMENT_CATEGORIES.map((cat) => (
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
                      backgroundColor: getCategoryColor(selectedDocument.category) + '1a',
                      color: getCategoryColor(selectedDocument.category),
                      border: 'none',
                      height: 24,
                    }}
                  />
                  <EditOutlinedIcon sx={{ fontSize: 14, color: 'var(--ls-color-muted)' }} />
                </div>
              )}
            </div>

            <div className={sty.drawerSection}>
              <div className={sty.drawerSectionLabel}>Details</div>
              <div className={sty.drawerDetailGrid}>
                <span className={sty.drawerDetailLabel}>Type</span>
                <span className={sty.drawerDetailValue} style={{ textTransform: 'capitalize' }}>
                  {selectedDocument.source_type}
                </span>

                {selectedDocument.source_type === 'file' && (
                  <>
                    <span className={sty.drawerDetailLabel}>File Type</span>
                    <span className={sty.drawerDetailValue}>{selectedDocument.file_type || '\u2014'}</span>

                    <span className={sty.drawerDetailLabel}>Size</span>
                    <span className={sty.drawerDetailValue}>
                      {formatFileSize(selectedDocument.file_size)}
                    </span>

                    <span className={sty.drawerDetailLabel}>Original File</span>
                    <span className={sty.drawerDetailValue}>
                      {selectedDocument.original_filename || '\u2014'}
                    </span>
                  </>
                )}

                {selectedDocument.source_type === 'url' && (
                  <>
                    <span className={sty.drawerDetailLabel}>URL</span>
                    <span className={sty.drawerDetailValue} style={{ wordBreak: 'break-all' }}>
                      {selectedDocument.original_url || '\u2014'}
                    </span>
                  </>
                )}

                <span className={sty.drawerDetailLabel}>Version</span>
                <span className={sty.drawerDetailValue}>v{selectedDocument.current_version}</span>

                <span className={sty.drawerDetailLabel}>Uploaded By</span>
                <span className={sty.drawerDetailValue}>
                  {selectedDocument.uploaded_by_name || '\u2014'}
                </span>

                <span className={sty.drawerDetailLabel}>Created</span>
                <span className={sty.drawerDetailValue}>{formatDate(selectedDocument.created_at)}</span>

                <span className={sty.drawerDetailLabel}>Updated</span>
                <span className={sty.drawerDetailValue}>{formatDate(selectedDocument.updated_at)}</span>

                {selectedDocument.digest_status && (
                  <>
                    <span className={sty.drawerDetailLabel}>Digest Status</span>
                    <span className={sty.drawerDetailValue}>
                      <Chip
                        label={selectedDocument.digest_status}
                        size="small"
                        sx={{
                          fontFamily,
                          fontSize: 11,
                          height: 22,
                          textTransform: 'capitalize',
                          backgroundColor:
                            selectedDocument.digest_status === 'completed'
                              ? 'var(--ls-color-success-soft)'
                              : selectedDocument.digest_status === 'processing'
                              ? 'var(--ls-color-warning-soft)'
                              : 'var(--ls-color-muted-soft)',
                          color:
                            selectedDocument.digest_status === 'completed'
                              ? 'var(--ls-color-success)'
                              : selectedDocument.digest_status === 'processing'
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
    </>
  );
}
