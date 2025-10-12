/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ShieldPlusIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ShieldPlusIcon(props: ShieldPlusIconProps) {
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
          "M12.462 20.87c-.153.047-.307.09-.462.13A12 12 0 013.5 6 12 12 0 0012 3a12 12 0 008.5 3 12 12 0 01.11 6.37M16 19h6m-3-3v6"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default ShieldPlusIcon;
/* prettier-ignore-end */
