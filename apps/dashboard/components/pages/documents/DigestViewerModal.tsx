import * as React from 'react';
import {
  Dialog,
  DialogContent,
  IconButton,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import sty from './DigestViewerModal.module.css';

const fontFamily = '"Satoshi", sans-serif';
const monoFont = '"SF Mono", "Fira Code", "Fira Mono", Menlo, Consolas, monospace';

interface DigestVersion {
  id: string;
  document_id: string;
  content_md: string | null;
  content_hash: string | null;
  extraction_method: string | null;
  extraction_status: string;
  extraction_error: string | null;
  version: number;
  previous_content_md: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface DigestViewerModalProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
  apiBasePath: string;
  authHeaders: () => Promise<Record<string, string>>;
}

export function DigestViewerModal({
  open,
  onClose,
  documentId,
  documentName,
  apiBasePath,
  authHeaders,
}: DigestViewerModalProps) {
  const [versions, setVersions] = React.useState<DigestVersion[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedVersionIdx, setSelectedVersionIdx] = React.useState(0);
  const [viewMode, setViewMode] = React.useState<'raw' | 'formatted'>('formatted');
  const [editedContent, setEditedContent] = React.useState<string>('');
  const [hasChanges, setHasChanges] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const selectedVersion = versions[selectedVersionIdx] || null;

  // Fetch digest versions when modal opens
  React.useEffect(() => {
    if (!open || !documentId) return;

    let cancelled = false;

    async function fetchDigests() {
      setLoading(true);
      try {
        const headers = await authHeaders();
        const res = await fetch(`${apiBasePath}/${documentId}/digest`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setVersions(data);
            setSelectedVersionIdx(data.length - 1); // select latest
            if (data.length > 0) {
              setEditedContent(data[data.length - 1].content_md || '');
            }
            setHasChanges(false);
          }
        }
      } catch {
        // silently handle
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDigests();
    return () => { cancelled = true; };
  }, [open, documentId, apiBasePath, authHeaders]);

  // Sync edited content when version selection changes
  React.useEffect(() => {
    if (selectedVersion) {
      setEditedContent(selectedVersion.content_md || '');
      setHasChanges(false);
    }
  }, [selectedVersionIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedContent(e.target.value);
    setHasChanges(e.target.value !== (selectedVersion?.content_md || ''));
  };

  const handleSave = async () => {
    if (!selectedVersion || !hasChanges) return;
    setSaving(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${apiBasePath}/${documentId}/digest`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          digest_id: selectedVersion.id,
          content_md: editedContent,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setVersions((prev) =>
          prev.map((v) => (v.id === updated.id ? updated : v))
        );
        setHasChanges(false);
        setSnackbar({ open: true, message: 'Digest saved', severity: 'success' });
      } else {
        const err = await res.json().catch(() => null);
        setSnackbar({
          open: true,
          message: err?.error || 'Failed to save',
          severity: 'error',
        });
      }
    } catch {
      setSnackbar({ open: true, message: 'Failed to save', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (!window.confirm('You have unsaved changes. Discard?')) return;
    }
    onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            fontFamily,
            height: '80vh',
            maxHeight: '80vh',
          },
        }}
      >
        {/* Header bar */}
        <div className={sty.header}>
          <div className={sty.headerLeft}>
            <span className={sty.headerTitle}>{documentName}</span>
            <span className={sty.headerSubtitle}>Digest Viewer</span>
          </div>
          <div className={sty.headerRight}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, v) => v && setViewMode(v)}
              size="small"
              sx={{ height: 30 }}
            >
              <ToggleButton
                value="formatted"
                sx={{
                  fontFamily,
                  fontSize: 12,
                  textTransform: 'none',
                  px: 1.5,
                  '&.Mui-selected': {
                    backgroundColor: 'var(--ls-color-brand-soft)',
                    color: 'var(--ls-color-brand)',
                  },
                }}
              >
                Formatted
              </ToggleButton>
              <ToggleButton
                value="raw"
                sx={{
                  fontFamily,
                  fontSize: 12,
                  textTransform: 'none',
                  px: 1.5,
                  '&.Mui-selected': {
                    backgroundColor: 'var(--ls-color-brand-soft)',
                    color: 'var(--ls-color-brand)',
                  },
                }}
              >
                Raw
              </ToggleButton>
            </ToggleButtonGroup>

            {viewMode === 'raw' && hasChanges && (
              <Button
                variant="contained"
                size="small"
                startIcon={
                  saving ? (
                    <CircularProgress size={14} sx={{ color: '#fff' }} />
                  ) : (
                    <SaveOutlinedIcon sx={{ fontSize: 16 }} />
                  )
                }
                disabled={saving}
                onClick={handleSave}
                sx={{
                  fontFamily,
                  fontSize: 12,
                  textTransform: 'none',
                  borderRadius: '6px',
                  backgroundColor: 'var(--ls-color-brand)',
                  '&:hover': { backgroundColor: 'var(--ls-color-brand-hover)' },
                }}
              >
                Save
              </Button>
            )}

            <IconButton size="small" onClick={handleClose}>
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </div>
        </div>

        <DialogContent sx={{ p: 0, display: 'flex', overflow: 'hidden' }}>
          {loading ? (
            <div className={sty.loadingState}>
              <CircularProgress size={24} sx={{ color: 'var(--ls-color-brand)' }} />
              <span className={sty.loadingText}>Loading digests...</span>
            </div>
          ) : versions.length === 0 ? (
            <div className={sty.emptyState}>
              <span className={sty.emptyText}>No digest versions found for this document.</span>
            </div>
          ) : (
            <>
              {/* Left sidebar — version list */}
              <div className={sty.sidebar}>
                <div className={sty.sidebarLabel}>Versions</div>
                {versions.map((v, i) => (
                  <button
                    key={v.id}
                    className={`${sty.versionButton} ${i === selectedVersionIdx ? sty.versionButtonActive : ''}`}
                    onClick={() => {
                      if (hasChanges) {
                        if (!window.confirm('You have unsaved changes. Discard?')) return;
                      }
                      setSelectedVersionIdx(i);
                    }}
                  >
                    <span className={sty.versionNumber}>v{v.version}</span>
                    <span className={sty.versionDate}>
                      {new Date(v.updated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className={sty.versionMethod}>
                      {v.extraction_method || 'unknown'}
                    </span>
                  </button>
                ))}
              </div>

              {/* Main content area */}
              <div className={sty.contentArea}>
                {viewMode === 'raw' ? (
                  <textarea
                    className={sty.rawEditor}
                    value={editedContent}
                    onChange={handleContentChange}
                    spellCheck={false}
                  />
                ) : (
                  <div className={sty.formattedView}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedVersion?.content_md || ''}</ReactMarkdown>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
