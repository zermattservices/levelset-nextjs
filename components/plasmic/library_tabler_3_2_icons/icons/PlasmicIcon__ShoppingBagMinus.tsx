/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ShoppingBagMinusIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ShoppingBagMinusIcon(props: ShoppingBagMinusIconProps) {
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
          "M12.5 21H8.574a3 3 0 01-2.965-2.544l-1.255-8.152A2 2 0 016.331 8H17.67a2 2 0 011.977 2.304l-.73 4.744"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M9 11V6a3 3 0 116 0v5m1 8h6"}
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default ShoppingBagMinusIcon;
/* prettier-ignore-end */
