import * as React from 'react';
import { useState, useEffect } from 'react';
import sty from './DenyReasonDialog.module.css';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import type { DenialReasonRequestType } from '@/lib/scheduling.types';

interface DenyReasonDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reasonId: string, message: string | null) => void;
  requestType: DenialReasonRequestType;
  orgId: string;
  getAccessToken: () => Promise<string | null>;
}

export function DenyReasonDialog({
  open,
  onClose,
  onConfirm,
  requestType,
  orgId,
  getAccessToken,
}: DenyReasonDialogProps) {
  const [reasons, setReasons] = useState<{ id: string; label: string }[]>([]);
  const [selectedReasonId, setSelectedReasonId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedReasonId('');
    setMessage('');
    const fetchReasons = async () => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(
          `/api/scheduling/denial-reasons?request_type=${requestType}&org_id=${orgId}`,
          { headers }
        );
        if (res.ok) {
          const data = await res.json();
          setReasons(data);
        }
      } catch (err) {
        console.error('Failed to fetch denial reasons:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReasons();
  }, [open, requestType, orgId, getAccessToken]);

  function handleConfirm() {
    onConfirm(selectedReasonId, message.trim() || null);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      sx={{
        '& .MuiDialogTitle-root': {
          fontFamily: 'var(--ls-font-heading)',
          fontWeight: 700,
          fontSize: '16px',
        },
        '& .MuiFormControlLabel-label': {
          fontFamily: 'var(--ls-font-body)',
          fontSize: '14px',
        },
      }}
    >
      <DialogTitle>Deny Request</DialogTitle>
      <DialogContent>
        <div className={sty.dialogContent}>
          {loading ? (
            <div className={sty.reasonsLoading}>
              <CircularProgress size={24} />
            </div>
          ) : (
            <RadioGroup
              value={selectedReasonId}
              onChange={(e) => setSelectedReasonId(e.target.value)}
            >
              {reasons.map((reason) => (
                <FormControlLabel
                  key={reason.id}
                  value={reason.id}
                  control={<Radio />}
                  label={reason.label}
                />
              ))}
            </RadioGroup>
          )}
          <TextField
            label="Message to employee (optional)"
            placeholder="Explain why this request was denied..."
            multiline
            rows={3}
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          className={sty.denyButton}
          onClick={handleConfirm}
          disabled={!selectedReasonId}
          variant="contained"
        >
          Deny
        </Button>
      </DialogActions>
    </Dialog>
  );
}
