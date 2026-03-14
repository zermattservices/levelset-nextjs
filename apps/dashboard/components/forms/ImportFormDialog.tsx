// apps/dashboard/components/forms/ImportFormDialog.tsx

import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  MenuItem,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Tab,
  Tabs,
  LinearProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import {
  StyledTextField,
  StyledSelect,
  inputLabelSx,
  dialogPaperSx,
  dialogTitleSx,
  dialogContentSx,
  dialogActionsSx,
  cancelButtonSx,
  primaryButtonSx,
  menuItemSx,
  alertSx,
  fontFamily,
} from './dialogStyles';
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

const FORM_TYPE_OPTIONS: { value: FormType; label: string }[] = [
  { value: 'custom', label: 'Custom' },
  { value: 'rating', label: 'Rating' },
  { value: 'discipline', label: 'Discipline' },
  { value: 'evaluation', label: 'Evaluation' },
];

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
  const [formType, setFormType] = React.useState<FormType>('custom');
  const [url, setUrl] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [processingMessage, setProcessingMessage] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) {
      setActiveTab(0);
      setFormName('');
      setDescription('');
      setGroupId('');
      setFormType('custom');
      setUrl('');
      setFile(null);
      setError('');
      setImporting(false);
      setProcessingMessage('');
    }
  }, [open]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      if (droppedFile.size > 10 * 1024 * 1024) {
        setError('File size must be under 10 MB.');
        return;
      }
      setFile(droppedFile);
      setError('');
    } else {
      setError('Please upload a PDF file.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please upload a PDF file.');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be under 10 MB.');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleImport = async () => {
    setError('');

    if (!groupId) {
      setError('Please select a form group.');
      return;
    }
    if (activeTab === 0 && !file) {
      setError('Please upload a PDF file.');
      return;
    }
    if (activeTab === 1 && !url.trim()) {
      setError('Please enter a URL.');
      return;
    }

    setImporting(true);
    setProcessingMessage('Analyzing form structure...');

    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let body: Record<string, any>;

      if (activeTab === 0 && file) {
        setProcessingMessage('Reading PDF...');
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        );

        setProcessingMessage('Parsing form with AI...');
        body = {
          source_type: 'pdf',
          file_data: base64,
          file_media_type: 'application/pdf',
          name: formName || undefined,
          description: description || undefined,
          group_id: groupId,
          form_type: formType,
          org_id: orgId,
        };
      } else {
        setProcessingMessage('Fetching form page...');
        body = {
          source_type: 'url',
          url: url.trim(),
          name: formName || undefined,
          description: description || undefined,
          group_id: groupId,
          form_type: formType,
          org_id: orgId,
        };
      }

      const res = await fetch('/api/forms/import', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setProcessingMessage('Form created! Opening editor...');
      onImported(data.slug || data.id);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setImporting(false);
      setProcessingMessage('');
    }
  };

  const canImport =
    groupId &&
    ((activeTab === 0 && file) || (activeTab === 1 && url.trim())) &&
    !importing;

  return (
    <Dialog
      open={open}
      onClose={importing ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: dialogPaperSx }}
    >
      <DialogTitle sx={dialogTitleSx}>
        Import Form
        <IconButton
          size="small"
          onClick={onClose}
          disabled={importing}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={dialogContentSx}>
        {error && (
          <Alert severity="error" sx={alertSx}>
            {error}
          </Alert>
        )}

        {importing ? (
          <div className={sty.processingState}>
            <CircularProgress size={40} sx={{ color: 'var(--ls-color-brand)' }} />
            <p className={sty.processingText}>{processingMessage}</p>
            <LinearProgress
              sx={{
                width: '100%',
                borderRadius: 4,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: 'var(--ls-color-brand)',
                },
              }}
            />
          </div>
        ) : (
          <>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{
                minHeight: 36,
                '& .MuiTabs-indicator': {
                  backgroundColor: 'var(--ls-color-brand)',
                },
                '& .MuiTab-root': {
                  fontFamily,
                  fontSize: 13,
                  fontWeight: 500,
                  textTransform: 'none',
                  minHeight: 36,
                  padding: '6px 16px',
                  color: 'var(--ls-color-muted)',
                  '&.Mui-selected': {
                    color: 'var(--ls-color-brand)',
                    fontWeight: 600,
                  },
                },
              }}
            >
              <Tab
                icon={<PictureAsPdfOutlinedIcon sx={{ fontSize: 16 }} />}
                iconPosition="start"
                label="Upload PDF"
              />
              <Tab
                icon={<LinkOutlinedIcon sx={{ fontSize: 16 }} />}
                iconPosition="start"
                label="Paste URL"
              />
            </Tabs>

            <div className={sty.tabContent}>
              {activeTab === 0 && (
                <>
                  {!file ? (
                    <div
                      className={`${sty.dropZone} ${dragActive ? sty.dropZoneActive : ''}`}
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadFileOutlinedIcon className={sty.dropZoneIcon} />
                      <p className={sty.dropZoneText}>
                        Drag & drop a PDF here, or{' '}
                        <span className={sty.dropZoneBrowse}>browse</span>
                      </p>
                      <p className={sty.dropZoneHint}>PDF only, max 10 MB</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                      />
                    </div>
                  ) : (
                    <div className={sty.filePreview}>
                      <InsertDriveFileOutlinedIcon
                        sx={{ fontSize: 28, color: 'var(--ls-color-brand)' }}
                      />
                      <div className={sty.fileInfo}>
                        <p className={sty.fileName}>{file.name}</p>
                        <p className={sty.fileSize}>{formatFileSize(file.size)}</p>
                      </div>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </div>
                  )}
                </>
              )}

              {activeTab === 1 && (
                <StyledTextField
                  size="small"
                  label="Form URL"
                  placeholder="https://forms.google.com/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  fullWidth
                  InputLabelProps={{ sx: inputLabelSx }}
                />
              )}
            </div>

            <FormControl fullWidth size="small">
              <InputLabel sx={inputLabelSx}>Form Group *</InputLabel>
              <StyledSelect
                value={groupId}
                onChange={(e) => setGroupId(e.target.value as string)}
                label="Form Group *"
              >
                {groups.map((g) => (
                  <MenuItem key={g.id} value={g.id} sx={menuItemSx}>
                    {g.name}
                  </MenuItem>
                ))}
              </StyledSelect>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel sx={inputLabelSx}>Form Type *</InputLabel>
              <StyledSelect
                value={formType}
                onChange={(e) => setFormType(e.target.value as FormType)}
                label="Form Type *"
              >
                {FORM_TYPE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value} sx={menuItemSx}>
                    {opt.label}
                  </MenuItem>
                ))}
              </StyledSelect>
            </FormControl>

            <StyledTextField
              size="small"
              label="Form Name (optional)"
              placeholder="Leave blank to use AI-suggested name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              fullWidth
              InputLabelProps={{ sx: inputLabelSx }}
            />

            <StyledTextField
              size="small"
              label="Description (optional)"
              placeholder="Leave blank to use AI-suggested description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              InputLabelProps={{ shrink: true, sx: inputLabelSx }}
            />
          </>
        )}
      </DialogContent>

      {!importing && (
        <DialogActions sx={dialogActionsSx}>
          <Button onClick={onClose} sx={cancelButtonSx}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={!canImport}
            startIcon={
              <UploadFileOutlinedIcon sx={{ fontSize: 16 }} />
            }
            sx={primaryButtonSx}
          >
            Import
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
