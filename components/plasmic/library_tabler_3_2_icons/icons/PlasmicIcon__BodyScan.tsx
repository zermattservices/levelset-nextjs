/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type BodyScanIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BodyScanIcon(props: BodyScanIconProps) {
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
          "M4 8V6a2 2 0 012-2h2M4 16v2a2 2 0 002 2h2m8-16h2a2 2 0 012 2v2m-4 12h2a2 2 0 002-2v-2m-9-8a1 1 0 102 0 1 1 0 00-2 0zm-1 9v-1a2 2 0 014 0v1m-6-7c.666.666 1.334 1 2 1h4c.666 0 1.334-.334 2-1m-4 1v3"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default BodyScanIcon;
/* prettier-ignore-end */
