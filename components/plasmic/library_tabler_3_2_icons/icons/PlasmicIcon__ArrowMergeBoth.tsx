/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ArrowMergeBothIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ArrowMergeBothIcon(props: ArrowMergeBothIconProps) {
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
          "M16 8l-4-4-4 4m4 12V4m6 14c-4-1.333-6-4.667-6-10M6 18c4-1.333 6-4.667 6-10"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default ArrowMergeBothIcon;
/* prettier-ignore-end */
