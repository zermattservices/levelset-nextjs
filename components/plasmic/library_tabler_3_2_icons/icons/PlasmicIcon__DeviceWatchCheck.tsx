/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type DeviceWatchCheckIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DeviceWatchCheckIcon(props: DeviceWatchCheckIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M11 18H9a3 3 0 01-3-3V9a3 3 0 013-3h6a3 3 0 013 3v5.5M9 18v3h2.5M9 6V3h6v3m0 13l2 2 4-4"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default DeviceWatchCheckIcon;
/* prettier-ignore-end */
