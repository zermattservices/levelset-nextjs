/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Signal4GPlusIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Signal4GPlusIcon(props: Signal4GPlusIconProps) {
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
          "M17 12h4M3 8v3a1 1 0 001 1h3m0-4v8m12-6v4m-5-6h-2a2 2 0 00-2 2v4a2 2 0 002 2h2v-4h-1"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default Signal4GPlusIcon;
/* prettier-ignore-end */
