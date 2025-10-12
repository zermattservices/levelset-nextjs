/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type BorderTopPlusIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BorderTopPlusIcon(props: BorderTopPlusIconProps) {
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
          "M4 4h16M4 8v.01M20 8v.01M4 12v.01M20 12v.01M4 16v.01M15 12H9m3-3v6m8 1v.01M4 20v.01M8 20v.01m4-.01v.01m4-.01v.01m4-.01v.01"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default BorderTopPlusIcon;
/* prettier-ignore-end */
