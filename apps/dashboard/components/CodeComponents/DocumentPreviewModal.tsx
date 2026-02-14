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
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

const fontFamily =
  '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export interface PreviewDocument {
  url: string;
  file_name: string;
  file_type: string;
}

export interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  documents: PreviewDocument[];
  initialIndex?: number;
}

function isImageType(type: string): boolean {
  return type.startsWith("image/");
}

function isPdfType(type: string): boolean {
  return type === "application/pdf";
}

export function DocumentPreviewModal({
  open,
  onClose,
  documents,
  initialIndex = 0,
}: DocumentPreviewModalProps) {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

  // Reset index when modal opens or initialIndex changes
  React.useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
    }
  }, [open, initialIndex]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      } else if (
        e.key === "ArrowRight" &&
        currentIndex < documents.length - 1
      ) {
        setCurrentIndex((prev) => prev + 1);
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, currentIndex, documents.length, onClose]);

  if (!documents.length) return null;

  const doc = documents[currentIndex] || documents[0];
  const hasMultiple = documents.length > 1;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          backgroundColor: "#1a1a1a",
          borderRadius: "12px",
          maxHeight: "90vh",
          overflow: "hidden",
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: "rgba(0,0,0,0.85)",
          },
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: "10px",
          px: "16px",
          borderBottom: "1px solid #333",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily,
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {doc.file_name}
          </Typography>
          {hasMultiple && (
            <Typography
              sx={{
                fontFamily,
                fontSize: 12,
                fontWeight: 500,
                color: "var(--ls-color-disabled-text)",
                flexShrink: 0,
              }}
            >
              {currentIndex + 1} of {documents.length}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
          {/* Download */}
          <IconButton
            component="a"
            href={doc.url}
            download={doc.file_name}
            target="_blank"
            rel="noopener noreferrer"
            size="small"
            sx={{ color: "var(--ls-color-disabled-text)", "&:hover": { color: "#fff" } }}
          >
            <DownloadIcon sx={{ fontSize: 18 }} />
          </IconButton>
          {/* Close */}
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ color: "var(--ls-color-disabled-text)", "&:hover": { color: "#fff" } }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Body */}
      <Box
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "400px",
          maxHeight: "calc(90vh - 60px)",
          overflow: "hidden",
        }}
      >
        {/* Left Arrow */}
        {hasMultiple && currentIndex > 0 && (
          <IconButton
            onClick={() => setCurrentIndex((prev) => prev - 1)}
            sx={{
              position: "absolute",
              left: 8,
              zIndex: 2,
              color: "#fff",
              backgroundColor: "rgba(0,0,0,0.5)",
              "&:hover": { backgroundColor: "rgba(0,0,0,0.7)" },
            }}
          >
            <ArrowBackIosNewIcon sx={{ fontSize: 20 }} />
          </IconButton>
        )}

        {/* Content */}
        {isImageType(doc.file_type) ? (
          <img
            src={doc.url}
            alt={doc.file_name}
            style={{
              maxWidth: "100%",
              maxHeight: "calc(90vh - 60px)",
              objectFit: "contain",
              display: "block",
            }}
          />
        ) : isPdfType(doc.file_type) ? (
          <Box
            sx={{
              width: "100%",
              height: "calc(90vh - 60px)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <iframe
              src={doc.url}
              title={doc.file_name}
              style={{
                width: "100%",
                flex: 1,
                border: "none",
              }}
            />
            {/* Fallback for when iframe doesn't render PDFs */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                py: "8px",
                borderTop: "1px solid #333",
              }}
            >
              <Button
                component="a"
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<OpenInNewIcon />}
                sx={{
                  fontFamily,
                  fontSize: 13,
                  color: "var(--ls-color-disabled-text)",
                  textTransform: "none",
                  "&:hover": { color: "#fff" },
                }}
              >
                Open in new tab
              </Button>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              p: "40px",
            }}
          >
            <Typography
              sx={{ fontFamily, fontSize: 14, color: "var(--ls-color-disabled-text)" }}
            >
              Preview not available for this file type
            </Typography>
            <Button
              component="a"
              href={doc.url}
              download={doc.file_name}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              startIcon={<DownloadIcon />}
              sx={{
                fontFamily,
                fontSize: 13,
                color: "#fff",
                borderColor: "#555",
                textTransform: "none",
                "&:hover": { borderColor: "#fff" },
              }}
            >
              Download file
            </Button>
          </Box>
        )}

        {/* Right Arrow */}
        {hasMultiple && currentIndex < documents.length - 1 && (
          <IconButton
            onClick={() => setCurrentIndex((prev) => prev + 1)}
            sx={{
              position: "absolute",
              right: 8,
              zIndex: 2,
              color: "#fff",
              backgroundColor: "rgba(0,0,0,0.5)",
              "&:hover": { backgroundColor: "rgba(0,0,0,0.7)" },
            }}
          >
            <ArrowForwardIosIcon sx={{ fontSize: 20 }} />
          </IconButton>
        )}
      </Box>
    </Dialog>
  );
}

export default DocumentPreviewModal;
