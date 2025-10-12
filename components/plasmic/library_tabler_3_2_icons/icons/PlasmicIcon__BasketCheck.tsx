/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type BasketCheckIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BasketCheckIcon(props: BasketCheckIconProps) {
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
          "M17 10l-2-6m-8 6l2-6m2 16H7.244a3 3 0 01-2.965-2.544l-1.255-7.152A2 2 0 015.001 8H19a2 2 0 011.977 2.304l-.479 2.729"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M10 14a2 2 0 104 0 2 2 0 00-4 0zm5 5l2 2 4-4"}
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default BasketCheckIcon;
/* prettier-ignore-end */
