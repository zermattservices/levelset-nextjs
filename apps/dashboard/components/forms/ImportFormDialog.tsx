// apps/dashboard/components/forms/ImportFormDialog.tsx

import * as React from 'react';
import { Dialog, IconButton, LinearProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { fontFamily } from './dialogStyles';
import { LeviIcon } from '@/components/levi/LeviIcon';
import sty from './ImportFormDialog.module.css';
import type { FormGroup, FormType } from '@/lib/forms/types';

interface ImportFormDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: (slug: string) => void;
  groups: FormGroup[];
  getAccessToken: () => Promise<string | null>;
  orgId?: string | null;
}

const SLUG_TO_TYPE: Record<string, FormType> = {
  evaluations: 'evaluation',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImportFormDialog({
  open,
  onClose,
  onImported,
  groups,
  getAccessToken,
  orgId,
}: ImportFormDialogProps) {
  const [activeTab, setActiveTab] = React.useState(0);
  const [formName, setFormName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [groupId, setGroupId] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [processingMessage, setProcessingMessage] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const selectedGroup = groups.find((g) => g.id === groupId);
  const formType: FormType =
    (selectedGroup?.slug && SLUG_TO_TYPE[selectedGroup.slug]) || 'custom';

  // Auto-select first group alphabetically
  const sortedGroups = React.useMemo(
    () => [...groups].sort((a, b) => a.name.localeCompare(b.name)),
    [groups]
  );

  React.useEffect(() => {
    if (!open) {
      setActiveTab(0);
      setFormName('');
      setDescription('');
      setGroupId('');
      setUrl('');
      setFile(null);
      setError('');
      setImporting(false);
      setProcessingMessage('');
    } else if (sortedGroups.length > 0 && !groupId) {
      setGroupId(sortedGroups[0].id);
    }
  }, [open, sortedGroups]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      if (droppedFile.size > 10 * 1024 * 1024) { setError('File size must be under 10 MB.'); return; }
      setFile(droppedFile);
      setError('');
    } else {
      setError('Please upload a PDF file.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') { setError('Please upload a PDF file.'); return; }
      if (selectedFile.size > 10 * 1024 * 1024) { setError('File size must be under 10 MB.'); return; }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleImport = async () => {
    setError('');
    if (!groupId) { setError('Please select a group.'); return; }
    if (activeTab === 0 && !file) { setError('Please upload a PDF file.'); return; }
    if (activeTab === 1 && !url.trim()) { setError('Please enter a URL.'); return; }

    setImporting(true);
    setProcessingMessage('Analyzing form structure...');

    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let body: Record<string, any>;

      if (activeTab === 0 && file) {
        setProcessingMessage('Reading your PDF...');
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        setProcessingMessage('Extracting form fields...');
        body = {
          source_type: 'pdf', file_data: base64, file_media_type: 'application/pdf',
          name: formName || undefined, description: description || undefined,
          group_id: groupId, form_type: formType, org_id: orgId,
        };
      } else {
        setProcessingMessage('Fetching the page...');
        body = {
          source_type: 'url', url: url.trim(),
          name: formName || undefined, description: description || undefined,
          group_id: groupId, form_type: formType, org_id: orgId,
        };
      }

      const res = await fetch('/api/forms/import', { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      setProcessingMessage('Done! Opening editor...');
      onImported(data.slug || data.id);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setImporting(false);
      setProcessingMessage('');
    }
  };

  const canImport = groupId && ((activeTab === 0 && file) || (activeTab === 1 && url.trim())) && !importing;

  return (
    <Dialog
      open={open}
      onClose={importing ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: '14px', fontFamily, overflow: 'hidden', backgroundImage: 'none' } }}
    >
      {/* Header */}
      <div className={sty.header}>
        <span className={sty.title}>Import Form</span>
        <IconButton size="small" onClick={onClose} disabled={importing}>
          <CloseIcon sx={{ fontSize: 18, color: 'var(--ls-color-muted)' }} />
        </IconButton>
      </div>

      {/* Content */}
      <div className={sty.content}>
        {error && <div className={sty.errorBanner}>{error}</div>}

        {importing ? (
          <div className={sty.processingState}>
            <div className={sty.processingAvatar}>
              <LeviIcon size={28} color="var(--ls-color-brand)" />
            </div>
            <span className={sty.processingTitle}>Levi is processing your upload</span>
            <span className={sty.processingText}>{processingMessage}</span>
            <LinearProgress
              sx={{
                width: '100%', borderRadius: 4, height: 3,
                backgroundColor: 'var(--ls-color-border-light)',
                '& .MuiLinearProgress-bar': { backgroundColor: 'var(--ls-color-brand)' },
              }}
            />
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <div className={sty.tabBar}>
              <button type="button" className={`${sty.tab} ${activeTab === 0 ? sty.tabActive : ''}`} onClick={() => setActiveTab(0)}>
                <PictureAsPdfOutlinedIcon sx={{ fontSize: 15 }} />
                Upload PDF
              </button>
              <button type="button" className={`${sty.tab} ${activeTab === 1 ? sty.tabActive : ''}`} onClick={() => setActiveTab(1)}>
                <LinkOutlinedIcon sx={{ fontSize: 15 }} />
                Paste URL
              </button>
            </div>

            <div className={sty.tabContent}>
              {/* Source input */}
              {activeTab === 0 && (
                !file ? (
                  <div
                    className={`${sty.dropZone} ${dragActive ? sty.dropZoneActive : ''}`}
                    onDragEnter={handleDrag} onDragOver={handleDrag}
                    onDragLeave={handleDrag} onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadFileOutlinedIcon className={sty.dropZoneIcon} />
                    <p className={sty.dropZoneText}>Drop a PDF here or <span className={sty.dropZoneBrowse}>browse</span></p>
                    <p className={sty.dropZoneHint}>Max 10 MB</p>
                    <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={handleFileSelect} style={{ display: 'none' }} />
                  </div>
                ) : (
                  <div className={sty.filePreview}>
                    <InsertDriveFileOutlinedIcon sx={{ fontSize: 24, color: 'var(--ls-color-brand)' }} />
                    <div className={sty.fileInfo}>
                      <p className={sty.fileName}>{file.name}</p>
                      <p className={sty.fileSize}>{formatFileSize(file.size)}</p>
                    </div>
                    <IconButton size="small" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                      <CloseIcon sx={{ fontSize: 14, color: 'var(--ls-color-muted)' }} />
                    </IconButton>
                  </div>
                )
              )}

              {activeTab === 1 && (
                <input
                  type="url"
                  className={sty.textInput}
                  placeholder="https://forms.google.com/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              )}

              {/* Group selector */}
              <div className={sty.fieldGroup}>
                <span className={sty.fieldLabel}>Group</span>
                <div className={sty.groupSelector}>
                  {sortedGroups.map((g) => (
                    <button key={g.id} type="button" className={`${sty.groupChip} ${groupId === g.id ? sty.groupChipSelected : ''}`} onClick={() => setGroupId(g.id)}>
                      {groupId === g.id && <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />}
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional fields */}
              <div className={sty.fieldGroup}>
                <span className={sty.fieldLabel}>Details (optional)</span>
                <input
                  type="text"
                  className={sty.textInput}
                  placeholder="Form name — leave blank for AI suggestion"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
                <textarea
                  className={sty.textArea}
                  placeholder="Description — leave blank for AI suggestion"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      {!importing && (
        <div className={sty.footer}>
          <button type="button" className={sty.cancelBtn} onClick={onClose}>Cancel</button>
          <button type="button" className={`${sty.primaryBtn} ${!canImport ? sty.primaryBtnDisabled : ''}`} onClick={handleImport} disabled={!canImport}>
            <UploadFileOutlinedIcon sx={{ fontSize: 15 }} />
            Import
          </button>
        </div>
      )}
    </Dialog>
  );
}
