"use client";

import * as React from "react";
import { AntdDrawer } from "@plasmicpkgs/antd5/skinny/registerDrawer";

export interface DrawerV2Props {
  // Core props
  open?: boolean;
  onClose?: (e: React.MouseEvent | React.KeyboardEvent) => void;
  onOpenChange?: (open: boolean) => void;
  
  // Content props - using slots for Plasmic
  title?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  extra?: React.ReactNode;
  closeIcon?: React.ReactNode;
  
  // Layout props - ADDED: size and width/height props missing from Plasmic's default Drawer
  placement?: "top" | "right" | "bottom" | "left";
  size?: "default" | "large";
  width?: string | number;
  height?: string | number;
  
  // Behavior props - ADDED: extended behavior controls
  mask?: boolean;
  maskClosable?: boolean;
  keyboard?: boolean;
  destroyOnClose?: boolean;
  forceRender?: boolean;
  autoFocus?: boolean;
  closable?: boolean;
  
  // Styling props - ADDED: all style customization props
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
  
  // Plasmic-specific props (from AntdDrawer)
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

export function DrawerV2(props: DrawerV2Props) {
  const {
    // Extract our custom props
    size,
    width,
    height,
    mask,
    maskClosable,
    keyboard,
    destroyOnClose,
    autoFocus,
    closable,
    style,
    rootStyle,
    headerStyle,
    bodyStyle,
    footerStyle,
    maskStyle,
    contentWrapperStyle,
    zIndex,
    getContainer,
    afterOpenChange,
    push,
    // Pass through all other props to AntdDrawer
    ...antdDrawerProps
  } = props;

  // Build the classNames object for Ant Design's semantic structure
  const classNames = React.useMemo(() => ({
    header: props.drawerHeaderClassName,
    body: props.drawerBodyClassName,
    footer: props.drawerFooterClassName,
    mask: props.drawerMaskClassName,
    wrapper: props.drawerContentWrapperClassName,
  }), [
    props.drawerHeaderClassName,
    props.drawerBodyClassName,
    props.drawerFooterClassName,
    props.drawerMaskClassName,
    props.drawerContentWrapperClassName,
  ]);

  // Build the styles object for Ant Design's semantic structure
  const styles = React.useMemo(() => ({
    header: headerStyle,
    body: bodyStyle,
    footer: footerStyle,
    mask: maskStyle,
    wrapper: contentWrapperStyle,
  }), [headerStyle, bodyStyle, footerStyle, maskStyle, contentWrapperStyle]);

  return (
    <AntdDrawer
      {...antdDrawerProps}
      // Add the missing size prop
      size={size}
      // Add width/height props
      width={width}
      height={height}
      // Add behavior props
      mask={mask}
      maskClosable={maskClosable}
      keyboard={keyboard}
      destroyOnClose={destroyOnClose}
      autoFocus={autoFocus}
      closable={closable}
      // Add styling props
      style={style}
      rootStyle={rootStyle}
      zIndex={zIndex}
      // Add advanced props
      getContainer={getContainer}
      afterOpenChange={afterOpenChange}
      push={push}
      // Add semantic structure styling
      classNames={classNames}
      styles={styles}
    />
  );
}
