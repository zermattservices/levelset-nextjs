/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type DeviceWatchDollarIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DeviceWatchDollarIcon(props: DeviceWatchDollarIconProps) {
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
          "M13 18H9a3 3 0 01-3-3V9a3 3 0 013-3h6a3 3 0 013 3v1m3 5h-2.5a1.5 1.5 0 100 3h1a1.5 1.5 0 110 3H17m2 0v1m0-8v1M9 18v3h4M9 6V3h6v3"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default DeviceWatchDollarIcon;
/* prettier-ignore-end */
