/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ArrowDownIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ArrowDownIcon(props: ArrowDownIconProps) {
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
        d={"M10 4.167v11.666m0 0L15.833 10M10 15.833 4.167 10"}
      ></path>
    </svg>
  );
}

export default ArrowDownIcon;
/* prettier-ignore-end */
