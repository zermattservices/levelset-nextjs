/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type FileTypeSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FileTypeSvgIcon(props: FileTypeSvgIconProps) {
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
        d={"M14 3v4a1 1 0 001 1h4"}
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M5 12V5a2 2 0 012-2h7l5 5v4M4 20.25c0 .414.336.75.75.75H6a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 01-1-1v-1a1 1 0 011-1h1.25a.75.75 0 01.75.75m3-.75l2 6 2-6m6 0h-1a2 2 0 00-2 2v2a2 2 0 002 2h1v-3"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default FileTypeSvgIcon;
/* prettier-ignore-end */
