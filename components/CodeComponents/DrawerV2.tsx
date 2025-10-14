import * as React from "react";
import { Drawer } from "antd";
import type { DrawerProps } from "antd";

export interface DrawerV2Props {
  // Core props
  open?: boolean;
  onClose?: (e: React.MouseEvent | React.KeyboardEvent) => void;
  
  // Content props
  title?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  extra?: React.ReactNode;
  
  // Layout props
  placement?: "top" | "right" | "bottom" | "left";
  size?: "default" | "large";
  width?: string | number;
  height?: string | number;
  
  // Behavior props
  mask?: boolean;
  maskClosable?: boolean;
  keyboard?: boolean;
  destroyOnHidden?: boolean;
  forceRender?: boolean;
  autoFocus?: boolean;
  loading?: boolean;
  
  // Styling props
  className?: string;
  rootClassName?: string;
  style?: React.CSSProperties;
  rootStyle?: React.CSSProperties;
  headerStyle?: React.CSSProperties;
  zIndex?: number;
  
  // Advanced props
  getContainer?: HTMLElement | (() => HTMLElement) | string | false;
  closeIcon?: React.ReactNode;
  drawerRender?: (node: React.ReactNode) => React.ReactNode;
  afterOpenChange?: (open: boolean) => void;
  push?: boolean | { distance: string | number };
  
  // Semantic structure styling
  classNames?: {
    mask?: string;
    content?: string;
    header?: string;
    body?: string;
    footer?: string;
  };
  styles?: {
    mask?: React.CSSProperties;
    content?: React.CSSProperties;
    header?: React.CSSProperties;
    body?: React.CSSProperties;
    footer?: React.CSSProperties;
  };
}

export function DrawerV2({
  open = false,
  onClose,
  title,
  children,
  footer,
  extra,
  placement = "right",
  size = "default",
  width,
  height,
  mask = true,
  maskClosable = true,
  keyboard = true,
  destroyOnHidden = false,
  forceRender = false,
  autoFocus = true,
  loading = false,
  className,
  rootClassName,
  style,
  rootStyle,
  headerStyle,
  zIndex = 1000,
  getContainer = "body",
  closeIcon,
  drawerRender,
  afterOpenChange,
  push = { distance: 180 },
  classNames,
  styles,
}: DrawerV2Props) {
  
  const handleClose = React.useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    onClose?.(e);
  }, [onClose]);

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title={title}
      footer={footer}
      extra={extra}
      placement={placement}
      size={size}
      width={width}
      height={height}
      mask={mask}
      maskClosable={maskClosable}
      keyboard={keyboard}
      destroyOnClose={destroyOnHidden}
      forceRender={forceRender}
      autoFocus={autoFocus}
      loading={loading}
      className={className}
      rootClassName={rootClassName}
      style={style}
      rootStyle={rootStyle}
      headerStyle={headerStyle}
      zIndex={zIndex}
      getContainer={getContainer}
      closeIcon={closeIcon}
      drawerRender={drawerRender}
      afterOpenChange={afterOpenChange}
      push={push}
      classNames={classNames}
      styles={styles}
    >
      {children}
    </Drawer>
  );
}
