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
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import UploadFileIcon from "@mui/icons-material/UploadFile";
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

const UploadArea = styled(Box)(({ theme }) => ({
  border: '2px dashed #d1d5db',
  borderRadius: 12,
  padding: '48px 24px',
  textAlign: 'center',
  backgroundColor: '#f9fafb',
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    borderColor: levelsetGreen,
    backgroundColor: '#f0f9f4',
  },
  '&.drag-over': {
    borderColor: levelsetGreen,
    backgroundColor: '#f0f9f4',
  },
}));

const UploadIconWrapper = styled(Box)(() => ({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: 16,
  '& svg': {
    fontSize: 64,
    color: '#6b7280',
  },
}));

export function SyncEmployeesModal({
  open,
  onClose,
  className = "",
}: SyncEmployeesModalProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setIsDragOver(false);
    }
  }, [open]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
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
        <Box
          component="label"
          sx={{ display: 'block', cursor: 'pointer' }}
        >
          <VisuallyHiddenInput
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
          />
          <UploadArea
            className={isDragOver ? 'drag-over' : ''}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <UploadIconWrapper>
              <CloudUploadIcon />
            </UploadIconWrapper>
            <Typography
              sx={{
                fontFamily,
                fontSize: 16,
                color: "#181d27",
                mb: 3,
              }}
            >
              Drop your content here or
            </Typography>
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              sx={{
                fontFamily,
                fontSize: 14,
                fontWeight: 500,
                textTransform: "none",
                color: "#181d27",
                borderColor: "#d1d5db",
                backgroundColor: "#ffffff",
                "&:hover": {
                  borderColor: levelsetGreen,
                  backgroundColor: "#ffffff",
                  color: levelsetGreen,
                },
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              Upload files
            </Button>
          </UploadArea>
        </Box>
        {selectedFile && (
          <Typography
            sx={{
              fontFamily,
              fontSize: 14,
              color: "#535862",
              mt: 2,
              textAlign: "center",
            }}
          >
            Selected: {selectedFile.name}
          </Typography>
        )}
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

