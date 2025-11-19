"use client";

import * as React from "react";
import {
  Dialog,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { styled } from "@mui/material/styles";

export interface SyncEmployeesModalProps {
  open: boolean;
  onClose: () => void;
  className?: string;
}

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const levelsetGreen = '#31664a';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

export function SyncEmployeesModal({
  open,
  onClose,
  className = "",
}: SyncEmployeesModalProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  React.useEffect(() => {
    if (!open) {
      setSelectedFile(null);
    }
  }, [open]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          fontFamily,
        },
      }}
      className={className}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "24px",
          borderBottom: "1px solid #e9eaeb",
        }}
      >
        <Typography
          sx={{
            fontFamily,
            fontSize: "20px",
            fontWeight: 600,
            color: "#181d27",
          }}
        >
          Sync Employees
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{
            color: "#6b7280",
            "&:hover": {
              backgroundColor: "#f3f4f6",
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ p: 3 }}>
        <Typography
          sx={{
            fontFamily,
            fontSize: 14,
            color: "#535862",
            mb: 3,
          }}
        >
          Upload an Excel spreadsheet to sync employees. This functionality will be available soon.
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Button
            component="label"
            variant="outlined"
            sx={{
              fontFamily,
              fontSize: 14,
              fontWeight: 500,
              textTransform: "none",
              color: "#6b7280",
              borderColor: "#d1d5db",
              "&:hover": {
                borderColor: "#9ca3af",
                backgroundColor: "#f9fafb",
              },
            }}
          >
            Choose File
            <VisuallyHiddenInput
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
            />
          </Button>
          {selectedFile && (
            <Typography
              sx={{
                fontFamily,
                fontSize: 14,
                color: "#535862",
                mt: 1,
              }}
            >
              Selected: {selectedFile.name}
            </Typography>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 2,
          padding: "16px 24px",
          borderTop: "1px solid #e9eaeb",
        }}
      >
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            fontFamily,
            fontSize: 14,
            fontWeight: 500,
            textTransform: "none",
            backgroundColor: levelsetGreen,
            color: "#ffffff",
            "&:hover": {
              backgroundColor: "#2d5a42",
            },
          }}
        >
          Close
        </Button>
      </Box>
    </Dialog>
  );
}

