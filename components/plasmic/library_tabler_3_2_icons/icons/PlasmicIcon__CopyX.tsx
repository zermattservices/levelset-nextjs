/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type CopyXIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CopyXIcon(props: CopyXIconProps) {
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
          "M7 9.667A2.667 2.667 0 019.667 7h8.666A2.667 2.667 0 0121 9.667v8.666A2.668 2.668 0 0118.333 21H9.667A2.668 2.668 0 017 18.333V9.667z"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M4.012 16.737A2 2 0 013 15V5c0-1.1.9-2 2-2h10c.75 0 1.158.385 1.5 1m-5 7.5l4.9 5m.1-5l-5.1 5"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default CopyXIcon;
/* prettier-ignore-end */
