/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ArrowRotaryFirstRightIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ArrowRotaryFirstRightIcon(
  props: ArrowRotaryFirstRightIconProps
) {
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
        d={"M5 7a3 3 0 106 0 3 3 0 00-6 0zm3 3v10m2.5-10.5L19 18m-5 0h5v-5"}
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default ArrowRotaryFirstRightIcon;
/* prettier-ignore-end */
