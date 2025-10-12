/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ArrowAutofitWidthIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ArrowAutofitWidthIcon(props: ArrowAutofitWidthIconProps) {
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
          "M4 12V6a2 2 0 012-2h12a2 2 0 012 2v6m-10 6H3m18 0h-7m-8-3l-3 3 3 3m12-6l3 3-3 3"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default ArrowAutofitWidthIcon;
/* prettier-ignore-end */
