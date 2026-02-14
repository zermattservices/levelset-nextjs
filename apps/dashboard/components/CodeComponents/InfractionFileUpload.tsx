"use client";

import * as React from "react";
import { Box, Typography, IconButton, CircularProgress } from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import type { InfractionDocument } from "@/lib/supabase.types";

const fontFamily =
  '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const levelsetGreen = "#31664a";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
  "application/pdf",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface InfractionFileUploadProps {
  existingDocuments: InfractionDocument[];
  stagedFiles: File[];
  onStagedFilesChange: (files: File[]) => void;
  onRemoveExisting: (docId: string) => void;
  onPreview: (doc: InfractionDocument | File, index: number) => void;
  maxFiles?: number;
  disabled?: boolean;
  uploading?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageType(type: string): boolean {
  return type.startsWith("image/");
}

export function InfractionFileUpload({
  existingDocuments,
  stagedFiles,
  onStagedFilesChange,
  onRemoveExisting,
  onPreview,
  maxFiles = 5,
  disabled = false,
  uploading = false,
}: InfractionFileUploadProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const totalCount = existingDocuments.length + stagedFiles.length;
  const canAddMore = totalCount < maxFiles && !disabled;

  // Create stable object URLs for staged files
  const stagedPreviews = React.useMemo(() => {
    return stagedFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
  }, [stagedFiles]);

  // Revoke URLs on cleanup
  React.useEffect(() => {
    return () => {
      stagedPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [stagedPreviews]);

  const validateAndAddFiles = React.useCallback(
    (newFiles: FileList | File[]) => {
      setError(null);
      const filesToAdd: File[] = [];
      const remaining = maxFiles - totalCount;

      for (let i = 0; i < Math.min(newFiles.length, remaining); i++) {
        const file = newFiles[i];

        if (!ALLOWED_TYPES.includes(file.type)) {
          setError("Only JPEG, PNG, HEIC, WebP, and PDF files are allowed");
          continue;
        }

        if (file.size > MAX_FILE_SIZE) {
          setError("Files must be under 10MB");
          continue;
        }

        filesToAdd.push(file);
      }

      if (newFiles.length > remaining && remaining > 0) {
        setError(`Only ${remaining} more file(s) can be added`);
      } else if (remaining <= 0) {
        setError(`Maximum of ${maxFiles} files reached`);
      }

      if (filesToAdd.length > 0) {
        onStagedFilesChange([...stagedFiles, ...filesToAdd]);
      }
    },
    [maxFiles, totalCount, stagedFiles, onStagedFilesChange]
  );

  const handleFileSelect = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        validateAndAddFiles(e.target.files);
      }
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [validateAndAddFiles]
  );

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled || !canAddMore) return;
      if (e.dataTransfer.files.length > 0) {
        validateAndAddFiles(e.dataTransfer.files);
      }
    },
    [disabled, canAddMore, validateAndAddFiles]
  );

  const handleDragOver = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled && canAddMore) {
        setDragOver(true);
      }
    },
    [disabled, canAddMore]
  );

  const handleDragLeave = React.useCallback(() => {
    setDragOver(false);
  }, []);

  const removeStagedFile = React.useCallback(
    (index: number) => {
      const updated = [...stagedFiles];
      updated.splice(index, 1);
      onStagedFilesChange(updated);
      setError(null);
    },
    [stagedFiles, onStagedFilesChange]
  );

  return (
    <Box>
      {/* Section Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          mb: "8px",
        }}
      >
        <AttachFileIcon
          sx={{ fontSize: 16, color: "#6b7280", transform: "rotate(45deg)" }}
        />
        <Typography
          sx={{
            fontFamily,
            fontSize: 13,
            fontWeight: 600,
            color: "#374151",
          }}
        >
          Attachments
        </Typography>
        <Typography
          sx={{
            fontFamily,
            fontSize: 12,
            fontWeight: 500,
            color: "#9ca3af",
          }}
        >
          ({totalCount}/{maxFiles})
        </Typography>
        {uploading && <CircularProgress size={14} sx={{ color: levelsetGreen, ml: "4px" }} />}
      </Box>

      {/* Thumbnail Grid */}
      {totalCount > 0 && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
            gap: "8px",
            mb: "8px",
          }}
        >
          {/* Existing Documents */}
          {existingDocuments.map((doc, idx) => (
            <Box
              key={doc.id}
              sx={{
                position: "relative",
                width: "100%",
                paddingBottom: "100%",
                borderRadius: "8px",
                overflow: "hidden",
                border: "1px solid #e5e7eb",
                cursor: "pointer",
                "&:hover": {
                  borderColor: levelsetGreen,
                  "& .remove-btn": { opacity: 1 },
                },
              }}
              onClick={() => onPreview(doc, idx)}
            >
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#f9fafb",
                }}
              >
                {isImageType(doc.file_type) && doc.url ? (
                  <img
                    src={doc.url}
                    alt={doc.file_name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "2px",
                      p: "4px",
                    }}
                  >
                    <PictureAsPdfIcon
                      sx={{ fontSize: 28, color: "#ef4444" }}
                    />
                    <Typography
                      sx={{
                        fontFamily,
                        fontSize: 9,
                        color: "#6b7280",
                        textAlign: "center",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "100%",
                        px: "2px",
                      }}
                    >
                      {doc.file_name}
                    </Typography>
                  </Box>
                )}
              </Box>
              {!disabled && (
                <IconButton
                  className="remove-btn"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveExisting(doc.id);
                  }}
                  sx={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    opacity: 0,
                    transition: "opacity 0.15s",
                    backgroundColor: "rgba(0,0,0,0.5)",
                    color: "#fff",
                    width: 20,
                    height: 20,
                    "&:hover": {
                      backgroundColor: "rgba(0,0,0,0.7)",
                    },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 12 }} />
                </IconButton>
              )}
            </Box>
          ))}

          {/* Staged Files */}
          {stagedPreviews.map(({ file, url }, idx) => (
            <Box
              key={`staged-${idx}`}
              sx={{
                position: "relative",
                width: "100%",
                paddingBottom: "100%",
                borderRadius: "8px",
                overflow: "hidden",
                border: "1px solid #e5e7eb",
                cursor: "pointer",
                "&:hover": {
                  borderColor: levelsetGreen,
                  "& .remove-btn": { opacity: 1 },
                },
              }}
              onClick={() => onPreview(file, existingDocuments.length + idx)}
            >
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#f9fafb",
                }}
              >
                {isImageType(file.type) ? (
                  <img
                    src={url}
                    alt={file.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "2px",
                      p: "4px",
                    }}
                  >
                    <PictureAsPdfIcon
                      sx={{ fontSize: 28, color: "#ef4444" }}
                    />
                    <Typography
                      sx={{
                        fontFamily,
                        fontSize: 9,
                        color: "#6b7280",
                        textAlign: "center",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "100%",
                        px: "2px",
                      }}
                    >
                      {file.name}
                    </Typography>
                  </Box>
                )}
              </Box>
              {/* "New" badge */}
              <Box
                sx={{
                  position: "absolute",
                  bottom: 2,
                  left: 2,
                  backgroundColor: levelsetGreen,
                  color: "#fff",
                  borderRadius: "4px",
                  px: "4px",
                  py: "1px",
                }}
              >
                <Typography sx={{ fontFamily, fontSize: 8, fontWeight: 700 }}>
                  NEW
                </Typography>
              </Box>
              <IconButton
                className="remove-btn"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  removeStagedFile(idx);
                }}
                sx={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  opacity: 0,
                  transition: "opacity 0.15s",
                  backgroundColor: "rgba(0,0,0,0.5)",
                  color: "#fff",
                  width: 20,
                  height: 20,
                  "&:hover": {
                    backgroundColor: "rgba(0,0,0,0.7)",
                  },
                }}
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {/* Drop Zone / Add Button */}
      {canAddMore && (
        <Box
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          sx={{
            border: dragOver
              ? `2px dashed ${levelsetGreen}`
              : "2px dashed #e5e7eb",
            borderRadius: "8px",
            padding: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            cursor: "pointer",
            backgroundColor: dragOver ? "rgba(49,102,74,0.04)" : "transparent",
            transition: "all 0.15s ease",
            "&:hover": {
              borderColor: levelsetGreen,
              backgroundColor: "rgba(49,102,74,0.04)",
            },
          }}
        >
          <AddPhotoAlternateIcon
            sx={{
              fontSize: 18,
              color: dragOver ? levelsetGreen : "#9ca3af",
            }}
          />
          <Typography
            sx={{
              fontFamily,
              fontSize: 13,
              fontWeight: 500,
              color: dragOver ? levelsetGreen : "#9ca3af",
            }}
          >
            {totalCount === 0
              ? "Add file or drop here"
              : "Add another file"}
          </Typography>
        </Box>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/webp,application/pdf"
        multiple
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      {/* Error Message */}
      {error && (
        <Typography
          sx={{
            fontFamily,
            fontSize: 12,
            color: "#ef4444",
            mt: "6px",
          }}
        >
          {error}
        </Typography>
      )}
    </Box>
  );
}

export default InfractionFileUpload;
