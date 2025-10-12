/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type GenderHermaphroditeIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function GenderHermaphroditeIcon(props: GenderHermaphroditeIconProps) {
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
        d={"M12 14v7m-3-3h6M12 6a4 4 0 110 8 4 4 0 010-8zm3-3a3 3 0 01-6 0"}
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default GenderHermaphroditeIcon;
/* prettier-ignore-end */
