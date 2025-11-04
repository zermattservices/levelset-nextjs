"use client";

import * as React from "react";
import { Drawer, IconButton, Box, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export interface MuiDrawerV2Props {
  // Core props
  open?: boolean;
  onClose?: (event: React.MouseEvent | React.KeyboardEvent) => void;
  onOpenChange?: (open: boolean) => void;
  
  // Content props - using slots for Plasmic
  title?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  extra?: React.ReactNode;
  closeIcon?: React.ReactNode;
  
  // Layout props
  placement?: "top" | "right" | "bottom" | "left";
  size?: "default" | "large";
  width?: string | number;
  height?: string | number;
  
  // Behavior props
  mask?: boolean;
  maskClosable?: boolean;
  keyboard?: boolean;
  destroyOnClose?: boolean;
  forceRender?: boolean;
  autoFocus?: boolean;
  closable?: boolean;
  
  // Styling props
  className?: string;
  rootClassName?: string;
  style?: React.CSSProperties;
  rootStyle?: React.CSSProperties;
  headerStyle?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
  footerStyle?: React.CSSProperties;
  maskStyle?: React.CSSProperties;
  contentWrapperStyle?: React.CSSProperties;
  zIndex?: number;
  
  // Advanced props
  getContainer?: HTMLElement | (() => HTMLElement) | string | false;
  afterOpenChange?: (open: boolean) => void;
  push?: boolean | { distance: string | number };
  
  // Plasmic-specific props
  defaultStylesClassName?: string;
  drawerScopeClassName?: string;
  
  // Plasmic class name props for styling
  drawerHeaderClassName?: string;
  drawerBodyClassName?: string;
  drawerFooterClassName?: string;
  drawerTitleClassName?: string;
  drawerMaskClassName?: string;
  drawerContentWrapperClassName?: string;
  closeButtonClassName?: string;
}

export function MuiDrawerV2(props: MuiDrawerV2Props) {
  const {
    open = false,
    onClose,
    onOpenChange,
    title,
    children,
    footer,
    extra,
    closeIcon,
    placement = "right",
    size = "default",
    width,
    height,
    mask = true,
    maskClosable = true,
    keyboard = true,
    destroyOnClose = false,
    autoFocus = true,
    closable = true,
    className,
    rootClassName,
    style,
    rootStyle,
    headerStyle,
    bodyStyle,
    footerStyle,
    maskStyle,
    contentWrapperStyle,
    zIndex = 1000,
    afterOpenChange,
    drawerHeaderClassName,
    drawerBodyClassName,
    drawerFooterClassName,
    drawerTitleClassName,
    drawerMaskClassName,
    drawerContentWrapperClassName,
    closeButtonClassName,
  } = props;

  // Calculate drawer width/height based on size prop
  const drawerWidth = React.useMemo(() => {
    if (width) return width;
    if (placement === "top" || placement === "bottom") return "auto";
    return size === "large" ? 736 : 378;
  }, [width, placement, size]);

  const drawerHeight = React.useMemo(() => {
    if (height) return height;
    if (placement === "left" || placement === "right") return "100%";
    return size === "large" ? 736 : 378;
  }, [height, placement, size]);

  // Handle close event
  const handleClose = React.useCallback((event: React.MouseEvent | React.KeyboardEvent, reason?: "backdropClick" | "escapeKeyDown") => {
    if (reason === "backdropClick" && !maskClosable) return;
    if (reason === "escapeKeyDown" && !keyboard) return;
    
    onClose?.(event);
    onOpenChange?.(false);
  }, [onClose, onOpenChange, maskClosable, keyboard]);

  // Handle after open/close transitions
  React.useEffect(() => {
    if (afterOpenChange) {
      afterOpenChange(open);
    }
  }, [open, afterOpenChange]);

  // Render drawer content (only if not destroyOnClose or drawer is open)
  const shouldRenderContent = !destroyOnClose || open;

  return (
    <Drawer
      open={open}
      onClose={(event, reason) => handleClose(event as React.KeyboardEvent, reason)}
      anchor={placement}
      className={`${rootClassName || ""} ${drawerScopeClassName || ""}`}
      sx={{
        zIndex,
        ...rootStyle,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          height: drawerHeight,
          ...contentWrapperStyle,
        },
      }}
      ModalProps={{
        keepMounted: !destroyOnClose,
        hideBackdrop: !mask,
        slotProps: {
          backdrop: {
            sx: maskStyle,
            className: drawerMaskClassName,
          },
        },
      }}
      transitionDuration={300}
    >
      <Box
        className={className}
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          ...style,
        }}
      >
        {/* Header */}
        {(title || closable || extra) && (
          <Box
            className={drawerHeaderClassName}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 24px",
              borderBottom: "1px solid #f0f0f0",
              ...headerStyle,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
              {title && (
                <Typography
                  variant="h6"
                  component="div"
                  className={drawerTitleClassName}
                  sx={{ fontSize: "16px", fontWeight: 600, lineHeight: "22px" }}
                >
                  {title}
                </Typography>
              )}
              {extra && <Box>{extra}</Box>}
            </Box>
            {closable && (
              <IconButton
                onClick={(e) => handleClose(e)}
                className={closeButtonClassName}
                size="small"
                sx={{
                  marginLeft: "auto",
                  "&:hover": {
                    backgroundColor: "rgba(0, 0, 0, 0.04)",
                  },
                }}
              >
                {closeIcon || <CloseIcon />}
              </IconButton>
            )}
          </Box>
        )}

        {/* Body */}
        {shouldRenderContent && (
          <Box
            className={drawerBodyClassName}
            sx={{
              flex: 1,
              padding: "24px",
              overflow: "auto",
              ...bodyStyle,
            }}
          >
            {children}
          </Box>
        )}

        {/* Footer */}
        {footer && (
          <Box
            className={drawerFooterClassName}
            sx={{
              padding: "10px 16px",
              borderTop: "1px solid #f0f0f0",
              ...footerStyle,
            }}
          >
            {footer}
          </Box>
        )}
      </Box>
    </Drawer>
  );
}

