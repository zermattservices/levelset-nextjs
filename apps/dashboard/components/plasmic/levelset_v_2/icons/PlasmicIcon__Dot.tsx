/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type DotIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DotIcon(props: DotIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 10 10"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <circle cx={"5"} cy={"5"} r={"4"} fill={"currentColor"}></circle>
    </svg>
  );
}

export default DotIcon;
/* prettier-ignore-end */
