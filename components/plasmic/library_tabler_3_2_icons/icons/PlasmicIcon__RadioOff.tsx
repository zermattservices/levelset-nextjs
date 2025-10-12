/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type RadioOffIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function RadioOffIcon(props: RadioOffIconProps) {
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
          "M14 3L9.014 5M6.139 6.15l-1.51.604A1 1 0 004 7.682v11.323a1 1 0 001 1h14a.999.999 0 00.708-.294M20 16.005v-8a1 1 0 00-1-1h-8m-4 0H4.5M4 12h8m4 0h4M7 12v-2m6 6v.01M3 3l18 18"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default RadioOffIcon;
/* prettier-ignore-end */
