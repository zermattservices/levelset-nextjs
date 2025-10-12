/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ZoomPanIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ZoomPanIcon(props: ZoomPanIconProps) {
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
          "M9 12a3 3 0 106 0 3 3 0 00-6 0zm8 5l-2.5-2.5M10 4l2-2 2 2m6 6l2 2-2 2M4 10l-2 2 2 2m6 6l2 2 2-2"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default ZoomPanIcon;
/* prettier-ignore-end */
