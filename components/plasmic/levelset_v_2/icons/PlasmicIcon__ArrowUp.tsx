/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ArrowUpIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ArrowUpIcon(props: ArrowUpIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 20 20"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"2.5"}
        d={"M10 15.833V4.167m0 0L4.167 10M10 4.167 15.833 10"}
      ></path>
    </svg>
  );
}

export default ArrowUpIcon;
/* prettier-ignore-end */
