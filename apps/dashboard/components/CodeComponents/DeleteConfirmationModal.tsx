"use client";

import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
} from "@mui/material";

export interface DeleteConfirmationModalProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export function DeleteConfirmationModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  className = "",
}: DeleteConfirmationModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          fontFamily,
        },
      }}
      className={className}
    >
      <DialogTitle
        sx={{
          fontFamily,
          fontSize: "18px",
          fontWeight: 600,
          color: "var(--ls-color-neutral-soft-foreground)",
          pb: 1,
        }}
      >
        {title}
      </DialogTitle>
      
      <DialogContent>
        <Typography
          sx={{
            fontFamily,
            fontSize: "14px",
            color: "var(--ls-color-muted)",
            lineHeight: 1.5,
          }}
        >
          {message}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button
          onClick={onCancel}
          sx={{
            fontFamily,
            fontSize: 13,
            textTransform: "none",
            color: "var(--ls-color-muted)",
            borderColor: "var(--ls-color-border)",
            border: "1px solid",
            padding: "6px 16px",
            borderRadius: '8px',
            "&:hover": {
              backgroundColor: "var(--ls-color-muted-soft)",
              borderColor: "var(--ls-color-disabled-text)",
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          sx={{
            fontFamily,
            fontSize: 13,
            textTransform: "none",
            backgroundColor: "#dc2626",
            padding: "6px 16px",
            borderRadius: '8px',
            "&:hover": {
              backgroundColor: "#b91c1c",
            },
          }}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

