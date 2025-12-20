/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Divider2IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Divider2Icon(props: Divider2IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 474 2"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        stroke={"currentColor"}
        strokeDasharray={".1 6"}
        strokeLinecap={"round"}
        strokeWidth={"2"}
        d={"M1 1h472"}
      ></path>
    </svg>
  );
}

export default Divider2Icon;
/* prettier-ignore-end */
